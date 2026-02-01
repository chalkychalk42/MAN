"""Health-check endpoint."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_redis

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return the operational status of core dependencies.

    Checks:
    - PostgreSQL connectivity
    - Redis connectivity
    - Solana RPC reachability
    """
    status: dict[str, Any] = {
        "status": "ok",
        "database": "unknown",
        "redis": "unknown",
        "solana_rpc": "unknown",
    }

    # --- Database ---
    try:
        await db.execute(text("SELECT 1"))
        status["database"] = "ok"
    except Exception as exc:
        logger.warning("Database health check failed: %s", exc)
        status["database"] = "error"
        status["status"] = "degraded"

    # --- Redis ---
    try:
        redis = get_redis()
        await redis.ping()
        status["redis"] = "ok"
    except Exception as exc:
        logger.warning("Redis health check failed: %s", exc)
        status["redis"] = "error"
        status["status"] = "degraded"

    # --- Solana RPC (lightweight check) ---
    try:
        from app.config import settings
        import httpx

        if settings.helius_api_key:
            rpc_url = settings.solana_rpc_url or (
                f"https://mainnet.helius-rpc.com/?api-key={settings.helius_api_key}"
            )
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    rpc_url,
                    json={"jsonrpc": "2.0", "id": 1, "method": "getHealth"},
                )
                body = resp.json()
                if body.get("result") == "ok":
                    status["solana_rpc"] = "ok"
                else:
                    status["solana_rpc"] = "degraded"
        else:
            status["solana_rpc"] = "not_configured"
    except Exception as exc:
        logger.warning("Solana RPC health check failed: %s", exc)
        status["solana_rpc"] = "error"
        status["status"] = "degraded"

    return status
