"""Redis Streams-based job queue for the analysis pipeline.

Jobs are submitted as entries in a Redis Stream and consumed by worker
processes via a single consumer group.  Each job gets a companion hash
(``man:job:<job_id>``) that tracks its lifecycle.  Batch submissions
create an additional hash (``man:batch:<batch_id>``) with aggregate
counters that are updated atomically as jobs progress.
"""

import json
import logging
import time
import uuid
from typing import Any, Optional

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class QueueManager:
    """Manages the Redis Streams job queue and associated state hashes."""

    STREAM_KEY = "man:queue:jobs"
    GROUP_NAME = "man:workers"

    # Hash TTL -- one day.  Prevents stale data from accumulating.
    _HASH_TTL = 86400

    def __init__(self, redis: aioredis.Redis) -> None:
        self._redis = redis

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    async def ensure_group(self) -> None:
        """Create the consumer group if it does not already exist."""
        try:
            await self._redis.xgroup_create(
                self.STREAM_KEY, self.GROUP_NAME, id="0", mkstream=True,
            )
        except aioredis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

    # ------------------------------------------------------------------
    # Submission
    # ------------------------------------------------------------------

    async def submit_job(
        self, contract_address: str, batch_id: str = "single",
    ) -> str:
        """Submit a single contract address for analysis.

        Returns the newly generated ``job_id``.
        """
        job_id = str(uuid.uuid4())
        room = f"analysis:{job_id}"

        await self._redis.xadd(
            self.STREAM_KEY,
            {
                "job_id": job_id,
                "batch_id": batch_id,
                "contract_address": contract_address,
                "submitted_at": str(time.time()),
                "room": room,
            },
        )

        await self._redis.hset(
            f"man:job:{job_id}",
            mapping={
                "status": "pending",
                "contract_address": contract_address,
                "batch_id": batch_id,
                "worker_id": "",
                "started_at": "",
                "completed_at": "",
                "error": "",
                "risk_score": "",
                "analysis_id": job_id,
            },
        )
        await self._redis.expire(f"man:job:{job_id}", self._HASH_TTL)

        return job_id

    async def submit_batch(
        self, addresses: list[str],
    ) -> tuple[str, list[str]]:
        """Submit multiple contract addresses as a batch.

        Returns ``(batch_id, job_ids)``.
        """
        batch_id = str(uuid.uuid4())
        job_ids: list[str] = []

        for addr in addresses:
            job_id = await self.submit_job(addr, batch_id)
            job_ids.append(job_id)

        await self._redis.hset(
            f"man:batch:{batch_id}",
            mapping={
                "total": len(addresses),
                "pending": len(addresses),
                "processing": 0,
                "complete": 0,
                "error": 0,
                "submitted_at": str(time.time()),
            },
        )
        await self._redis.expire(f"man:batch:{batch_id}", self._HASH_TTL)

        return batch_id, job_ids

    # ------------------------------------------------------------------
    # Consumption
    # ------------------------------------------------------------------

    async def claim_job(self, consumer_name: str) -> Optional[dict[str, Any]]:
        """Claim the next available job from the stream.

        Blocks for up to 5 seconds and returns ``None`` if no work is
        available.
        """
        results = await self._redis.xreadgroup(
            self.GROUP_NAME,
            consumer_name,
            {self.STREAM_KEY: ">"},
            count=1,
            block=5000,
        )
        if not results:
            return None

        _stream_name, messages = results[0]
        entry_id, fields = messages[0]

        return {
            "entry_id": entry_id,
            "job_id": fields["job_id"],
            "batch_id": fields["batch_id"],
            "contract_address": fields["contract_address"],
            "room": fields["room"],
        }

    async def ack_job(self, entry_id: str) -> None:
        """Acknowledge a fully processed job."""
        await self._redis.xack(self.STREAM_KEY, self.GROUP_NAME, entry_id)

    # ------------------------------------------------------------------
    # Lifecycle transitions
    # ------------------------------------------------------------------

    async def mark_processing(self, job_id: str, worker_id: str) -> None:
        """Transition a job to the ``processing`` state."""
        await self._redis.hset(
            f"man:job:{job_id}",
            mapping={
                "status": "processing",
                "worker_id": worker_id,
                "started_at": str(time.time()),
            },
        )
        batch_id = await self._redis.hget(f"man:job:{job_id}", "batch_id")
        if batch_id and batch_id != "single":
            pipe = self._redis.pipeline()
            pipe.hincrby(f"man:batch:{batch_id}", "pending", -1)
            pipe.hincrby(f"man:batch:{batch_id}", "processing", 1)
            await pipe.execute()

    async def mark_complete(
        self, job_id: str, risk_score: float | None = None,
    ) -> None:
        """Transition a job to the ``complete`` state."""
        await self._redis.hset(
            f"man:job:{job_id}",
            mapping={
                "status": "complete",
                "completed_at": str(time.time()),
                "risk_score": str(risk_score) if risk_score is not None else "",
            },
        )
        batch_id = await self._redis.hget(f"man:job:{job_id}", "batch_id")
        if batch_id and batch_id != "single":
            pipe = self._redis.pipeline()
            pipe.hincrby(f"man:batch:{batch_id}", "processing", -1)
            pipe.hincrby(f"man:batch:{batch_id}", "complete", 1)
            await pipe.execute()

    async def mark_error(self, job_id: str, error: str) -> None:
        """Transition a job to the ``error`` state."""
        await self._redis.hset(
            f"man:job:{job_id}",
            mapping={
                "status": "error",
                "completed_at": str(time.time()),
                "error": error,
            },
        )
        batch_id = await self._redis.hget(f"man:job:{job_id}", "batch_id")
        if batch_id and batch_id != "single":
            pipe = self._redis.pipeline()
            pipe.hincrby(f"man:batch:{batch_id}", "processing", -1)
            pipe.hincrby(f"man:batch:{batch_id}", "error", 1)
            await pipe.execute()

    async def mark_cancelled(self, job_id: str) -> None:
        """Mark a job as cancelled."""
        await self._redis.hset(
            f"man:job:{job_id}",
            mapping={
                "status": "cancelled",
                "completed_at": str(time.time()),
            },
        )

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    async def get_job_status(self, job_id: str) -> dict[str, Any] | None:
        """Return the full job hash or ``None`` if the job does not exist."""
        data = await self._redis.hgetall(f"man:job:{job_id}")
        return data if data else None

    async def get_batch_status(self, batch_id: str) -> dict[str, Any] | None:
        """Return the batch hash or ``None``."""
        data = await self._redis.hgetall(f"man:batch:{batch_id}")
        return data if data else None

    async def get_queue_depth(self) -> dict[str, int]:
        """Return aggregate queue statistics."""
        stream_len = await self._redis.xlen(self.STREAM_KEY)
        return {
            "pending": stream_len,
            "total_stream": stream_len,
        }

    async def get_active_workers(self) -> int:
        """Count workers that have sent a heartbeat within the last 30 s."""
        data = await self._redis.hgetall("man:workers:registry")
        now = time.time()
        active = 0
        for _worker_id, info_str in data.items():
            try:
                info = json.loads(info_str)
                if now - info.get("last_heartbeat", 0) < 30:
                    active += 1
            except (json.JSONDecodeError, TypeError):
                pass
        return active

    # ------------------------------------------------------------------
    # Maintenance
    # ------------------------------------------------------------------

    async def clear_pending(self) -> int:
        """Remove all pending entries from the stream.

        Returns the number of entries that were cleared.
        """
        length = await self._redis.xlen(self.STREAM_KEY)
        await self._redis.xtrim(self.STREAM_KEY, maxlen=0)
        return length
