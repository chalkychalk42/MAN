"""FastAPI dependency injection providers."""

from __future__ import annotations

from typing import AsyncGenerator

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.redis import get_redis as _get_redis
from app.db.session import AsyncSessionLocal
from app.services.solana import SolanaService


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a transactional async database session.

    The session is automatically closed when the request ends. Callers
    are responsible for committing if they perform writes.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_redis() -> aioredis.Redis:
    """Return the global Redis client."""
    return _get_redis()


def get_solana_service() -> SolanaService:
    """Return a configured :class:`SolanaService` instance."""
    return SolanaService(
        helius_api_key=settings.helius_api_key,
        rpc_url=settings.solana_rpc_url,
    )
