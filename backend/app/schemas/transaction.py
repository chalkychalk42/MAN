"""Transaction-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class TransactionInfo(BaseModel):
    """Simplified transaction record for API responses."""

    signature: str
    block_time: datetime
    tx_type: Optional[str] = None
    source_address: Optional[str] = None
    destination_address: Optional[str] = None
    token_amount: Optional[Decimal] = None
    sol_amount: Optional[Decimal] = None
    usd_amount: Optional[Decimal] = None

    model_config = {"from_attributes": True}
