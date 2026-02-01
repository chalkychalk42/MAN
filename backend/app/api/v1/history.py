"""Analysis history and trending token endpoints."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.analysis import Analysis
from app.models.token import Token
from app.schemas.common import PaginatedResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/history", tags=["history"])


class AnalysisSummary:
    """Lightweight dict-serialisable summary of a past analysis."""

    pass  # We serialise directly to dicts below for flexibility.


@router.get("/", response_model=PaginatedResponse[dict])
async def get_history(
    q: Optional[str] = Query(default=None, description="Search query (token name or address)"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[dict]:
    """Return paginated analysis history, optionally filtered by search query."""
    base = select(Analysis).join(Token, Analysis.token_id == Token.id, isouter=True)
    count_base = select(func.count(Analysis.id)).join(
        Token, Analysis.token_id == Token.id, isouter=True
    )

    if q:
        pattern = f"%{q}%"
        filter_clause = (
            Token.contract_address.ilike(pattern)
            | Token.name.ilike(pattern)
            | Token.symbol.ilike(pattern)
        )
        base = base.where(filter_clause)
        count_base = count_base.where(filter_clause)

    total = (await db.execute(count_base)).scalar() or 0

    stmt = base.order_by(desc(Analysis.created_at)).offset(offset).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()

    items: list[dict[str, Any]] = []
    for a in rows:
        items.append(
            {
                "analysis_id": str(a.id),
                "status": a.status,
                "risk_score": float(a.risk_score) if a.risk_score else None,
                "wallet_count": a.wallet_count,
                "transaction_count": a.transaction_count,
                "started_at": a.started_at.isoformat() if a.started_at else None,
                "completed_at": a.completed_at.isoformat() if a.completed_at else None,
                "token": {
                    "contract_address": a.token.contract_address,
                    "name": a.token.name,
                    "symbol": a.token.symbol,
                    "image_url": a.token.image_url,
                }
                if a.token
                else None,
            }
        )

    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/trending", response_model=list[dict])
async def get_trending(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return tokens most frequently analysed in the last 24 hours."""
    from datetime import datetime, timedelta, timezone

    since = datetime.now(tz=timezone.utc) - timedelta(hours=24)

    stmt = (
        select(
            Token.contract_address,
            Token.name,
            Token.symbol,
            Token.image_url,
            func.count(Analysis.id).label("scan_count"),
            func.max(Analysis.risk_score).label("max_risk"),
        )
        .join(Token, Analysis.token_id == Token.id)
        .where(Analysis.created_at >= since)
        .group_by(Token.contract_address, Token.name, Token.symbol, Token.image_url)
        .order_by(desc("scan_count"))
        .limit(10)
    )

    rows = (await db.execute(stmt)).all()

    return [
        {
            "contract_address": r.contract_address,
            "name": r.name,
            "symbol": r.symbol,
            "image_url": r.image_url,
            "scan_count": r.scan_count,
            "max_risk": float(r.max_risk) if r.max_risk else None,
        }
        for r in rows
    ]
