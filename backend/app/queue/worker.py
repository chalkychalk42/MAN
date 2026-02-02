"""Standalone worker process that consumes jobs from the Redis Streams queue.

Usage::

    python -m app.queue.worker

Each worker instance generates a unique consumer name from the hostname
and PID, registers itself in ``man:workers:registry``, and enters a
loop that claims jobs via ``XREADGROUP``, runs the analysis pipeline,
and acknowledges the result.

Graceful shutdown is triggered by ``SIGTERM`` or ``SIGINT``.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import platform
import signal
import time
from typing import Any

import redis.asyncio as aioredis

from app.config import settings
from app.db.session import AsyncSessionLocal
from app.models.analysis import Analysis
from app.queue.emitter import create_worker_sio
from app.queue.rate_limiter import DistributedRateLimiter
from app.queue.stream import QueueManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Worker identity
# ------------------------------------------------------------------

WORKER_ID = f"{platform.node()}-{os.getpid()}"


# ------------------------------------------------------------------
# Heartbeat
# ------------------------------------------------------------------

async def _heartbeat_loop(
    redis: aioredis.Redis,
    interval: int,
    shutdown: asyncio.Event,
) -> None:
    """Periodically write a heartbeat to the worker registry hash."""
    while not shutdown.is_set():
        payload = json.dumps({
            "worker_id": WORKER_ID,
            "last_heartbeat": time.time(),
            "pid": os.getpid(),
        })
        try:
            await redis.hset("man:workers:registry", WORKER_ID, payload)
        except Exception:
            logger.warning("Failed to write heartbeat", exc_info=True)

        try:
            await asyncio.wait_for(shutdown.wait(), timeout=interval)
            return  # shutdown was set
        except asyncio.TimeoutError:
            pass


# ------------------------------------------------------------------
# Result persistence
# ------------------------------------------------------------------

async def _save_analysis_result(
    job_id: str,
    state: dict[str, Any],
) -> None:
    """Persist or update the analysis row in PostgreSQL.

    Creates the row if it does not yet exist (the queue flow does not
    pre-create DB rows like the REST endpoint does).
    """
    from datetime import datetime, timezone
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        stmt = select(Analysis).where(Analysis.id == job_id)
        result = await db.execute(stmt)
        analysis = result.scalar_one_or_none()

        if analysis is None:
            analysis = Analysis(id=job_id, status="pending")
            db.add(analysis)

        analysis.status = state.get("status", "error")
        analysis.risk_score = state.get("risk_score")
        analysis.risk_factors = state.get("risk_factors")
        analysis.ai_insights = state.get("ai_insights")
        analysis.wallet_count = state.get("wallet_count")
        analysis.transaction_count = state.get("transaction_count")
        analysis.flow_graph = state.get("flow_graph")
        analysis.agent_timings = state.get("agent_timings")

        if state.get("started_at"):
            analysis.started_at = datetime.fromisoformat(state["started_at"])
        if state.get("completed_at"):
            analysis.completed_at = datetime.fromisoformat(state["completed_at"])
        if state.get("error"):
            analysis.error_message = state["error"]

        await db.commit()


# ------------------------------------------------------------------
# Job processor
# ------------------------------------------------------------------

async def _process_job(
    job: dict[str, Any],
    queue: QueueManager,
    sio: Any,
    rate_limiter: DistributedRateLimiter,
) -> None:
    """Run the analysis pipeline for a single job."""
    job_id = job["job_id"]
    entry_id = job["entry_id"]
    contract_address = job["contract_address"]
    room = job["room"]

    logger.info(
        "Worker %s processing job %s (CA: %s)",
        WORKER_ID, job_id, contract_address,
    )

    await queue.mark_processing(job_id, WORKER_ID)

    try:
        # Emit status update through Redis pub/sub
        await sio.emit(
            "analysis:status",
            {"analysis_id": job_id, "status": "processing", "worker_id": WORKER_ID},
            room=room,
        )

        # Import here to avoid circular imports at module level
        from app.agents.graph import run_analysis_graph

        state = await asyncio.wait_for(
            run_analysis_graph(
                contract_address=contract_address,
                analysis_id=job_id,
                sio=sio,
                room=room,
                rate_limiter=rate_limiter,
            ),
            timeout=settings.worker_job_timeout,
        )

        risk_score = state.get("risk_score")
        await queue.mark_complete(job_id, risk_score=risk_score)

        # Persist results to the database
        await _save_analysis_result(job_id, state)

        logger.info("Job %s completed (risk_score=%s)", job_id, risk_score)

    except asyncio.TimeoutError:
        error_msg = f"Job timed out after {settings.worker_job_timeout}s"
        logger.error("Job %s timed out", job_id)
        await queue.mark_error(job_id, error_msg)
        await sio.emit(
            "analysis:error",
            {"analysis_id": job_id, "error": error_msg},
            room=room,
        )

    except Exception as exc:
        error_msg = str(exc)[:500]
        logger.exception("Job %s failed", job_id)
        await queue.mark_error(job_id, error_msg)
        await sio.emit(
            "analysis:error",
            {"analysis_id": job_id, "error": error_msg},
            room=room,
        )

    finally:
        await queue.ack_job(entry_id)


# ------------------------------------------------------------------
# Main loop
# ------------------------------------------------------------------

async def _main() -> None:
    """Initialise connections and enter the consume-process loop."""
    logger.info("Worker %s starting", WORKER_ID)

    # Redis connection
    redis = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
        max_connections=20,
    )

    queue = QueueManager(redis)
    await queue.ensure_group()

    # Headless Socket.IO emitter
    sio = create_worker_sio(settings.redis_url)

    # Distributed rate limiter shared across all workers
    rate_limiter = DistributedRateLimiter(redis)

    # Graceful shutdown
    shutdown = asyncio.Event()
    loop = asyncio.get_running_loop()

    def _signal_handler() -> None:
        logger.info("Worker %s received shutdown signal", WORKER_ID)
        shutdown.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _signal_handler)

    # Background heartbeat
    heartbeat_task = asyncio.create_task(
        _heartbeat_loop(redis, settings.worker_heartbeat_interval, shutdown),
    )

    logger.info("Worker %s ready -- waiting for jobs", WORKER_ID)

    try:
        while not shutdown.is_set():
            job = await queue.claim_job(WORKER_ID)
            if job is None:
                continue

            # Check if the job was cancelled before we start processing
            job_status = await queue.get_job_status(job["job_id"])
            if job_status and job_status.get("status") == "cancelled":
                await queue.ack_job(job["entry_id"])
                logger.info("Skipping cancelled job %s", job["job_id"])
                continue

            await _process_job(job, queue, sio, rate_limiter)

    except asyncio.CancelledError:
        logger.info("Worker %s main loop cancelled", WORKER_ID)

    finally:
        # Clean shutdown
        shutdown.set()
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass

        # Deregister from worker registry
        try:
            await redis.hdel("man:workers:registry", WORKER_ID)
        except Exception:
            pass

        await redis.close()
        logger.info("Worker %s shut down", WORKER_ID)


def main() -> None:
    """Synchronous entry point for ``python -m app.queue.worker``."""
    asyncio.run(_main())


if __name__ == "__main__":
    main()
