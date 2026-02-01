"""Token-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class TokenMetadata(BaseModel):
    """Core token metadata returned from on-chain or API sources."""

    contract_address: str = Field(..., max_length=44)
    name: Optional[str] = None
    symbol: Optional[str] = None
    decimals: int = 9
    total_supply: Optional[Decimal] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    launch_timestamp: Optional[datetime] = None
    liquidity_sol: Optional[Decimal] = None
    market_cap_usd: Optional[Decimal] = None
    holder_count: Optional[int] = None

    model_config = {"from_attributes": True}


class TokenResponse(TokenMetadata):
    """Token record as stored in the database."""

    id: str
    is_verified: bool = False


class HolderInfo(BaseModel):
    """Single holder entry for a token."""

    address: str
    balance: Decimal
    percentage: float = Field(ge=0, le=100)
    pnl: Optional[Decimal] = None
