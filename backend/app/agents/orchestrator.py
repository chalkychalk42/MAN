"""HiveMind orchestrator -- manages the full agent pipeline."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any

from app.agents.analyst import AnalystAgent
from app.agents.scout import ScoutAgent
from app.agents.sentinel import SentinelAgent
from app.agents.sleuth import SleuthAgent
from app.agents.state import AnalysisState
from app.agents.tracker import TrackerAgent
from app.db.session import AsyncSessionLocal
from app.models.analysis import Analysis

logger = logging.getLogger(__name__)


class HiveMindOrchestrator:
    """Coordinates the sequential and parallel execution of all agents.

    Pipeline order::

        scout -> (tracker || analyst) -> sleuth -> sentinel

    Results are persisted to the ``analyses`` table once the pipeline
    completes or fails.
    """

    @staticmethod
    async def run_analysis(
        contract_address: str,
        analysis_id: str,
        sio: Any,
        room: str,
    ) -> dict[str, Any]:
        """Execute the full pipeline and return the final state dict."""
        state: dict[str, Any] = {
            "analysis_id": analysis_id,
            "contract_address": contract_address,
            "room": room,
            "status": "running",
            "started_at": datetime.now(tz=timezone.utc).isoformat(),
        }

        agent_timings: dict[str, float] = {}

        try:
            await sio.emit(
                "analysis:status",
                {"analysis_id": analysis_id, "status": "running"},
                room=room,
            )

            # --- 1. Scout ---
            t0 = time.monotonic()
            scout = ScoutAgent(sio, room)
            state = await scout.execute(state)
            agent_timings["scout"] = round(time.monotonic() - t0, 3)

            if state.get("error"):
                raise RuntimeError(state["error"])

            # --- 2. Tracker + Analyst (parallel) ---
            t0 = time.monotonic()
            tracker = TrackerAgent(sio, room)
            analyst = AnalystAgent(sio, room)

            tracker_state, analyst_state = await asyncio.gather(
                tracker.execute(dict(state)),
                analyst.execute(dict(state)),
            )
            agent_timings["tracker"] = round(time.monotonic() - t0, 3)
            agent_timings["analyst"] = agent_timings["tracker"]

            # Merge parallel results
            state["flow_graph"] = tracker_state.get("flow_graph", {})
            state["wallet_clusters"] = tracker_state.get("wallet_clusters", [])
            state["wallet_scores"] = analyst_state.get("wallet_scores", [])
            state["wallet_count"] = analyst_state.get("wallet_count", 0)

            # --- 3. Sleuth ---
            t0 = time.monotonic()
            sleuth = SleuthAgent(sio, room)
            state = await sleuth.execute(state)
            agent_timings["sleuth"] = round(time.monotonic() - t0, 3)

            # --- 4. Sentinel ---
            t0 = time.monotonic()
            sentinel = SentinelAgent(sio, room)
            state = await sentinel.execute(state)
            agent_timings["sentinel"] = round(time.monotonic() - t0, 3)

            state["status"] = "complete"
            state["completed_at"] = datetime.now(tz=timezone.utc).isoformat()

            # Emit completion
            await sio.emit(
                "analysis:complete",
                {
                    "analysis_id": analysis_id,
                    "risk_score": state.get("risk_score"),
                    "wallet_count": state.get("wallet_count"),
                    "transaction_count": state.get("transaction_count"),
                },
                room=room,
            )

        except Exception as exc:
            logger.exception("Analysis pipeline failed for %s", contract_address)
            state["status"] = "error"
            state["error"] = str(exc)
            state["completed_at"] = datetime.now(tz=timezone.utc).isoformat()

            await sio.emit(
                "analysis:error",
                {"analysis_id": analysis_id, "error": str(exc)},
                room=room,
            )

        # --- Persist to database ---
        try:
            await _save_analysis(analysis_id, state, agent_timings)
        except Exception:
            logger.exception("Failed to persist analysis results")

        return state


async def _save_analysis(
    analysis_id: str,
    state: dict[str, Any],
    agent_timings: dict[str, float],
) -> None:
    """Update the ``Analysis`` row with the pipeline results."""
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        stmt = select(Analysis).where(Analysis.id == analysis_id)
        result = await db.execute(stmt)
        analysis = result.scalar_one_or_none()

        if analysis is None:
            logger.error("Analysis row %s not found", analysis_id)
            return

        analysis.status = state.get("status", "error")
        analysis.risk_score = state.get("risk_score")
        analysis.risk_factors = state.get("risk_factors")
        analysis.ai_insights = state.get("ai_insights")
        analysis.wallet_count = state.get("wallet_count")
        analysis.transaction_count = state.get("transaction_count")
        analysis.flow_graph = state.get("flow_graph")
        analysis.agent_timings = agent_timings

        if state.get("started_at"):
            analysis.started_at = datetime.fromisoformat(state["started_at"])
        if state.get("completed_at"):
            analysis.completed_at = datetime.fromisoformat(state["completed_at"])
        if state.get("error"):
            analysis.error_message = state["error"]

        await db.commit()
