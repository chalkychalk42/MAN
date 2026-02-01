"""Redis-backed sliding-window rate limiter."""

from __future__ import annotations

import time

import redis.asyncio as aioredis


class RateLimiter:
    """Sliding-window rate limiter backed by a Redis sorted set.

    Each key maps to a sorted set of request timestamps. Entries older
    than *window_seconds* are pruned on every call so memory stays bounded.
    """

    def __init__(self, redis: aioredis.Redis) -> None:
        self._redis = redis

    async def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> bool:
        """Return *True* if the request is **allowed**.

        The request is counted toward the window regardless of the return
        value, so callers should only proceed when the result is ``True``.
        """
        now = time.time()
        window_start = now - window_seconds
        rate_key = f"ratelimit:{key}"

        pipe = self._redis.pipeline()
        # Remove entries older than the window
        pipe.zremrangebyscore(rate_key, "-inf", window_start)
        # Count current entries
        pipe.zcard(rate_key)
        # Add the new request
        pipe.zadd(rate_key, {str(now): now})
        # Set a TTL so keys auto-expire
        pipe.expire(rate_key, window_seconds + 1)
        results = await pipe.execute()

        current_count: int = results[1]
        return current_count < max_requests
