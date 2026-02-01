"""Token ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Token(Base, TimestampMixin):
    """Solana SPL token tracked by the system."""

    __tablename__ = "tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    contract_address: Mapped[str] = mapped_column(
        String(44), unique=True, nullable=False, index=True
    )
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    symbol: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    decimals: Mapped[int] = mapped_column(SmallInteger, default=9)
    total_supply: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(38, 0), nullable=True
    )
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    launch_timestamp: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    liquidity_sol: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 9), nullable=True
    )
    market_cap_usd: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 2), nullable=True
    )
    holder_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationships
    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        "Transaction", back_populates="token", lazy="selectin"
    )
    analyses: Mapped[list["Analysis"]] = relationship(  # noqa: F821
        "Analysis", back_populates="token", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_tokens_launch_timestamp", "launch_timestamp"),
    )

    def __repr__(self) -> str:
        return f"<Token {self.symbol} ({self.contract_address[:8]}...)>"
