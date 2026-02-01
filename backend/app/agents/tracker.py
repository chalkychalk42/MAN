"""Tracker agent -- builds flow graphs and detects wallet clusters."""

from __future__ import annotations

import logging
from typing import Any

from app.agents.base import BaseAgent
from app.services.flow_service import build_flow_graph, detect_clusters

logger = logging.getLogger(__name__)


class TrackerAgent(BaseAgent):
    """Processes raw transactions into a Sankey-compatible flow graph
    and identifies wallet clusters through shared funding sources.

    Reads:
        ``raw_transactions``

    Writes:
        ``flow_graph``, ``wallet_clusters``
    """

    agent_type: str = "tracker"
    display_name: str = "Tracker"

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        raw_txs: list[dict[str, Any]] = state.get("raw_transactions", [])

        await self.emit_status("initializing", 0, "Preparing transaction data")
        await self.emit_message(f"Processing {len(raw_txs)} transactions for flow analysis")

        if not raw_txs:
            state["flow_graph"] = {"nodes": [], "links": []}
            state["wallet_clusters"] = []
            await self.emit_status("complete", 100, "No transactions to process")
            await self.emit_message("No transactions available for flow graph", "warning")
            return state

        try:
            # --- Normalise raw Helius transactions for the flow service ---
            await self.emit_status("working", 20, "Normalising transactions")

            normalised: list[dict[str, Any]] = []
            for tx in raw_txs:
                source = tx.get("feePayer")
                dest = None

                # Try token transfers first, then native transfers
                transfers = tx.get("tokenTransfers", []) or tx.get("nativeTransfers", [])
                if transfers:
                    dest = transfers[0].get("toUserAccount")

                sol_amount = 0.0
                for nt in tx.get("nativeTransfers", []):
                    sol_amount += float(nt.get("amount", 0)) / 1e9

                normalised.append(
                    {
                        "source_address": source,
                        "destination_address": dest,
                        "sol_amount": sol_amount,
                        "tx_type": tx.get("type", ""),
                        "feePayer": source,
                        "nativeAmount": sol_amount,
                        "type": tx.get("type", ""),
                    }
                )

            # --- Build flow graph ---
            await self.emit_status("working", 50, "Building flow graph")
            await self.emit_message("Constructing source-to-destination flow graph")

            flow = build_flow_graph(normalised)
            state["flow_graph"] = flow

            node_count = len(flow.get("nodes", []))
            link_count = len(flow.get("links", []))
            await self.emit_message(
                f"Flow graph: {node_count} nodes, {link_count} links", "success"
            )

            # --- Detect clusters ---
            await self.emit_status("working", 75, "Detecting wallet clusters")
            await self.emit_message("Identifying wallets with shared funding sources")

            clusters = detect_clusters(normalised)
            state["wallet_clusters"] = clusters

            await self.emit_status("complete", 100, "Flow analysis complete")
            await self.emit_message(
                f"Detected {len(clusters)} wallet cluster(s)", "success"
            )

        except Exception as exc:
            logger.exception("Tracker agent failed")
            state["flow_graph"] = {"nodes": [], "links": []}
            state["wallet_clusters"] = []
            await self.emit_status("error", 0, f"Error: {exc}")
            await self.emit_message(f"Tracker failed: {exc}", "error")

        return state
