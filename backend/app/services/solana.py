"""Solana / Helius RPC service layer."""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.utils.solana_utils import is_valid_solana_address

logger = logging.getLogger(__name__)


class SolanaService:
    """High-level async client for Helius and Solana RPC endpoints.

    Parameters
    ----------
    helius_api_key:
        Helius API key used for authenticated endpoints.
    rpc_url:
        Base URL for the Solana JSON-RPC endpoint.  When empty the Helius
        RPC URL is derived from *helius_api_key*.
    """

    def __init__(self, helius_api_key: str, rpc_url: str = "") -> None:
        self._api_key = helius_api_key
        self._rpc_url = rpc_url or f"https://mainnet.helius-rpc.com/?api-key={helius_api_key}"
        self._helius_base = f"https://api.helius.xyz/v0"
        self._client = httpx.AsyncClient(timeout=30.0)

    # ------------------------------------------------------------------
    # DAS (Digital Asset Standard) helpers
    # ------------------------------------------------------------------

    async def get_asset(self, address: str) -> dict[str, Any]:
        """Fetch on-chain asset metadata via the DAS ``getAsset`` method.

        Returns the JSON payload from the RPC response or an empty dict
        on failure.
        """
        payload = {
            "jsonrpc": "2.0",
            "id": "man-get-asset",
            "method": "getAsset",
            "params": {"id": address},
        }
        try:
            resp = await self._client.post(self._rpc_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", {})
        except Exception:
            logger.exception("get_asset failed for %s", address)
            return {}

    # ------------------------------------------------------------------
    # Enhanced transactions
    # ------------------------------------------------------------------

    async def get_transactions(
        self,
        address: str,
        before: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Fetch enhanced (parsed) transactions for *address* via Helius.

        Parameters
        ----------
        address:
            On-chain account address to query.
        before:
            Pagination cursor — transaction signature to start before.
        limit:
            Maximum number of transactions to return (max 100).
        """
        url = f"{self._helius_base}/addresses/{address}/transactions"
        params: dict[str, Any] = {
            "api-key": self._api_key,
            "limit": min(limit, 100),
        }
        if before:
            params["before"] = before

        try:
            resp = await self._client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            logger.exception("get_transactions failed for %s", address)
            return []

    # ------------------------------------------------------------------
    # Token holders
    # ------------------------------------------------------------------

    async def get_token_holders(
        self,
        mint: str,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Return the largest holders of *mint* via the Helius ``getTokenAccounts`` DAS method."""
        payload = {
            "jsonrpc": "2.0",
            "id": "man-holders",
            "method": "getTokenAccounts",
            "params": {
                "mint": mint,
                "limit": limit,
                "showZeroBalance": False,
            },
        }
        try:
            resp = await self._client.post(self._rpc_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", {}).get("token_accounts", [])
        except Exception:
            logger.exception("get_token_holders failed for %s", mint)
            return []

    # ------------------------------------------------------------------
    # Signatures
    # ------------------------------------------------------------------

    async def get_signatures(
        self,
        address: str,
        limit: int = 1000,
    ) -> list[dict[str, Any]]:
        """Fetch raw signature list via the standard ``getSignaturesForAddress`` RPC method."""
        payload = {
            "jsonrpc": "2.0",
            "id": "man-sigs",
            "method": "getSignaturesForAddress",
            "params": [
                address,
                {"limit": min(limit, 1000)},
            ],
        }
        try:
            resp = await self._client.post(self._rpc_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", [])
        except Exception:
            logger.exception("get_signatures failed for %s", address)
            return []

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    async def validate_address(self, address: str) -> bool:
        """Return *True* if *address* is a syntactically valid Solana public key."""
        return is_valid_solana_address(address)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def close(self) -> None:
        """Shut down the underlying HTTP client."""
        await self._client.aclose()
