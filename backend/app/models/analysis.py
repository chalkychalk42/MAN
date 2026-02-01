"""Analysis ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Analysis(Base, TimestampMixin):
    """Record of a token analysis run by the agent pipeline."""

    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tokens.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True, default="pending"
    )
    risk_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    risk_factors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ai_insights: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    wallet_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    transaction_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    flow_graph: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    agent_timings: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    token: Mapped[Optional["Token"]] = relationship(  # noqa: F821
        "Token", back_populates="analyses"
    )
    user: Mapped[Optional["User"]] = relationship("User")  # noqa: F821

    __table_args__ = (
        Index("ix_analyses_status", "status"),
        Index("ix_analyses_token_id", "token_id"),
    )

    def __repr__(self) -> str:
        return f"<Analysis {self.id} status={self.status}>"
