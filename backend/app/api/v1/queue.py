"""Queue management REST endpoints."""

from __future__ import annotations

import logging
from typing import Any

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.dependencies import get_redis
from app.queue.stream import QueueManager
from app.schemas.common import SuccessResponse
from app.schemas.queue import (
    BatchStatusResponse,
    JobSummary,
    QueueStatusResponse,
    QueueSubmitRequest,
    QueueSubmitResponse,
)
from app.utils.solana_utils import is_valid_solana_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/queue", tags=["queue"])


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _queue(redis: aioredis.Redis) -> QueueManager:
    """Build a :class:`QueueManager` from the request-scoped Redis client."""
    return QueueManager(redis)


def _safe_int(value: Any, default: int = 0) -> int:
    """Coerce a Redis hash value to ``int``, falling back to *default*."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any) -> float | None:
    """Coerce a Redis hash value to ``float`` or ``None``."""
    try:
        v = float(value)
        return v if v == v else None  # NaN guard
    except (TypeError, ValueError):
        return None


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------

@router.post("/submit", response_model=QueueSubmitResponse)
async def submit_jobs(
    body: QueueSubmitRequest,
    redis: aioredis.Redis = Depends(get_redis),
) -> QueueSubmitResponse:
    """Submit one or more contract addresses for analysis."""
    if len(body.addresses) > settings.queue_max_batch_size:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Batch size {len(body.addresses)} exceeds maximum "
                f"of {settings.queue_max_batch_size}"
            ),
        )

    invalid = [a for a in body.addresses if not is_valid_solana_address(a)]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Solana address(es): {', '.join(invalid[:5])}",
        )

    q = _queue(redis)
    await q.ensure_group()
    batch_id, job_ids = await q.submit_batch(body.addresses)

    logger.info(
        "Submitted batch %s with %d jobs", batch_id, len(job_ids),
    )

    return QueueSubmitResponse(
        batch_id=batch_id,
        job_ids=job_ids,
        total=len(job_ids),
    )


@router.get("/status", response_model=QueueStatusResponse)
async def queue_status(
    redis: aioredis.Redis = Depends(get_redis),
) -> QueueStatusResponse:
    """Return an aggregate snapshot of queue health."""
    q = _queue(redis)
    depth = await q.get_queue_depth()
    workers_active = await q.get_active_workers()

    return QueueStatusResponse(
        pending=depth["pending"],
        processing=0,
        complete=0,
        error=0,
        workers_active=workers_active,
    )


@router.get("/batch/{batch_id}", response_model=BatchStatusResponse)
async def batch_status(
    batch_id: str,
    redis: aioredis.Redis = Depends(get_redis),
) -> BatchStatusResponse:
    """Return detailed status for every job in a batch."""
    q = _queue(redis)
    batch = await q.get_batch_status(batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Collect individual job summaries by scanning job hashes that
    # reference this batch.  We use SCAN to avoid blocking Redis.
    jobs: list[JobSummary] = []
    cursor: int | str = 0
    while True:
        cursor, keys = await redis.scan(
            cursor=int(cursor), match="man:job:*", count=200,
        )
        if keys:
            pipe = redis.pipeline()
            for key in keys:
                pipe.hgetall(key)
            results = await pipe.execute()
            for key, data in zip(keys, results):
                if data and data.get("batch_id") == batch_id:
                    risk_raw = data.get("risk_score", "")
                    jobs.append(
                        JobSummary(
                            job_id=data.get("analysis_id", ""),
                            contract_address=data.get("contract_address", ""),
                            status=data.get("status", "unknown"),
                            worker_id=data.get("worker_id") or None,
                            risk_score=_safe_float(risk_raw),
                            error=data.get("error") or None,
                        )
                    )
        if not cursor or cursor == 0:
            break

    return BatchStatusResponse(
        batch_id=batch_id,
        total=_safe_int(batch.get("total")),
        pending=_safe_int(batch.get("pending")),
        processing=_safe_int(batch.get("processing")),
        complete=_safe_int(batch.get("complete")),
        error=_safe_int(batch.get("error")),
        jobs=jobs,
    )


@router.delete("/clear", response_model=SuccessResponse)
async def clear_queue(
    redis: aioredis.Redis = Depends(get_redis),
) -> SuccessResponse:
    """Remove all pending entries from the job stream."""
    q = _queue(redis)
    cleared = await q.clear_pending()
    logger.info("Cleared %d pending jobs from queue", cleared)
    return SuccessResponse(message=f"Cleared {cleared} pending jobs")


@router.delete("/job/{job_id}", response_model=SuccessResponse)
async def cancel_job(
    job_id: str,
    redis: aioredis.Redis = Depends(get_redis),
) -> SuccessResponse:
    """Cancel a specific job by marking it as cancelled."""
    q = _queue(redis)
    job = await q.get_job_status(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.get("status") in ("complete", "error", "cancelled"):
        raise HTTPException(
            status_code=409,
            detail=f"Job already in terminal state: {job['status']}",
        )

    await q.mark_cancelled(job_id)
    logger.info("Cancelled job %s", job_id)
    return SuccessResponse(message=f"Job {job_id} cancelled")
