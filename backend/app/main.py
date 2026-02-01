"""FastAPI application entry point for the Moltie Agent Network (MAN) backend."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.websocket.manager import socket_app
from app.config import settings
from app.db.redis import close_redis, init_redis
from app.db.session import engine

# Ensure websocket event handlers are registered at import time
import app.api.websocket.handlers  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application-wide resources."""
    # Startup
    logger.info("Starting MAN API -- initialising resources")
    await init_redis()
    logger.info("Redis connection pool ready")
    yield
    # Shutdown
    logger.info("Shutting down MAN API -- releasing resources")
    await close_redis()
    await engine.dispose()
    logger.info("All resources released")


# ------------------------------------------------------------------
# Application factory
# ------------------------------------------------------------------

app = FastAPI(
    title="MAN API",
    version="0.1.0",
    description=(
        "Moltie Agent Network -- multi-agent Solana token analysis "
        "platform with real-time insider detection."
    ),
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(api_router, prefix="/api/v1")

# Socket.IO (mounted as a sub-application)
app.mount("/ws", socket_app)
