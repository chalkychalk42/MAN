"""Analyst agent -- scores wallets based on entry timing, PNL, and behaviour."""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

from app.agents.base import BaseAgent
from app.utils.scoring import calculate_insider_score

logger = logging.getLogger(__name__)


class AnalystAgent(BaseAgent):
    """Computes per-wallet metrics and insider scores from raw transactions.

    Reads:
        ``raw_transactions``, ``token_metadata``

    Writes:
        ``wallet_scores``, ``wallet_count``
    """

    agent_type: str = "analyst"
    display_name: str = "Analyst"

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        raw_txs: list[dict[str, Any]] = state.get("raw_transactions", [])
        token_meta: dict[str, Any] = state.get("token_metadata", {})

        await self.emit_status("initializing", 0, "Preparing wallet data")
        await self.emit_message(f"Analysing wallets across {len(raw_txs)} transactions")

        if not raw_txs:
            state["wallet_scores"] = []
            state["wallet_count"] = 0
            await self.emit_status("complete", 100, "No transactions to analyse")
            return state

        try:
            # Determine launch time from the earliest transaction
            timestamps = [
                tx.get("timestamp", 0) for tx in raw_txs if tx.get("timestamp")
            ]
            launch_time = min(timestamps) if timestamps else 0

            # --- Aggregate per-wallet ---
            wallet_data: dict[str, dict[str, Any]] = defaultdict(
                lambda: {
                    "buys_sol": 0.0,
                    "sells_sol": 0.0,
                    "first_ts": float("inf"),
                    "last_ts": 0.0,
                    "trade_count": 0,
                }
            )

            await self.emit_status("working", 20, "Aggregating wallet activity")

            for tx in raw_txs:
                fee_payer = tx.get("feePayer")
                tx_type = (tx.get("type") or "").upper()
                ts = tx.get("timestamp", 0)

                # Process token transfers
                for tt in tx.get("tokenTransfers", []):
                    from_addr = tt.get("fromUserAccount")
                    to_addr = tt.get("toUserAccount")
                    amount_raw = float(tt.get("tokenAmount", 0) or 0)

                    # Amount in SOL (approximate via native transfers)
                    sol_amount = 0.0
                    for nt in tx.get("nativeTransfers", []):
                        sol_amount += abs(float(nt.get("amount", 0))) / 1e9

                    if from_addr:
                        w = wallet_data[from_addr]
                        w["sells_sol"] += sol_amount
                        w["first_ts"] = min(w["first_ts"], ts) if ts else w["first_ts"]
                        w["last_ts"] = max(w["last_ts"], ts) if ts else w["last_ts"]
                        w["trade_count"] += 1

                    if to_addr:
                        w = wallet_data[to_addr]
                        w["buys_sol"] += sol_amount
                        w["first_ts"] = min(w["first_ts"], ts) if ts else w["first_ts"]
                        w["last_ts"] = max(w["last_ts"], ts) if ts else w["last_ts"]
                        w["trade_count"] += 1

                # Fallback: use fee payer when no token transfers
                if not tx.get("tokenTransfers") and fee_payer:
                    w = wallet_data[fee_payer]
                    w["trade_count"] += 1
                    if ts:
                        w["first_ts"] = min(w["first_ts"], ts)
                        w["last_ts"] = max(w["last_ts"], ts)

            # --- Score wallets ---
            await self.emit_status("working", 60, "Scoring wallets")
            await self.emit_message(f"Scoring {len(wallet_data)} unique wallets")

            wallet_scores: list[dict[str, Any]] = []

            for address, data in wallet_data.items():
                buys = data["buys_sol"]
                sells = data["sells_sol"]
                pnl_sol = sells - buys
                pnl_pct = ((sells - buys) / buys * 100) if buys > 0 else 0.0
                first_ts = data["first_ts"] if data["first_ts"] != float("inf") else launch_time
                last_ts = data["last_ts"] or first_ts
                hold_hours = max((last_ts - first_ts) / 3600.0, 0.0)

                insider = calculate_insider_score(
                    entry_time_seconds=first_ts,
                    launch_time_seconds=launch_time,
                    pnl_pct=pnl_pct,
                    hold_hours=hold_hours,
                    trade_count=data["trade_count"],
                )

                tags: list[str] = []
                if first_ts - launch_time < 60:
                    tags.append("early_buyer")
                if pnl_pct > 500:
                    tags.append("high_pnl")
                if hold_hours < 1:
                    tags.append("quick_flip")

                wallet_scores.append(
                    {
                        "address": address,
                        "entry_time": first_ts,
                        "pnl_percentage": round(pnl_pct, 2),
                        "pnl_sol": round(pnl_sol, 6),
                        "hold_duration_hours": round(hold_hours, 2),
                        "insider_score": round(insider, 2),
                        "risk_score": None,
                        "label": None,
                        "tags": tags,
                    }
                )

            # Sort by insider score descending
            wallet_scores.sort(key=lambda w: w["insider_score"], reverse=True)
            state["wallet_scores"] = wallet_scores
            state["wallet_count"] = len(wallet_scores)

            # Emit top wallets
            top_n = wallet_scores[:5]
            for ws in top_n:
                await self.emit_message(
                    f"Wallet {ws['address'][:8]}... score={ws['insider_score']} "
                    f"PNL={ws['pnl_percentage']}% tags={ws['tags']}",
                    "info",
                )

            await self.emit_status("complete", 100, "Wallet analysis complete")
            await self.emit_message(
                f"Scored {len(wallet_scores)} wallets "
                f"({sum(1 for w in wallet_scores if w['insider_score'] > 50)} high-score)",
                "success",
            )

        except Exception as exc:
            logger.exception("Analyst agent failed")
            state["wallet_scores"] = []
            state["wallet_count"] = 0
            await self.emit_status("error", 0, f"Error: {exc}")
            await self.emit_message(f"Analyst failed: {exc}", "error")

        return state
