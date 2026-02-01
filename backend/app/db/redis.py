"""Async Redis connection management."""

from __future__ import annotations

import redis.asyncio as aioredis

from app.config import settings

redis_client: aioredis.Redis | None = None


async def init_redis() -> aioredis.Redis:
    """Create and return the global Redis connection pool."""
    global redis_client
    redis_client = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
        max_connections=20,
    )
    return redis_client


async def close_redis() -> None:
    """Close the global Redis connection pool."""
    global redis_client
    if redis_client is not None:
        await redis_client.close()
        redis_client = None


def get_redis() -> aioredis.Redis:
    """Return the active Redis client.

    Raises ``RuntimeError`` if called before ``init_redis``.
    """
    if redis_client is None:
        raise RuntimeError("Redis client has not been initialised. Call init_redis() first.")
    return redis_client
