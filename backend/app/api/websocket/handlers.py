"""Socket.IO event handlers for real-time analysis communication."""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from app.agents.graph import run_analysis_graph
from app.api.websocket.manager import manager, sio
from app.db.session import AsyncSessionLocal
from app.models.analysis import Analysis
from app.utils.solana_utils import is_valid_solana_address

logger = logging.getLogger(__name__)

# In-flight analysis tasks keyed by analysis_id
_running_tasks: dict[str, asyncio.Task[Any]] = {}


# ------------------------------------------------------------------
# Lifecycle events
# ------------------------------------------------------------------


@sio.event
async def connect(sid: str, environ: dict[str, Any]) -> None:
    """Handle a new Socket.IO connection."""
    logger.info("Client connected: %s", sid)


@sio.event
async def disconnect(sid: str) -> None:
    """Handle client disconnection -- clean up room membership."""
    logger.info("Client disconnected: %s", sid)
    manager.leave_all(sid)


# ------------------------------------------------------------------
# Analysis events
# ------------------------------------------------------------------


@sio.on("analysis:start")
async def handle_analysis_start(sid: str, data: dict[str, Any]) -> None:
    """Validate the contract address, create an analysis record, and launch the pipeline."""
    contract_address = (data.get("contract_address") or "").strip()

    if not contract_address or not is_valid_solana_address(contract_address):
        await sio.emit(
            "analysis:error",
            {"error": "Invalid Solana contract address"},
            to=sid,
        )
        return

    analysis_id = str(uuid.uuid4())
    room = f"analysis:{analysis_id}"

    # Join the room
    sio.enter_room(sid, room)
    manager.join(sid, room)

    # Persist a pending record
    try:
        async with AsyncSessionLocal() as db:
            analysis = Analysis(id=analysis_id, status="pending")
            db.add(analysis)
            await db.commit()
    except Exception as exc:
        logger.exception("Failed to create analysis record")
        await sio.emit(
            "analysis:error",
            {"error": f"Database error: {exc}"},
            to=sid,
        )
        return

    # Acknowledge
    await sio.emit(
        "analysis:started",
        {"analysis_id": analysis_id, "status": "pending"},
        room=room,
    )

    # Launch background task
    task = asyncio.create_task(
        run_analysis_graph(contract_address, analysis_id, sio, room)
    )
    _running_tasks[analysis_id] = task

    def _cleanup(t: asyncio.Task[Any]) -> None:
        _running_tasks.pop(analysis_id, None)

    task.add_done_callback(_cleanup)


@sio.on("analysis:cancel")
async def handle_analysis_cancel(sid: str, data: dict[str, Any]) -> None:
    """Cancel a running analysis if one exists."""
    analysis_id = data.get("analysis_id", "")
    task = _running_tasks.pop(analysis_id, None)

    if task and not task.done():
        task.cancel()
        await sio.emit(
            "analysis:cancelled",
            {"analysis_id": analysis_id},
            room=f"analysis:{analysis_id}",
        )
        logger.info("Analysis %s cancelled by %s", analysis_id, sid)
    else:
        await sio.emit(
            "analysis:error",
            {"error": "No running analysis found with that ID"},
            to=sid,
        )


# ------------------------------------------------------------------
# Room management events
# ------------------------------------------------------------------


@sio.on("room:join")
async def handle_room_join(sid: str, data: dict[str, Any]) -> None:
    """Add the client to an analysis room for live updates."""
    room = data.get("room", "")
    if room:
        sio.enter_room(sid, room)
        manager.join(sid, room)
        logger.info("Client %s joined room %s", sid, room)


@sio.on("room:leave")
async def handle_room_leave(sid: str, data: dict[str, Any]) -> None:
    """Remove the client from an analysis room."""
    room = data.get("room", "")
    if room:
        sio.leave_room(sid, room)
        manager.leave(sid, room)
        logger.info("Client %s left room %s", sid, room)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


async def broadcast_to_room(room: str, event: str, data: Any) -> None:
    """Convenience function for emitting to a room from outside the handler module."""
    await sio.emit(event, data, room=room)
