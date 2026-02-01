"""Transaction persistence and query helpers."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.services.wallet_service import get_or_create_wallet

logger = logging.getLogger(__name__)


async def store_transactions(
    db: AsyncSession,
    transactions: list[dict[str, Any]],
    token_id: Optional[uuid.UUID] = None,
) -> list[Transaction]:
    """Parse raw Helius enhanced transactions and persist them.

    Existing signatures are silently skipped so the function is
    idempotent.

    Returns the list of newly created ``Transaction`` rows.
    """
    created: list[Transaction] = []

    for tx_data in transactions:
        signature = tx_data.get("signature")
        if not signature:
            continue

        # Check for duplicate
        existing = await db.execute(
            select(Transaction).where(Transaction.signature == signature)
        )
        if existing.scalar_one_or_none() is not None:
            continue

        # Resolve wallets
        source_address = _extract_source(tx_data)
        dest_address = _extract_destination(tx_data)
        source_wallet = None
        dest_wallet = None
        if source_address:
            source_wallet = await get_or_create_wallet(db, source_address)
        if dest_address:
            dest_wallet = await get_or_create_wallet(db, dest_address)

        block_ts = tx_data.get("timestamp")
        block_time = (
            datetime.fromtimestamp(block_ts, tz=timezone.utc)
            if block_ts
            else datetime.now(tz=timezone.utc)
        )

        tx = Transaction(
            signature=signature,
            block_time=block_time,
            slot=tx_data.get("slot", 0),
            fee_lamports=tx_data.get("fee"),
            tx_type=tx_data.get("type"),
            source_wallet_id=source_wallet.id if source_wallet else None,
            destination_wallet_id=dest_wallet.id if dest_wallet else None,
            token_id=token_id,
            token_amount=_safe_decimal(tx_data.get("tokenAmount")),
            sol_amount=_safe_decimal(tx_data.get("nativeAmount")),
            program_id=tx_data.get("programId"),
            raw_data=tx_data,
        )
        db.add(tx)
        created.append(tx)

    if created:
        await db.flush()
    return created


async def get_wallet_transactions(
    db: AsyncSession,
    wallet_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
) -> list[Transaction]:
    """Return transactions involving *wallet_id* ordered by block_time descending."""
    stmt = (
        select(Transaction)
        .where(
            (Transaction.source_wallet_id == wallet_id)
            | (Transaction.destination_wallet_id == wallet_id)
        )
        .order_by(Transaction.block_time.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------


def _extract_source(tx: dict) -> Optional[str]:
    """Best-effort extraction of the source wallet address."""
    if "feePayer" in tx:
        return tx["feePayer"]
    accounts = tx.get("accountData", [])
    if accounts:
        return accounts[0].get("account")
    return None


def _extract_destination(tx: dict) -> Optional[str]:
    """Best-effort extraction of the destination wallet address."""
    transfers = tx.get("tokenTransfers", []) or tx.get("nativeTransfers", [])
    if transfers:
        return transfers[0].get("toUserAccount")
    return None


def _safe_decimal(value: Any) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None
