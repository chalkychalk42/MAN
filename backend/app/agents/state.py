"""Typed definition of the shared analysis state passed through the agent pipeline."""

from __future__ import annotations

from typing import Any, Optional, TypedDict


class AnalysisState(TypedDict, total=False):
    """Mutable state dictionary threaded through every agent.

    Each agent reads the fields it needs and writes the fields it produces.
    Fields use ``total=False`` so agents only need to supply their outputs.
    """

    # Identifiers
    analysis_id: str
    contract_address: str
    room: str

    # Scout outputs
    token_metadata: dict[str, Any]
    raw_transactions: list[dict[str, Any]]

    # Tracker outputs
    flow_graph: dict[str, Any]  # {nodes: [...], links: [...]}
    wallet_clusters: list[list[str]]

    # Analyst outputs
    wallet_scores: list[dict[str, Any]]

    # Sleuth outputs
    wallet_connections: list[dict[str, Any]]

    # Sentinel outputs
    risk_score: float
    risk_factors: dict[str, Any]
    ai_insights: str

    # Metadata
    wallet_count: int
    transaction_count: int
    started_at: str
    completed_at: str

    # Error tracking
    error: Optional[str]
    status: str
