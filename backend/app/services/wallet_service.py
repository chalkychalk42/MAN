"""Wallet persistence and query helpers."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wallet import Wallet

logger = logging.getLogger(__name__)


async def get_or_create_wallet(
    db: AsyncSession,
    address: str,
) -> Wallet:
    """Return an existing ``Wallet`` row or create a minimal stub."""
    stmt = select(Wallet).where(Wallet.address == address)
    result = await db.execute(stmt)
    wallet = result.scalar_one_or_none()

    if wallet is not None:
        return wallet

    wallet = Wallet(address=address)
    db.add(wallet)
    await db.flush()
    return wallet


async def update_wallet_scores(
    db: AsyncSession,
    wallet: Wallet,
    scores: dict[str, Any],
) -> Wallet:
    """Apply scoring data to a ``Wallet`` record and flush.

    Accepted keys in *scores*: ``total_pnl_sol``, ``total_pnl_usd``,
    ``win_rate``, ``total_trades``, ``insider_score``, ``risk_score``,
    ``label``, ``tags``, ``last_active_at``, ``first_seen_at``.
    """
    for field in (
        "total_pnl_sol",
        "total_pnl_usd",
        "win_rate",
        "total_trades",
        "insider_score",
        "risk_score",
        "label",
        "tags",
        "last_active_at",
        "first_seen_at",
    ):
        value = scores.get(field)
        if value is not None:
            setattr(wallet, field, value)

    await db.flush()
    return wallet


async def get_top_wallets(
    db: AsyncSession,
    token_id: uuid.UUID,
    limit: int = 20,
) -> list[Wallet]:
    """Return wallets with the highest insider score related to *token_id*.

    This queries wallets that have sent or received transactions for the
    given token, ordered by ``insider_score`` descending.
    """
    from app.models.transaction import Transaction

    # Sub-query for wallet IDs that have transactions for this token
    sub = (
        select(Transaction.source_wallet_id)
        .where(Transaction.token_id == token_id)
        .union(
            select(Transaction.destination_wallet_id).where(
                Transaction.token_id == token_id
            )
        )
    ).subquery()

    stmt = (
        select(Wallet)
        .where(Wallet.id.in_(select(sub)))
        .order_by(Wallet.insider_score.desc().nullslast())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
