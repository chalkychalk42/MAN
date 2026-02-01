"""Central API router -- aggregates all v1 sub-routers."""

from fastapi import APIRouter

from app.api.v1.analysis import router as analysis_router
from app.api.v1.health import router as health_router
from app.api.v1.history import router as history_router
from app.api.v1.tokens import router as tokens_router
from app.api.v1.wallets import router as wallets_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(analysis_router)
api_router.include_router(wallets_router)
api_router.include_router(tokens_router)
api_router.include_router(history_router)
