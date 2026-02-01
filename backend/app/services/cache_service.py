"""Redis-backed caching layer."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class CacheService:
    """Thin wrapper around Redis for JSON-serializable cache operations."""

    def __init__(self, redis: aioredis.Redis) -> None:
        self._redis = redis

    # ------------------------------------------------------------------
    # Generic cache
    # ------------------------------------------------------------------

    async def get_cached(self, key: str) -> Optional[dict[str, Any]]:
        """Return the cached value for *key* or ``None``."""
        raw = await self._redis.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            logger.warning("Corrupt cache entry for key=%s", key)
            return None

    async def set_cached(
        self,
        key: str,
        value: dict[str, Any],
        ttl: int = 300,
    ) -> None:
        """Store *value* under *key* with a TTL in seconds."""
        await self._redis.setex(key, ttl, json.dumps(value, default=str))

    async def delete_cached(self, key: str) -> None:
        """Remove *key* from the cache."""
        await self._redis.delete(key)

    # ------------------------------------------------------------------
    # Analysis-specific helpers
    # ------------------------------------------------------------------

    async def get_analysis_state(
        self,
        analysis_id: str,
    ) -> Optional[dict[str, Any]]:
        """Return cached state for a running or recently completed analysis."""
        return await self.get_cached(f"analysis:{analysis_id}")

    async def set_analysis_state(
        self,
        analysis_id: str,
        state: dict[str, Any],
        ttl: int = 3600,
    ) -> None:
        """Persist analysis state with a default 1-hour TTL."""
        await self.set_cached(f"analysis:{analysis_id}", state, ttl=ttl)
