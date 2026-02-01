"""Sleuth agent -- discovers hidden connections between wallets."""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

from app.agents.base import BaseAgent

logger = logging.getLogger(__name__)

# Insider-score threshold above which a wallet is considered "interesting"
HIGH_SCORE_THRESHOLD = 40.0


class SleuthAgent(BaseAgent):
    """Investigates high-scoring wallets for on-chain connections.

    Checks for:
    - Common funding sources
    - Common withdrawal destinations
    - Temporal correlation (wallets active within a short window)

    Reads:
        ``wallet_scores``, ``wallet_clusters``, ``raw_transactions``

    Writes:
        ``wallet_connections``
    """

    agent_type: str = "sleuth"
    display_name: str = "Sleuth"

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        wallet_scores: list[dict[str, Any]] = state.get("wallet_scores", [])
        clusters: list[list[str]] = state.get("wallet_clusters", [])
        raw_txs: list[dict[str, Any]] = state.get("raw_transactions", [])

        await self.emit_status("initializing", 0, "Preparing investigation data")
        await self.emit_message("Investigating wallet connections")

        high_score_addresses = {
            w["address"]
            for w in wallet_scores
            if w.get("insider_score", 0) >= HIGH_SCORE_THRESHOLD
        }

        if not high_score_addresses:
            state["wallet_connections"] = []
            await self.emit_status("complete", 100, "No high-score wallets to investigate")
            await self.emit_message("No wallets above threshold for investigation", "info")
            return state

        try:
            connections: list[dict[str, Any]] = []

            # ----------------------------------------------------------
            # 1. Common funding sources
            # ----------------------------------------------------------
            await self.emit_status("working", 20, "Checking common funding sources")
            await self.emit_message(
                f"Checking {len(high_score_addresses)} wallets for shared funding"
            )

            funding_map: dict[str, set[str]] = defaultdict(set)
            for tx in raw_txs:
                source = tx.get("feePayer")
                for nt in tx.get("nativeTransfers", []):
                    to_addr = nt.get("toUserAccount")
                    if to_addr and to_addr in high_score_addresses and source:
                        funding_map[source].add(to_addr)

            for funder, funded_set in funding_map.items():
                funded = list(funded_set)
                if len(funded) >= 2:
                    for i in range(len(funded)):
                        for j in range(i + 1, len(funded)):
                            connections.append(
                                {
                                    "source_address": funded[i],
                                    "target_address": funded[j],
                                    "connection_type": "common_funding",
                                    "strength": min(len(funded) / 10.0, 1.0),
                                    "evidence_count": len(funded),
                                }
                            )

            await self.emit_message(
                f"Found {len(connections)} common-funding links", "info"
            )

            # ----------------------------------------------------------
            # 2. Common withdrawal destinations
            # ----------------------------------------------------------
            await self.emit_status("working", 50, "Checking withdrawal patterns")

            withdrawal_map: dict[str, set[str]] = defaultdict(set)
            for tx in raw_txs:
                source = tx.get("feePayer")
                if source and source in high_score_addresses:
                    for nt in tx.get("nativeTransfers", []):
                        to_addr = nt.get("toUserAccount")
                        if to_addr:
                            withdrawal_map[to_addr].add(source)

            for dest, senders_set in withdrawal_map.items():
                senders = list(senders_set)
                if len(senders) >= 2:
                    for i in range(len(senders)):
                        for j in range(i + 1, len(senders)):
                            connections.append(
                                {
                                    "source_address": senders[i],
                                    "target_address": senders[j],
                                    "connection_type": "common_withdrawal",
                                    "strength": min(len(senders) / 10.0, 1.0),
                                    "evidence_count": len(senders),
                                }
                            )

            # ----------------------------------------------------------
            # 3. Temporal correlation
            # ----------------------------------------------------------
            await self.emit_status("working", 75, "Analysing temporal patterns")

            score_map = {w["address"]: w for w in wallet_scores}
            high_wallets = [
                score_map[addr]
                for addr in high_score_addresses
                if addr in score_map
            ]
            high_wallets.sort(key=lambda w: w.get("entry_time", 0))

            TEMPORAL_WINDOW_S = 60  # seconds
            for i in range(len(high_wallets)):
                for j in range(i + 1, len(high_wallets)):
                    t_i = high_wallets[i].get("entry_time", 0)
                    t_j = high_wallets[j].get("entry_time", 0)
                    if abs(t_j - t_i) <= TEMPORAL_WINDOW_S:
                        connections.append(
                            {
                                "source_address": high_wallets[i]["address"],
                                "target_address": high_wallets[j]["address"],
                                "connection_type": "temporal_correlation",
                                "strength": max(
                                    1.0 - abs(t_j - t_i) / TEMPORAL_WINDOW_S, 0.1
                                ),
                                "evidence_count": 1,
                            }
                        )

            # ----------------------------------------------------------
            # 4. Cluster membership
            # ----------------------------------------------------------
            for cluster in clusters:
                cluster_high = [a for a in cluster if a in high_score_addresses]
                for i in range(len(cluster_high)):
                    for j in range(i + 1, len(cluster_high)):
                        connections.append(
                            {
                                "source_address": cluster_high[i],
                                "target_address": cluster_high[j],
                                "connection_type": "cluster_member",
                                "strength": 0.8,
                                "evidence_count": len(cluster),
                            }
                        )

            # Deduplicate
            seen: set[tuple[str, str, str]] = set()
            unique: list[dict[str, Any]] = []
            for conn in connections:
                key = (
                    conn["source_address"],
                    conn["target_address"],
                    conn["connection_type"],
                )
                if key not in seen:
                    seen.add(key)
                    unique.append(conn)

            state["wallet_connections"] = unique

            await self.emit_status("complete", 100, "Investigation complete")
            await self.emit_message(
                f"Discovered {len(unique)} wallet connections", "success"
            )

        except Exception as exc:
            logger.exception("Sleuth agent failed")
            state["wallet_connections"] = []
            await self.emit_status("error", 0, f"Error: {exc}")
            await self.emit_message(f"Sleuth failed: {exc}", "error")

        return state
