"""Token detail and holder endpoints."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db, get_solana_service
from app.models.token import Token
from app.schemas.common import PaginatedResponse
from app.schemas.token import HolderInfo, TokenResponse
from app.services.solana import SolanaService
from app.utils.solana_utils import is_valid_solana_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("/{contract_address}", response_model=TokenResponse)
async def get_token(
    contract_address: str,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Return stored metadata for a token."""
    if not is_valid_solana_address(contract_address):
        raise HTTPException(status_code=400, detail="Invalid Solana address")

    stmt = select(Token).where(Token.contract_address == contract_address)
    result = await db.execute(stmt)
    token = result.scalar_one_or_none()

    if token is None:
        raise HTTPException(status_code=404, detail="Token not found")

    return TokenResponse(
        id=str(token.id),
        contract_address=token.contract_address,
        name=token.name,
        symbol=token.symbol,
        decimals=token.decimals,
        total_supply=token.total_supply,
        image_url=token.image_url,
        description=token.description,
        launch_timestamp=token.launch_timestamp,
        liquidity_sol=token.liquidity_sol,
        market_cap_usd=token.market_cap_usd,
        holder_count=token.holder_count,
        is_verified=token.is_verified,
    )


@router.get(
    "/{contract_address}/holders",
    response_model=PaginatedResponse[HolderInfo],
)
async def get_token_holders(
    contract_address: str,
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="balance", regex="^(balance|percentage|pnl)$"),
    db: AsyncSession = Depends(get_db),
    solana: SolanaService = Depends(get_solana_service),
) -> PaginatedResponse[HolderInfo]:
    """Return the top holders for a token, fetched live from the RPC."""
    if not is_valid_solana_address(contract_address):
        raise HTTPException(status_code=400, detail="Invalid Solana address")

    raw_holders = await solana.get_token_holders(contract_address, limit=limit)

    holders: list[HolderInfo] = []
    total_supply = 0.0

    # First pass to compute total for percentages
    for h in raw_holders:
        amount = float(h.get("amount", 0) or 0)
        total_supply += amount

    for h in raw_holders:
        amount = float(h.get("amount", 0) or 0)
        pct = (amount / total_supply * 100) if total_supply > 0 else 0.0
        holders.append(
            HolderInfo(
                address=h.get("owner", h.get("address", "")),
                balance=amount,
                percentage=round(pct, 4),
                pnl=None,
            )
        )

    # Sort
    if sort_by == "percentage":
        holders.sort(key=lambda x: x.percentage, reverse=True)
    elif sort_by == "pnl":
        holders.sort(key=lambda x: float(x.pnl or 0), reverse=True)
    else:
        holders.sort(key=lambda x: float(x.balance), reverse=True)

    return PaginatedResponse(
        items=holders,
        total=len(holders),
        offset=0,
        limit=limit,
    )
