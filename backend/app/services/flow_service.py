"""Flow graph construction and wallet-cluster detection."""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

from app.utils.solana_utils import truncate_address

logger = logging.getLogger(__name__)


def build_flow_graph(transactions: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a Sankey-compatible flow graph from parsed transactions.

    Returns a dict with ``nodes`` (list of ``{id, name, type}``) and
    ``links`` (list of ``{source, target, value}``).
    """
    node_set: dict[str, dict[str, str]] = {}
    edge_map: dict[tuple[str, str], float] = defaultdict(float)

    for tx in transactions:
        source = tx.get("source_address") or tx.get("feePayer")
        dest = tx.get("destination_address")
        if not source or not dest:
            continue

        # Register nodes
        for addr in (source, dest):
            if addr not in node_set:
                node_set[addr] = {
                    "id": addr,
                    "name": truncate_address(addr),
                    "type": "wallet",
                }

        amount = float(tx.get("sol_amount", 0) or tx.get("nativeAmount", 0) or 0)
        edge_map[(source, dest)] += max(amount, 0.0001)

    nodes = list(node_set.values())
    links = [
        {"source": src, "target": dst, "value": round(val, 4)}
        for (src, dst), val in edge_map.items()
    ]

    return {"nodes": nodes, "links": links}


def detect_clusters(transactions: list[dict[str, Any]]) -> list[list[str]]:
    """Detect wallet clusters via simple shared-funding-source heuristic.

    Two wallets are in the same cluster when they share a common *funding
    source* -- i.e. they both received SOL from the same address.

    Returns a list of clusters, each being a list of wallet addresses.
    """
    # Map: funded_wallet -> set of funding sources
    funding_sources: dict[str, set[str]] = defaultdict(set)
    all_wallets: set[str] = set()

    for tx in transactions:
        source = tx.get("source_address") or tx.get("feePayer")
        dest = tx.get("destination_address")
        tx_type = tx.get("tx_type") or tx.get("type", "")

        if not source or not dest:
            continue

        all_wallets.update([source, dest])

        # Only consider native SOL transfers as "funding"
        if tx_type.upper() in ("TRANSFER", "SOL_TRANSFER", "NATIVE_TRANSFER", ""):
            sol_amount = float(tx.get("sol_amount", 0) or tx.get("nativeAmount", 0) or 0)
            if sol_amount > 0:
                funding_sources[dest].add(source)

    # Build adjacency via shared funding
    # wallet -> cluster_id (union-find)
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        while parent.get(x, x) != x:
            parent[x] = parent.get(parent[x], parent[x])
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    # Wallets funded by the same source -> union
    source_to_funded: dict[str, list[str]] = defaultdict(list)
    for wallet, sources in funding_sources.items():
        for src in sources:
            source_to_funded[src].append(wallet)

    for src, funded_list in source_to_funded.items():
        for i in range(len(funded_list) - 1):
            union(funded_list[i], funded_list[i + 1])

    # Collect clusters with at least 2 members
    cluster_map: dict[str, list[str]] = defaultdict(list)
    for wallet in all_wallets:
        root = find(wallet)
        cluster_map[root].append(wallet)

    return [members for members in cluster_map.values() if len(members) >= 2]
