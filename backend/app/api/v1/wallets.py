"""Wallet detail and related data endpoints."""

from __future__ import annotations

import logging
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.transaction import Transaction
from app.models.wallet import Wallet
from app.models.wallet_connection import WalletConnection
from app.schemas.common import PaginatedResponse
from app.schemas.transaction import TransactionInfo
from app.schemas.wallet import WalletConnectionSchema, WalletProfile
from app.utils.solana_utils import is_valid_solana_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wallets", tags=["wallets"])


@router.get("/{address}", response_model=WalletProfile)
async def get_wallet(
    address: str,
    db: AsyncSession = Depends(get_db),
) -> WalletProfile:
    """Return the full profile for a wallet."""
    wallet = await _fetch_wallet(db, address)
    return WalletProfile(
        address=wallet.address,
        label=wallet.label,
        total_pnl_sol=wallet.total_pnl_sol,
        total_pnl_usd=wallet.total_pnl_usd,
        win_rate=float(wallet.win_rate) if wallet.win_rate else None,
        total_trades=wallet.total_trades,
        insider_score=float(wallet.insider_score) if wallet.insider_score else None,
        risk_score=float(wallet.risk_score) if wallet.risk_score else None,
        first_seen_at=wallet.first_seen_at,
        last_active_at=wallet.last_active_at,
        tags=wallet.tags or [],
    )


@router.get(
    "/{address}/transactions",
    response_model=PaginatedResponse[TransactionInfo],
)
async def get_wallet_transactions(
    address: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    token_address: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[TransactionInfo]:
    """Return paginated transactions for the given wallet."""
    wallet = await _fetch_wallet(db, address)

    conditions = [
        (Transaction.source_wallet_id == wallet.id)
        | (Transaction.destination_wallet_id == wallet.id)
    ]

    if token_address:
        from app.models.token import Token

        token_stmt = select(Token.id).where(Token.contract_address == token_address)
        token_result = await db.execute(token_stmt)
        token_id = token_result.scalar_one_or_none()
        if token_id:
            conditions.append(Transaction.token_id == token_id)

    # Count
    count_stmt = select(func.count(Transaction.id)).where(*conditions)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Fetch
    stmt = (
        select(Transaction)
        .where(*conditions)
        .order_by(Transaction.block_time.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()

    items = [
        TransactionInfo(
            signature=tx.signature,
            block_time=tx.block_time,
            tx_type=tx.tx_type,
            source_address=(
                tx.source_wallet.address if tx.source_wallet else None
            ),
            destination_address=(
                tx.destination_wallet.address if tx.destination_wallet else None
            ),
            token_amount=tx.token_amount,
            sol_amount=tx.sol_amount,
            usd_amount=tx.usd_amount,
        )
        for tx in rows
    ]

    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{address}/connections")
async def get_wallet_connections(
    address: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return the connection graph centred on this wallet."""
    wallet = await _fetch_wallet(db, address)

    stmt = select(WalletConnection).where(
        (WalletConnection.source_wallet_id == wallet.id)
        | (WalletConnection.target_wallet_id == wallet.id)
    )
    rows = (await db.execute(stmt)).scalars().all()

    nodes: dict[str, dict[str, str]] = {}
    edges: list[dict[str, Any]] = []

    for conn in rows:
        src = conn.source_wallet
        tgt = conn.target_wallet
        if src:
            nodes[src.address] = {"id": src.address, "label": src.label or src.address[:8]}
        if tgt:
            nodes[tgt.address] = {"id": tgt.address, "label": tgt.label or tgt.address[:8]}
        edges.append(
            WalletConnectionSchema(
                source_address=src.address if src else "",
                target_address=tgt.address if tgt else "",
                connection_type=conn.connection_type,
                strength=float(conn.strength) if conn.strength else None,
                evidence_count=conn.evidence_count,
            ).model_dump()
        )

    return {"nodes": list(nodes.values()), "edges": edges}


@router.get("/{address}/pnl")
async def get_wallet_pnl(
    address: str,
    period: Literal["7d", "30d", "all"] = Query(default="7d"),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return time-series PNL data for charting."""
    wallet = await _fetch_wallet(db, address)

    from datetime import datetime, timedelta, timezone

    now = datetime.now(tz=timezone.utc)
    if period == "7d":
        since = now - timedelta(days=7)
    elif period == "30d":
        since = now - timedelta(days=30)
    else:
        since = datetime(2020, 1, 1, tzinfo=timezone.utc)

    stmt = (
        select(Transaction.block_time, Transaction.sol_amount)
        .where(
            (Transaction.source_wallet_id == wallet.id)
            | (Transaction.destination_wallet_id == wallet.id),
            Transaction.block_time >= since,
        )
        .order_by(Transaction.block_time.asc())
    )
    rows = (await db.execute(stmt)).all()

    cumulative = 0.0
    points: list[dict[str, Any]] = []
    for block_time, sol_amount in rows:
        cumulative += float(sol_amount or 0)
        points.append(
            {
                "timestamp": block_time.isoformat(),
                "value": round(cumulative, 6),
            }
        )

    return points


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

async def _fetch_wallet(db: AsyncSession, address: str) -> Wallet:
    """Load a wallet by on-chain address or raise 404."""
    if not is_valid_solana_address(address):
        raise HTTPException(status_code=400, detail="Invalid Solana address")

    stmt = select(Wallet).where(Wallet.address == address)
    result = await db.execute(stmt)
    wallet = result.scalar_one_or_none()
    if wallet is None:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet
