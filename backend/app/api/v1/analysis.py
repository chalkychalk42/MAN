"""Analysis CRUD and pipeline control endpoints."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import run_analysis_graph
from app.api.websocket.manager import sio
from app.dependencies import get_db
from app.models.analysis import Analysis
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResult,
    AnalysisStartResponse,
    AnalysisStatus,
    FlowGraph,
    FlowLink,
    FlowNode,
)
from app.schemas.common import SuccessResponse
from app.schemas.token import TokenMetadata
from app.schemas.wallet import WalletScore
from app.utils.solana_utils import is_valid_solana_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

# Track background analysis tasks
_background_tasks: dict[str, asyncio.Task[Any]] = {}


@router.post("/start", response_model=AnalysisStartResponse)
async def start_analysis(
    body: AnalysisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> AnalysisStartResponse:
    """Kick off a new token analysis.

    Creates a pending ``Analysis`` record and launches the agent
    pipeline in the background.
    """
    if not is_valid_solana_address(body.contract_address):
        raise HTTPException(status_code=400, detail="Invalid Solana address")

    analysis_id = str(uuid.uuid4())
    room = f"analysis:{analysis_id}"

    analysis = Analysis(id=analysis_id, status="pending")
    db.add(analysis)
    await db.commit()

    # Launch pipeline in a background asyncio task
    async def _run() -> None:
        try:
            await run_analysis_graph(body.contract_address, analysis_id, sio, room)
        except Exception:
            logger.exception("Background analysis %s failed", analysis_id)

    task = asyncio.create_task(_run())
    _background_tasks[analysis_id] = task
    task.add_done_callback(lambda t: _background_tasks.pop(analysis_id, None))

    return AnalysisStartResponse(analysis_id=analysis_id, status="pending")


@router.get("/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
) -> AnalysisResult:
    """Return the full result of a completed (or in-progress) analysis."""
    analysis = await _fetch_analysis(db, analysis_id)

    # Build token metadata if available
    token_meta = None
    if analysis.token:
        token_meta = TokenMetadata(
            contract_address=analysis.token.contract_address,
            name=analysis.token.name,
            symbol=analysis.token.symbol,
            decimals=analysis.token.decimals,
            total_supply=analysis.token.total_supply,
            image_url=analysis.token.image_url,
            description=analysis.token.description,
            launch_timestamp=analysis.token.launch_timestamp,
            liquidity_sol=analysis.token.liquidity_sol,
            market_cap_usd=analysis.token.market_cap_usd,
            holder_count=analysis.token.holder_count,
        )

    # Reconstruct flow graph
    flow_graph = None
    if analysis.flow_graph:
        raw = analysis.flow_graph
        flow_graph = FlowGraph(
            nodes=[FlowNode(**n) for n in raw.get("nodes", [])],
            links=[FlowLink(**l) for l in raw.get("links", [])],
        )

    return AnalysisResult(
        analysis_id=str(analysis.id),
        token=token_meta,
        wallets=[],  # Wallets are stored in the flow_graph / risk_factors
        flow_graph=flow_graph,
        risk_score=float(analysis.risk_score) if analysis.risk_score else None,
        risk_factors=analysis.risk_factors,
        ai_insights=analysis.ai_insights,
        wallet_count=analysis.wallet_count,
        transaction_count=analysis.transaction_count,
        started_at=analysis.started_at,
        completed_at=analysis.completed_at,
    )


@router.get("/{analysis_id}/status", response_model=AnalysisStatus)
async def get_analysis_status(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
) -> AnalysisStatus:
    """Return lightweight status info for polling clients."""
    analysis = await _fetch_analysis(db, analysis_id)

    agents: dict[str, str] = {}
    if analysis.agent_timings:
        for agent_name in analysis.agent_timings:
            agents[agent_name] = "complete"

    return AnalysisStatus(
        analysis_id=str(analysis.id),
        status=analysis.status,
        agents=agents,
    )


@router.delete("/{analysis_id}", response_model=SuccessResponse)
async def cancel_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
) -> SuccessResponse:
    """Cancel a running analysis."""
    analysis = await _fetch_analysis(db, analysis_id)

    # Cancel the background task if still running
    task = _background_tasks.pop(analysis_id, None)
    if task and not task.done():
        task.cancel()

    analysis.status = "cancelled"
    await db.commit()

    return SuccessResponse(message=f"Analysis {analysis_id} cancelled")


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

async def _fetch_analysis(db: AsyncSession, analysis_id: str) -> Analysis:
    """Load an analysis by ID or raise 404."""
    try:
        uid = uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid analysis ID format")

    stmt = select(Analysis).where(Analysis.id == uid)
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()

    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return analysis
