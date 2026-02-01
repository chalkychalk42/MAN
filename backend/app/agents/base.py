"""Abstract base class for all MAN agents."""

from __future__ import annotations

import time
import uuid
from abc import ABC, abstractmethod
from typing import Any


class BaseAgent(ABC):
    """Common interface and helpers shared by every agent in the pipeline.

    Subclasses must set ``agent_type`` and ``display_name`` as class
    attributes and implement :meth:`execute`.
    """

    agent_type: str
    display_name: str

    def __init__(self, sio: Any, room: str) -> None:
        self.sio = sio
        self.room = room

    @abstractmethod
    async def execute(self, state: dict[str, Any]) -> dict[str, Any]:
        """Run the agent logic and return the mutated analysis state."""
        ...

    # ------------------------------------------------------------------
    # WebSocket helpers
    # ------------------------------------------------------------------

    async def emit_status(
        self,
        status: str,
        progress: int,
        task: str,
    ) -> None:
        """Broadcast an ``agent:status`` event to the analysis room."""
        await self.sio.emit(
            "agent:status",
            {
                "agent_type": self.agent_type,
                "status": status,
                "progress": progress,
                "current_task": task,
            },
            room=self.room,
        )

    async def emit_message(
        self,
        message: str,
        msg_type: str = "info",
    ) -> None:
        """Broadcast an ``agent:message`` event to the analysis room."""
        await self.sio.emit(
            "agent:message",
            {
                "id": str(uuid.uuid4()),
                "agent_type": self.agent_type,
                "message": message,
                "timestamp": time.time(),
                "type": msg_type,
            },
            room=self.room,
        )
