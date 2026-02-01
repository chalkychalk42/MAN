"""Transaction ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    """On-chain Solana transaction record."""

    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    signature: Mapped[str] = mapped_column(
        String(88), unique=True, nullable=False, index=True
    )
    block_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    slot: Mapped[int] = mapped_column(BigInteger, nullable=False)
    fee_lamports: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    tx_type: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True, index=True
    )

    # Foreign keys
    source_wallet_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    destination_wallet_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tokens.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Amounts
    token_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(38, 0), nullable=True
    )
    sol_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 9), nullable=True
    )
    usd_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(20, 2), nullable=True
    )

    program_id: Mapped[Optional[str]] = mapped_column(String(44), nullable=True)
    raw_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationships
    source_wallet: Mapped[Optional["Wallet"]] = relationship(  # noqa: F821
        "Wallet",
        foreign_keys=[source_wallet_id],
        back_populates="sent_transactions",
    )
    destination_wallet: Mapped[Optional["Wallet"]] = relationship(  # noqa: F821
        "Wallet",
        foreign_keys=[destination_wallet_id],
        back_populates="received_transactions",
    )
    token: Mapped[Optional["Token"]] = relationship(  # noqa: F821
        "Token", back_populates="transactions"
    )

    __table_args__ = (
        Index("ix_transactions_block_time", "block_time"),
        Index("ix_transactions_tx_type", "tx_type"),
        Index("ix_transactions_source_wallet_id", "source_wallet_id"),
        Index("ix_transactions_destination_wallet_id", "destination_wallet_id"),
        Index("ix_transactions_token_id", "token_id"),
    )

    def __repr__(self) -> str:
        return f"<Transaction {self.signature[:12]}...>"
