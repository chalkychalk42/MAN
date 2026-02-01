"""Wallet-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class WalletScore(BaseModel):
    """Scored wallet produced by the analyst agent."""

    address: str
    entry_time: Optional[datetime] = None
    pnl_percentage: Optional[float] = None
    pnl_sol: Optional[Decimal] = None
    hold_duration_hours: Optional[float] = None
    insider_score: float = Field(ge=0, le=100)
    risk_score: Optional[float] = Field(default=None, ge=0, le=100)
    label: Optional[str] = None
    tags: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class WalletProfile(BaseModel):
    """Full wallet profile for the detail view."""

    address: str
    label: Optional[str] = None
    total_pnl_sol: Optional[Decimal] = None
    total_pnl_usd: Optional[Decimal] = None
    win_rate: Optional[float] = None
    total_trades: int = 0
    insider_score: Optional[float] = None
    risk_score: Optional[float] = None
    first_seen_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    tags: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class WalletConnectionSchema(BaseModel):
    """Edge in the wallet connection graph."""

    source_address: str
    target_address: str
    connection_type: Optional[str] = None
    strength: Optional[float] = None
    evidence_count: Optional[int] = None
