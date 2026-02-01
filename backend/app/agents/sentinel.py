"""Sentinel agent -- aggregates findings into a risk assessment."""

from __future__ import annotations

import logging
from typing import Any

from app.agents.base import BaseAgent
from app.config import settings
from app.utils.scoring import calculate_risk_score

logger = logging.getLogger(__name__)


class SentinelAgent(BaseAgent):
    """Final agent in the pipeline.

    Aggregates outputs from all previous agents into a composite risk
    score and generates a natural-language insight summary (via OpenAI
    when available, otherwise rule-based).

    Reads:
        ``wallet_scores``, ``wallet_connections``, ``flow_graph``,
        ``token_metadata``, ``raw_transactions``

    Writes:
        ``risk_score``, ``risk_factors``, ``ai_insights``
    """

    agent_type: str = "sentinel"
    display_name: str = "Sentinel"

    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        wallet_scores: list[dict[str, Any]] = state.get("wallet_scores", [])
        connections: list[dict[str, Any]] = state.get("wallet_connections", [])
        flow_graph: dict[str, Any] = state.get("flow_graph", {})
        token_meta: dict[str, Any] = state.get("token_metadata", {})
        raw_txs: list[dict[str, Any]] = state.get("raw_transactions", [])

        await self.emit_status("initializing", 0, "Aggregating findings")
        await self.emit_message("Compiling risk assessment from all agents")

        try:
            # ----------------------------------------------------------
            # Compute risk factors
            # ----------------------------------------------------------
            await self.emit_status("working", 20, "Computing risk factors")

            total_wallets = len(wallet_scores)
            high_score_wallets = [
                w for w in wallet_scores if w.get("insider_score", 0) > 50
            ]
            early_buyers = [
                w for w in wallet_scores if "early_buyer" in w.get("tags", [])
            ]

            insider_concentration = (
                len(high_score_wallets) / total_wallets
                if total_wallets > 0
                else 0.0
            )

            # Check if any dev/deployer wallet sold
            dev_selling = any(
                w.get("pnl_sol", 0) and w.get("pnl_sol", 0) > 0
                for w in wallet_scores[:3]  # top scorers
            )

            # Liquidity ratio (use metadata if available)
            liquidity = float(token_meta.get("liquidity_sol", 0) or 0)
            market_cap = float(token_meta.get("market_cap_usd", 0) or 0)
            liquidity_ratio = (liquidity / market_cap) if market_cap > 0 else 0.0

            # Sniper count: wallets that bought within the first block (~400ms)
            sniper_count = sum(
                1
                for w in wallet_scores
                if "early_buyer" in w.get("tags", [])
                and w.get("hold_duration_hours", 999) < 0.5
            )

            risk = calculate_risk_score(
                insider_concentration=insider_concentration,
                dev_selling=dev_selling,
                liquidity_ratio=liquidity_ratio,
                sniper_count=sniper_count,
            )

            risk_factors: dict[str, Any] = {
                "insider_concentration": round(insider_concentration, 4),
                "insider_wallet_count": len(high_score_wallets),
                "early_buyer_count": len(early_buyers),
                "dev_selling": dev_selling,
                "liquidity_ratio": round(liquidity_ratio, 4),
                "sniper_count": sniper_count,
                "connection_count": len(connections),
                "cluster_connections": sum(
                    1 for c in connections if c.get("connection_type") == "cluster_member"
                ),
            }

            state["risk_score"] = round(risk, 2)
            state["risk_factors"] = risk_factors

            await self.emit_message(
                f"Risk score: {risk:.1f}/100 | "
                f"Insiders: {len(high_score_wallets)} | "
                f"Snipers: {sniper_count}",
                "info",
            )

            # ----------------------------------------------------------
            # Generate AI insights
            # ----------------------------------------------------------
            await self.emit_status("working", 60, "Generating insights")

            ai_insights = await self._generate_insights(
                token_meta, wallet_scores, risk_factors, risk
            )
            state["ai_insights"] = ai_insights

            await self.emit_status("complete", 100, "Risk assessment complete")
            await self.emit_message("Risk assessment finalised", "success")

        except Exception as exc:
            logger.exception("Sentinel agent failed")
            state["risk_score"] = 0.0
            state["risk_factors"] = {}
            state["ai_insights"] = "Unable to generate insights due to an error."
            await self.emit_status("error", 0, f"Error: {exc}")
            await self.emit_message(f"Sentinel failed: {exc}", "error")

        return state

    # ------------------------------------------------------------------
    # Insight generation
    # ------------------------------------------------------------------

    async def _generate_insights(
        self,
        token_meta: dict[str, Any],
        wallet_scores: list[dict[str, Any]],
        risk_factors: dict[str, Any],
        risk_score: float,
    ) -> str:
        """Attempt to generate a natural-language summary via OpenAI.

        Falls back to a rule-based summary if the API key is missing or the
        call fails.
        """
        if settings.openai_api_key:
            try:
                return await self._ai_summary(
                    token_meta, wallet_scores, risk_factors, risk_score
                )
            except Exception:
                logger.warning("OpenAI call failed -- falling back to rule-based summary")

        return self._rule_based_summary(token_meta, risk_factors, risk_score)

    async def _ai_summary(
        self,
        token_meta: dict[str, Any],
        wallet_scores: list[dict[str, Any]],
        risk_factors: dict[str, Any],
        risk_score: float,
    ) -> str:
        """Call OpenAI (via langchain-openai) for a natural-language summary."""
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.openai_api_key,
            temperature=0.3,
            max_tokens=500,
        )

        top_wallets_summary = "\n".join(
            f"  - {w['address'][:12]}... score={w['insider_score']} "
            f"PNL={w.get('pnl_percentage', 0):.1f}% tags={w.get('tags', [])}"
            for w in wallet_scores[:10]
        )

        prompt = (
            f"You are a Solana token risk analyst. Summarise the findings below "
            f"in 3-5 sentences for a trader evaluating whether a token is safe.\n\n"
            f"Token: {token_meta.get('name', 'Unknown')} ({token_meta.get('symbol', '?')})\n"
            f"Risk score: {risk_score}/100\n"
            f"Risk factors: {risk_factors}\n"
            f"Top wallets:\n{top_wallets_summary}\n\n"
            f"Provide a concise, actionable assessment."
        )

        await self.emit_message("Generating AI-powered insight summary")
        response = await llm.ainvoke(prompt)
        return response.content

    @staticmethod
    def _rule_based_summary(
        token_meta: dict[str, Any],
        risk_factors: dict[str, Any],
        risk_score: float,
    ) -> str:
        """Produce a deterministic summary when OpenAI is unavailable."""
        name = token_meta.get("name", "This token")
        symbol = token_meta.get("symbol", "?")
        parts: list[str] = []

        if risk_score >= 75:
            parts.append(
                f"{name} ({symbol}) shows very high risk indicators (score {risk_score}/100)."
            )
        elif risk_score >= 50:
            parts.append(
                f"{name} ({symbol}) has elevated risk indicators (score {risk_score}/100)."
            )
        elif risk_score >= 25:
            parts.append(
                f"{name} ({symbol}) has moderate risk indicators (score {risk_score}/100)."
            )
        else:
            parts.append(
                f"{name} ({symbol}) appears relatively low-risk (score {risk_score}/100)."
            )

        insiders = risk_factors.get("insider_wallet_count", 0)
        if insiders > 0:
            parts.append(
                f"{insiders} wallet(s) display insider-like behaviour "
                f"({risk_factors.get('insider_concentration', 0) * 100:.1f}% concentration)."
            )

        snipers = risk_factors.get("sniper_count", 0)
        if snipers > 0:
            parts.append(f"{snipers} sniper bot(s) detected in the first block.")

        if risk_factors.get("dev_selling"):
            parts.append("Developer wallet appears to have taken profit.")

        conns = risk_factors.get("connection_count", 0)
        if conns > 0:
            parts.append(
                f"{conns} suspicious connection(s) found between high-score wallets."
            )

        return " ".join(parts)
