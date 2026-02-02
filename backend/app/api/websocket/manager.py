"""Socket.IO server and connection manager."""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

import socketio

from app.config import settings

logger = logging.getLogger(__name__)

# Redis Pub/Sub manager for distributed WebSocket broadcasting.
# This allows worker processes to emit events through Redis that the
# API server relays to connected clients.
_redis_mgr = socketio.AsyncRedisManager(settings.redis_url)

sio = socketio.AsyncServer(
    client_manager=_redis_mgr,
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

# ASGI app to mount in FastAPI
socket_app = socketio.ASGIApp(sio, socketio_path="/ws")


class ConnectionManager:
    """Tracks Socket.IO sessions and room membership."""

    def __init__(self) -> None:
        self._rooms: dict[str, set[str]] = defaultdict(set)
        self._sid_rooms: dict[str, set[str]] = defaultdict(set)

    def join(self, sid: str, room: str) -> None:
        """Register *sid* in *room*."""
        self._rooms[room].add(sid)
        self._sid_rooms[sid].add(room)

    def leave(self, sid: str, room: str) -> None:
        """Remove *sid* from *room*."""
        self._rooms[room].discard(sid)
        self._sid_rooms[sid].discard(room)

    def leave_all(self, sid: str) -> None:
        """Remove *sid* from every room it belongs to."""
        for room in list(self._sid_rooms.get(sid, [])):
            self._rooms[room].discard(sid)
        self._sid_rooms.pop(sid, None)

    def room_members(self, room: str) -> set[str]:
        return set(self._rooms.get(room, set()))

    def rooms_for(self, sid: str) -> set[str]:
        return set(self._sid_rooms.get(sid, set()))


manager = ConnectionManager()
