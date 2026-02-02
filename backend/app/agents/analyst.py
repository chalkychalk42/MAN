"""Analyst agent -- scores wallets based on entry timing, PNL, and behaviour."""

from __future__ import annotations

import json
import logging
import time as _time
from collections import defaultdict
from typing import Any

from app.agents.base import BaseAgent
from app.config import settings
from app.services.solana import SolanaService
from app.utils.scoring import (
    calculate_combined_insider_score,
    calculate_cross_token_score,
    calculate_insider_score,
)

logger = logging.getLogger(__name__)

# 15 minutes expressed in seconds -- "early" entry threshold for cross-token
_EARLY_ENTRY_WINDOW_SECS = 15 * 60

# 30 days expressed in seconds
_THIRTY_DAYS_SECS = 30 * 24 * 3600

# Cache TTL for wallet history (30 minutes)
_WALLET_HISTORY_CACHE_TTL = 30 * 60


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

            # ----------------------------------------------------------
            # Cross-token insider scoring phase
            # ----------------------------------------------------------
            await self.emit_status("working", 70, "Cross-token analysis")
            await self.emit_message(
                "Starting cross-token insider analysis on top wallets"
            )

            top_wallets = wallet_scores[:20]

            if top_wallets:
                await self._score_cross_token(
                    top_wallets, wallet_scores, state
                )

            # Re-sort by combined_insider_score descending
            wallet_scores.sort(
                key=lambda w: w.get("combined_insider_score", w["insider_score"]),
                reverse=True,
            )
            state["wallet_scores"] = wallet_scores

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

    # ------------------------------------------------------------------
    # Cross-token analysis helpers
    # ------------------------------------------------------------------

    async def _score_cross_token(
        self,
        top_wallets: list[dict[str, Any]],
        all_wallet_scores: list[dict[str, Any]],
        state: dict[str, Any],
    ) -> None:
        """Fetch history for *top_wallets* and compute cross-token scores.

        Results are written back into the dicts inside *all_wallet_scores*.
        """
        rate_limiter = state.get("_rate_limiter")
        solana = SolanaService(
            helius_api_key=settings.helius_api_key,
            rpc_url=settings.solana_rpc_url,
            rate_limiter=rate_limiter,
        )

        # Build a Redis-backed cache accessor.  If Redis is unavailable we
        # degrade gracefully with ``None``.
        redis_client = None
        try:
            from app.db.redis import get_redis
            redis_client = get_redis()
        except Exception:
            logger.debug("Redis unavailable -- cross-token cache disabled")

        now_ts = _time.time()
        thirty_days_ago = now_ts - _THIRTY_DAYS_SECS

        # Build an address -> index lookup for fast updates
        addr_to_idx: dict[str, int] = {
            ws["address"]: idx for idx, ws in enumerate(all_wallet_scores)
        }

        total = len(top_wallets)

        try:
            for wi, wallet in enumerate(top_wallets):
                address = wallet["address"]
                progress = 70 + int((wi / max(total, 1)) * 25)
                await self.emit_status(
                    "working",
                    progress,
                    f"Cross-token: {address[:8]}... ({wi + 1}/{total})",
                )

                # --- Fetch or cache wallet history ---
                cache_key = f"man:wallet_history:{address}"
                history_txs: list[dict[str, Any]] | None = None

                if redis_client is not None:
                    try:
                        raw = await redis_client.get(cache_key)
                        if raw is not None:
                            history_txs = json.loads(raw)
                    except Exception:
                        logger.debug("Cache miss/error for %s", cache_key)

                if history_txs is None:
                    history_txs = await solana.get_wallet_history(address, limit=200)
                    if redis_client is not None:
                        try:
                            await redis_client.setex(
                                cache_key,
                                _WALLET_HISTORY_CACHE_TTL,
                                json.dumps(history_txs, default=str),
                            )
                        except Exception:
                            logger.debug("Failed to cache wallet history for %s", address)

                if not history_txs:
                    self._apply_cross_token_defaults(
                        all_wallet_scores, addr_to_idx, address, wallet["insider_score"]
                    )
                    continue

                # --- Group transactions by token mint ---
                token_txs: dict[str, list[dict[str, Any]]] = defaultdict(list)
                for tx in history_txs:
                    for tt in tx.get("tokenTransfers", []):
                        mint = tt.get("mint")
                        if mint:
                            token_txs[mint].append(tx)

                # Skip the current token being analysed
                current_token = state.get("contract_address", "")
                token_txs.pop(current_token, None)

                tokens_traded = len(token_txs)
                if tokens_traded == 0:
                    self._apply_cross_token_defaults(
                        all_wallet_scores, addr_to_idx, address, wallet["insider_score"]
                    )
                    continue

                early_entries = 0
                profitable_early_entries = 0
                early_pnl_values: list[float] = []
                recent_early_count = 0

                for mint, txs in token_txs.items():
                    # Determine earliest transaction timestamp for this token
                    ts_list = [
                        t.get("timestamp", 0) for t in txs if t.get("timestamp")
                    ]
                    if not ts_list:
                        continue

                    token_first_ts = min(ts_list)

                    # Find this wallet's earliest buy of this token
                    wallet_buy_ts: float | None = None
                    wallet_buy_sol = 0.0
                    wallet_sell_sol = 0.0

                    for tx in txs:
                        tx_ts = tx.get("timestamp", 0)
                        for tt in tx.get("tokenTransfers", []):
                            if tt.get("mint") != mint:
                                continue
                            to_addr = tt.get("toUserAccount")
                            from_addr = tt.get("fromUserAccount")

                            sol_amount = 0.0
                            for nt in tx.get("nativeTransfers", []):
                                sol_amount += abs(float(nt.get("amount", 0))) / 1e9

                            if to_addr == address:
                                # Buy
                                if wallet_buy_ts is None or tx_ts < wallet_buy_ts:
                                    wallet_buy_ts = tx_ts
                                wallet_buy_sol += sol_amount
                            elif from_addr == address:
                                # Sell
                                wallet_sell_sol += sol_amount

                    if wallet_buy_ts is None:
                        continue

                    # Is this an early entry?
                    delta = wallet_buy_ts - token_first_ts
                    if delta <= _EARLY_ENTRY_WINDOW_SECS:
                        early_entries += 1

                        # PNL for this token
                        pnl_pct = (
                            ((wallet_sell_sol - wallet_buy_sol) / wallet_buy_sol * 100)
                            if wallet_buy_sol > 0
                            else 0.0
                        )
                        early_pnl_values.append(pnl_pct)

                        if pnl_pct > 0:
                            profitable_early_entries += 1

                        # Recent?
                        if wallet_buy_ts >= thirty_days_ago:
                            recent_early_count += 1

                avg_early_pnl = (
                    sum(early_pnl_values) / len(early_pnl_values)
                    if early_pnl_values
                    else 0.0
                )

                cross_score = calculate_cross_token_score(
                    tokens_traded=tokens_traded,
                    early_entries=early_entries,
                    profitable_early_entries=profitable_early_entries,
                    avg_early_pnl_pct=avg_early_pnl,
                    recent_early_count_30d=recent_early_count,
                )

                combined = calculate_combined_insider_score(
                    single_token_score=wallet["insider_score"],
                    cross_token_score=cross_score,
                )

                hit_rate = (
                    round(profitable_early_entries / early_entries * 100, 2)
                    if early_entries > 0
                    else 0.0
                )

                # Update wallet_scores entry in-place
                idx = addr_to_idx.get(address)
                if idx is not None:
                    ws = all_wallet_scores[idx]
                    ws["cross_token_score"] = round(cross_score, 2)
                    ws["combined_insider_score"] = round(combined, 2)
                    ws["early_token_count"] = early_entries
                    ws["early_token_hit_rate"] = hit_rate
                    ws["tokens_analyzed"] = tokens_traded

                # Emit updated wallet data
                await self.sio.emit(
                    "analysis:wallet_found",
                    {
                        "address": address,
                        "insider_score": wallet["insider_score"],
                        "cross_token_score": round(cross_score, 2),
                        "combined_insider_score": round(combined, 2),
                        "early_token_count": early_entries,
                        "early_token_hit_rate": hit_rate,
                        "tokens_analyzed": tokens_traded,
                    },
                    room=self.room,
                )

                await self.emit_message(
                    f"Cross-token {address[:8]}...: "
                    f"score={round(cross_score, 1)} combined={round(combined, 1)} "
                    f"early={early_entries}/{tokens_traded} hit={hit_rate}%",
                    "info",
                )

        except Exception:
            logger.exception("Cross-token scoring failed")
            await self.emit_message(
                "Cross-token analysis encountered errors", "warning"
            )
        finally:
            await solana.close()

    @staticmethod
    def _apply_cross_token_defaults(
        all_wallet_scores: list[dict[str, Any]],
        addr_to_idx: dict[str, int],
        address: str,
        single_token_score: float,
    ) -> None:
        """Set default cross-token fields when no history is available."""
        idx = addr_to_idx.get(address)
        if idx is not None:
            ws = all_wallet_scores[idx]
            ws["cross_token_score"] = None
            ws["combined_insider_score"] = round(single_token_score * 0.40, 2)
            ws["early_token_count"] = 0
            ws["early_token_hit_rate"] = None
            ws["tokens_analyzed"] = 0
