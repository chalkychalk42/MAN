"""User ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    """Application user, optionally tied to a Solana wallet."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wallet_address: Mapped[Optional[str]] = mapped_column(
        String(44), unique=True, nullable=True
    )
    tier: Mapped[str] = mapped_column(
        String(20), nullable=False, default="free"
    )
    scans_today: Mapped[int] = mapped_column(Integer, default=0)
    scans_reset_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    total_scans: Mapped[int] = mapped_column(Integer, default=0)
    settings_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        addr = self.wallet_address or "anonymous"
        return f"<User {addr[:8]}... tier={self.tier}>"
