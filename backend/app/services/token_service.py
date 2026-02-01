"""Token persistence and metadata helpers."""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.token import Token
from app.services.solana import SolanaService

logger = logging.getLogger(__name__)


async def get_or_create_token(
    db: AsyncSession,
    contract_address: str,
    solana_service: SolanaService,
) -> Token:
    """Return an existing ``Token`` row or create one by fetching metadata.

    If the token already exists in the database it is returned immediately.
    Otherwise the Helius DAS API is queried for on-chain metadata and a new
    row is inserted.
    """
    stmt = select(Token).where(Token.contract_address == contract_address)
    result = await db.execute(stmt)
    token = result.scalar_one_or_none()

    if token is not None:
        return token

    # Fetch from Helius
    asset_data = await solana_service.get_asset(contract_address)
    metadata = _extract_token_metadata(asset_data, contract_address)

    token = Token(
        contract_address=contract_address,
        name=metadata.get("name"),
        symbol=metadata.get("symbol"),
        decimals=metadata.get("decimals", 9),
        image_url=metadata.get("image_url"),
        description=metadata.get("description"),
        metadata_json=asset_data or None,
    )
    db.add(token)
    await db.flush()
    return token


async def update_token_metadata(
    db: AsyncSession,
    token: Token,
    metadata: dict[str, Any],
) -> Token:
    """Merge *metadata* into an existing ``Token`` record and flush."""
    for key in (
        "name",
        "symbol",
        "decimals",
        "total_supply",
        "image_url",
        "description",
        "liquidity_sol",
        "market_cap_usd",
        "holder_count",
        "launch_timestamp",
    ):
        value = metadata.get(key)
        if value is not None:
            setattr(token, key, value)

    if "metadata_json" in metadata:
        token.metadata_json = metadata["metadata_json"]

    await db.flush()
    return token


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------


def _extract_token_metadata(
    asset_data: dict[str, Any],
    contract_address: str,
) -> dict[str, Any]:
    """Normalise raw DAS asset response into a flat metadata dict."""
    if not asset_data:
        return {"contract_address": contract_address}

    content = asset_data.get("content", {})
    meta = content.get("metadata", {})
    links = content.get("links", {})

    return {
        "contract_address": contract_address,
        "name": meta.get("name"),
        "symbol": meta.get("symbol"),
        "decimals": asset_data.get("token_info", {}).get("decimals", 9),
        "image_url": links.get("image") or content.get("json_uri"),
        "description": meta.get("description"),
    }
