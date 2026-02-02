"""Headless Socket.IO server for worker processes.

Uses ``AsyncRedisManager`` in **write_only** mode so that workers can
emit WebSocket events through Redis without accepting inbound
connections.  The API server's ``AsyncRedisManager`` (non-write-only)
picks up the events and relays them to connected clients.
"""

import socketio


def create_worker_sio(redis_url: str) -> socketio.AsyncServer:
    """Return an :class:`AsyncServer` suitable for background workers."""
    mgr = socketio.AsyncRedisManager(redis_url, write_only=True)
    return socketio.AsyncServer(
        client_manager=mgr,
        async_mode="aiohttp",
        logger=False,
    )
