"""Wallet ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    ARRAY,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Wallet(Base, TimestampMixin):
    """Solana wallet tracked by the system."""

    __tablename__ = "wallets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    address: Mapped[str] = mapped_column(
        String(44), unique=True, nullable=False, index=True
    )
    label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    total_pnl_sol: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 9), nullable=True
    )
    total_pnl_usd: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 2), nullable=True
    )
    win_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    total_trades: Mapped[int] = mapped_column(Integer, default=0)
    insider_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2), nullable=True, index=True
    )
    risk_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    first_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_active_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    tags: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(Text), nullable=True
    )
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationships
    sent_transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        "Transaction",
        foreign_keys="Transaction.source_wallet_id",
        back_populates="source_wallet",
        lazy="selectin",
    )
    received_transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        "Transaction",
        foreign_keys="Transaction.destination_wallet_id",
        back_populates="destination_wallet",
        lazy="selectin",
    )
    outgoing_connections: Mapped[list["WalletConnection"]] = relationship(  # noqa: F821
        "WalletConnection",
        foreign_keys="WalletConnection.source_wallet_id",
        back_populates="source_wallet",
        lazy="selectin",
    )
    incoming_connections: Mapped[list["WalletConnection"]] = relationship(  # noqa: F821
        "WalletConnection",
        foreign_keys="WalletConnection.target_wallet_id",
        back_populates="target_wallet",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_wallets_insider_score", "insider_score"),
        Index("ix_wallets_last_active_at", "last_active_at"),
    )

    def __repr__(self) -> str:
        return f"<Wallet {self.address[:8]}...>"
