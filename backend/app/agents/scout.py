"""Scout agent -- validates contract addresses and fetches on-chain data."""

from __future__ import annotations

import logging
from typing import Any

from app.agents.base import BaseAgent
from app.config import settings
from app.services.solana import SolanaService
from app.utils.solana_utils import is_valid_solana_address

logger = logging.getLogger(__name__)


class ScoutAgent(BaseAgent):
    """First agent in the pipeline.

    Responsibilities:
    1. Validate the contract address.
    2. Fetch token metadata via the Helius DAS ``getAsset`` call.
    3. Fetch enhanced transactions for the token.
    4. Populate ``token_metadata`` and ``raw_transactions`` in the state.
    """

    agent_type: str = "scout"
    display_name: str = "Scout"

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        contract_address: str = state["contract_address"]

        await self.emit_status("initializing", 0, "Validating contract address")
        await self.emit_message(f"Validating address {contract_address}")

        if not is_valid_solana_address(contract_address):
            state["error"] = f"Invalid Solana address: {contract_address}"
            state["status"] = "error"
            await self.emit_status("error", 0, "Invalid address")
            await self.emit_message(
                f"Address validation failed: {contract_address}", "error"
            )
            return state

        rate_limiter = state.get("_rate_limiter")
        solana = SolanaService(
            helius_api_key=settings.helius_api_key,
            rpc_url=settings.solana_rpc_url,
            rate_limiter=rate_limiter,
        )

        try:
            # --- Fetch token metadata ---
            await self.emit_status("working", 20, "Fetching token metadata")
            await self.emit_message("Querying Helius DAS for asset metadata")

            asset_data = await solana.get_asset(contract_address)

            content = asset_data.get("content", {})
            meta = content.get("metadata", {})
            links = content.get("links", {})
            token_info = asset_data.get("token_info", {})

            token_metadata: dict[str, Any] = {
                "contract_address": contract_address,
                "name": meta.get("name"),
                "symbol": meta.get("symbol"),
                "decimals": token_info.get("decimals", 9),
                "total_supply": token_info.get("supply"),
                "image_url": links.get("image"),
                "description": meta.get("description"),
            }
            state["token_metadata"] = token_metadata

            await self.emit_message(
                f"Token identified: {token_metadata.get('name', 'Unknown')} "
                f"({token_metadata.get('symbol', '?')})",
                "success",
            )

            # --- Fetch transactions ---
            await self.emit_status("working", 50, "Fetching transactions")
            await self.emit_message("Retrieving enhanced transaction history")

            all_transactions: list[dict[str, Any]] = []
            before: str | None = None

            # Paginate up to 500 transactions
            for page in range(5):
                batch = await solana.get_transactions(
                    contract_address, before=before, limit=100
                )
                if not batch:
                    break
                all_transactions.extend(batch)
                before = batch[-1].get("signature")

                progress = 50 + min(page * 10, 40)
                await self.emit_status(
                    "working", progress, f"Fetched {len(all_transactions)} transactions"
                )

            state["raw_transactions"] = all_transactions
            state["transaction_count"] = len(all_transactions)

            await self.emit_status("complete", 100, "Data collection complete")
            await self.emit_message(
                f"Collected {len(all_transactions)} transactions", "success"
            )

        except Exception as exc:
            logger.exception("Scout agent failed")
            state["error"] = str(exc)
            state["status"] = "error"
            await self.emit_status("error", 0, f"Error: {exc}")
            await self.emit_message(f"Scout failed: {exc}", "error")
        finally:
            await solana.close()

        return state
