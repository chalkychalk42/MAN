"""Distributed rate limiter backed by Redis sorted sets.

Shared across all worker processes. Uses sliding window with
exponential backoff + jitter when rate limited.
"""

import asyncio
import random
import time
import logging
from typing import Optional

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)


class DistributedRateLimiter:
    """Sliding-window rate limiter designed for multi-process deployments.

    Each logical resource (Helius API, OpenAI API) is tracked via a Redis
    sorted set keyed by ``man:ratelimit:<resource>``.  Timestamps are used
    as both the member *and* the score so that stale entries can be pruned
    with a single ``ZREMRANGEBYSCORE`` call.

    When the window is full, :meth:`_acquire` blocks with exponential
    backoff and jitter until a slot becomes available.
    """

    def __init__(self, redis: aioredis.Redis) -> None:
        self._redis = redis

    async def _acquire(self, key: str, max_requests: int, window_seconds: int) -> None:
        """Block until a request slot is available in the sliding window."""
        backoff = 0.1
        max_backoff = 5.0

        while True:
            now = time.time()
            window_start = now - window_seconds

            pipe = self._redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            results = await pipe.execute()
            current_count = results[1]

            if current_count < max_requests:
                # Slot available -- claim it
                await self._redis.zadd(key, {str(now): now})
                await self._redis.expire(key, window_seconds * 2)
                return

            # Rate limited -- backoff with jitter
            jitter = random.uniform(0, backoff * 0.5)
            logger.debug(
                "Rate limited on %s (%d/%d). Backing off %.2fs",
                key,
                current_count,
                max_requests,
                backoff + jitter,
            )
            await asyncio.sleep(backoff + jitter)
            backoff = min(backoff * 2, max_backoff)

    async def acquire_helius(self) -> None:
        """Acquire a slot for a Helius API request."""
        await self._acquire(
            "man:ratelimit:helius",
            settings.helius_rate_limit,
            settings.helius_rate_window,
        )

    async def acquire_openai(self) -> None:
        """Acquire a slot for an OpenAI API request."""
        await self._acquire(
            "man:ratelimit:openai",
            settings.openai_rate_limit,
            settings.openai_rate_window,
        )
