"""WalletConnection ORM model."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class WalletConnection(Base, TimestampMixin):
    """Directed edge between two wallets indicating a relationship."""

    __tablename__ = "wallet_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    connection_type: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )
    strength: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    evidence_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tokens.id", ondelete="SET NULL"),
        nullable=True,
    )
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationships
    source_wallet: Mapped["Wallet"] = relationship(  # noqa: F821
        "Wallet",
        foreign_keys=[source_wallet_id],
        back_populates="outgoing_connections",
    )
    target_wallet: Mapped["Wallet"] = relationship(  # noqa: F821
        "Wallet",
        foreign_keys=[target_wallet_id],
        back_populates="incoming_connections",
    )

    __table_args__ = (
        UniqueConstraint(
            "source_wallet_id",
            "target_wallet_id",
            "connection_type",
            "token_id",
            name="uq_wallet_connection",
        ),
        Index("ix_wallet_connections_source", "source_wallet_id"),
        Index("ix_wallet_connections_target", "target_wallet_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<WalletConnection {self.source_wallet_id} -> "
            f"{self.target_wallet_id} ({self.connection_type})>"
        )
