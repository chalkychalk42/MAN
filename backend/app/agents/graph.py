"""LangGraph-based DAG definition for the analysis pipeline.

If ``langgraph`` is installed the pipeline is modelled as a proper
``StateGraph``.  Otherwise execution falls back directly to
:class:`HiveMindOrchestrator`.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)

_USE_LANGGRAPH = False

try:
    from langgraph.graph import END, StateGraph

    _USE_LANGGRAPH = True
except ImportError:
    logger.info("langgraph not installed -- using direct orchestrator")


# ------------------------------------------------------------------
# LangGraph implementation
# ------------------------------------------------------------------

def _build_graph() -> Any:
    """Construct and compile the LangGraph ``StateGraph``.

    Topology::

        scout -> parallel(tracker, analyst) -> sleuth -> sentinel -> END
    """
    if not _USE_LANGGRAPH:
        return None

    from app.agents.analyst import AnalystAgent
    from app.agents.scout import ScoutAgent
    from app.agents.sentinel import SentinelAgent
    from app.agents.sleuth import SleuthAgent
    from app.agents.tracker import TrackerAgent

    graph = StateGraph(dict)

    # --- node wrappers (LangGraph expects sync or async callables) ---

    async def scout_node(state: dict) -> dict:
        sio = state.get("_sio")
        room = state.get("room", "")
        agent = ScoutAgent(sio, room)
        return await agent.execute(state)

    async def tracker_node(state: dict) -> dict:
        sio = state.get("_sio")
        room = state.get("room", "")
        agent = TrackerAgent(sio, room)
        return await agent.execute(state)

    async def analyst_node(state: dict) -> dict:
        sio = state.get("_sio")
        room = state.get("room", "")
        agent = AnalystAgent(sio, room)
        return await agent.execute(state)

    async def parallel_node(state: dict) -> dict:
        """Run tracker and analyst concurrently, then merge results."""
        t_state, a_state = await asyncio.gather(
            tracker_node(dict(state)),
            analyst_node(dict(state)),
        )
        state["flow_graph"] = t_state.get("flow_graph", {})
        state["wallet_clusters"] = t_state.get("wallet_clusters", [])
        state["wallet_scores"] = a_state.get("wallet_scores", [])
        state["wallet_count"] = a_state.get("wallet_count", 0)
        return state

    async def sleuth_node(state: dict) -> dict:
        sio = state.get("_sio")
        room = state.get("room", "")
        agent = SleuthAgent(sio, room)
        return await agent.execute(state)

    async def sentinel_node(state: dict) -> dict:
        sio = state.get("_sio")
        room = state.get("room", "")
        agent = SentinelAgent(sio, room)
        return await agent.execute(state)

    # Register nodes
    graph.add_node("scout", scout_node)
    graph.add_node("parallel", parallel_node)
    graph.add_node("sleuth", sleuth_node)
    graph.add_node("sentinel", sentinel_node)

    # Define edges
    graph.set_entry_point("scout")
    graph.add_edge("scout", "parallel")
    graph.add_edge("parallel", "sleuth")
    graph.add_edge("sleuth", "sentinel")
    graph.add_edge("sentinel", END)

    return graph.compile()


# Eagerly compile once at import time (returns ``None`` if langgraph is missing)
_compiled_graph = _build_graph()


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

async def run_analysis_graph(
    contract_address: str,
    analysis_id: str,
    sio: Any,
    room: str,
    rate_limiter: Any = None,
) -> dict[str, Any]:
    """Run the analysis pipeline.

    Uses LangGraph if available; otherwise delegates to the
    :class:`HiveMindOrchestrator`.

    Parameters
    ----------
    rate_limiter:
        Optional :class:`DistributedRateLimiter` instance injected into
        the pipeline state so that every agent can throttle outbound API
        calls.
    """
    if _compiled_graph is not None:
        logger.info("Running analysis via LangGraph for %s", contract_address)
        initial_state: dict[str, Any] = {
            "analysis_id": analysis_id,
            "contract_address": contract_address,
            "room": room,
            "status": "running",
            "_sio": sio,
            "_rate_limiter": rate_limiter,
        }
        result = await _compiled_graph.ainvoke(initial_state)
        # Clean up internal keys before returning
        result.pop("_sio", None)
        result.pop("_rate_limiter", None)
        return result

    # Fallback
    from app.agents.orchestrator import HiveMindOrchestrator

    return await HiveMindOrchestrator.run_analysis(
        contract_address, analysis_id, sio, room
    )
