"""Scoring heuristics for insider detection and token risk assessment."""

from __future__ import annotations

import math


def calculate_insider_score(
    entry_time_seconds: float,
    launch_time_seconds: float,
    pnl_pct: float,
    hold_hours: float,
    trade_count: int,
) -> float:
    """Compute an insider-likelihood score between 0 and 100.

    Higher values indicate stronger insider signals.

    Parameters
    ----------
    entry_time_seconds:
        Unix timestamp of the wallet's first buy of the token.
    launch_time_seconds:
        Unix timestamp of the token's launch / first trade.
    pnl_pct:
        Profit and loss as a percentage (100 = 100 %).
    hold_hours:
        Total hours the wallet held the token.
    trade_count:
        Number of trades the wallet made for this token.
    """
    score = 0.0

    # --- Early entry score (0-40 pts) ---
    # The earlier the entry relative to launch, the higher the score.
    delta_minutes = max((entry_time_seconds - launch_time_seconds) / 60.0, 0.0)
    if delta_minutes <= 1:
        score += 40
    elif delta_minutes <= 5:
        score += 35
    elif delta_minutes <= 15:
        score += 25
    elif delta_minutes <= 60:
        score += 15
    elif delta_minutes <= 360:
        score += 5

    # --- PNL score (0-30 pts) ---
    if pnl_pct > 1000:
        score += 30
    elif pnl_pct > 500:
        score += 25
    elif pnl_pct > 200:
        score += 20
    elif pnl_pct > 100:
        score += 15
    elif pnl_pct > 50:
        score += 10
    elif pnl_pct > 0:
        score += 5

    # --- Hold duration score (0-15 pts) ---
    # Very short holds suggest pre-planned exits.
    if hold_hours < 0.5:
        score += 15
    elif hold_hours < 2:
        score += 12
    elif hold_hours < 6:
        score += 8
    elif hold_hours < 24:
        score += 4

    # --- Trade frequency score (0-15 pts) ---
    # Extremely few, well-timed trades are suspicious.
    if trade_count <= 2:
        score += 15
    elif trade_count <= 5:
        score += 10
    elif trade_count <= 10:
        score += 5

    return min(max(score, 0.0), 100.0)


def calculate_risk_score(
    insider_concentration: float,
    dev_selling: bool,
    liquidity_ratio: float,
    sniper_count: int,
) -> float:
    """Compute an overall token risk score between 0 and 100.

    Higher values indicate more risk.

    Parameters
    ----------
    insider_concentration:
        Fraction (0-1) of total supply held by high-insider-score wallets.
    dev_selling:
        Whether the deployer wallet has sold tokens.
    liquidity_ratio:
        Liquidity / market-cap ratio (0-1 range).
    sniper_count:
        Number of wallets that bought within the first block.
    """
    score = 0.0

    # --- Insider concentration (0-35 pts) ---
    score += min(insider_concentration * 100, 35.0)

    # --- Developer selling (0-25 pts) ---
    if dev_selling:
        score += 25.0

    # --- Low liquidity (0-20 pts) ---
    if liquidity_ratio < 0.01:
        score += 20
    elif liquidity_ratio < 0.05:
        score += 15
    elif liquidity_ratio < 0.10:
        score += 10
    elif liquidity_ratio < 0.20:
        score += 5

    # --- Sniper bots (0-20 pts) ---
    if sniper_count >= 10:
        score += 20
    elif sniper_count >= 5:
        score += 15
    elif sniper_count >= 3:
        score += 10
    elif sniper_count >= 1:
        score += 5

    return min(max(score, 0.0), 100.0)


def calculate_cross_token_score(
    tokens_traded: int,
    early_entries: int,
    profitable_early_entries: int,
    avg_early_pnl_pct: float,
    recent_early_count_30d: int,
) -> float:
    """Compute cross-token insider likelihood (0-100).

    A wallet consistently entering tokens early and profiting
    is likely an insider or has alpha access.
    """
    if tokens_traded == 0 or early_entries == 0:
        return 0.0

    # Consistency (0-35): what % of tokens they traded were entered early
    consistency = (early_entries / tokens_traded) * 100
    consistency_score = min(consistency, 100) * 0.35

    # Hit rate (0-30): what % of early entries were profitable
    hit_rate = (profitable_early_entries / early_entries) * 100
    hit_rate_score = min(hit_rate, 100) * 0.30

    # Avg PNL (0-20): how much they profit on early entries
    if avg_early_pnl_pct > 1000:
        pnl_score = 20
    elif avg_early_pnl_pct > 500:
        pnl_score = 16
    elif avg_early_pnl_pct > 200:
        pnl_score = 12
    elif avg_early_pnl_pct > 50:
        pnl_score = 8
    elif avg_early_pnl_pct > 0:
        pnl_score = 4
    else:
        pnl_score = 0

    # Volume (0-15): number of early entries in recent 30 days
    if recent_early_count_30d >= 10:
        volume_score = 15
    elif recent_early_count_30d >= 5:
        volume_score = 12
    elif recent_early_count_30d >= 3:
        volume_score = 8
    elif recent_early_count_30d >= 1:
        volume_score = 4
    else:
        volume_score = 0

    return min(max(consistency_score + hit_rate_score + pnl_score + volume_score, 0.0), 100.0)


def calculate_combined_insider_score(
    single_token_score: float,
    cross_token_score: float,
) -> float:
    """Combine single-token and cross-token scores.

    Cross-token history is weighted more heavily (60%) because
    consistent early entry across many tokens is the strongest insider signal.
    """
    return min(
        single_token_score * 0.40 + cross_token_score * 0.60,
        100.0,
    )
