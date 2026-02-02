"""Async SQLAlchemy engine and session factory."""

import os

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

_pool_size = int(os.environ.get("DB_POOL_SIZE", "20"))
_max_overflow = int(os.environ.get("DB_MAX_OVERFLOW", "10"))

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=_pool_size,
    max_overflow=_max_overflow,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
