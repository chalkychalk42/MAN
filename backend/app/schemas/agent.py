"""Agent-related Pydantic schemas and enumerations."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class AgentType(str, Enum):
    """Enumeration of agent roles in the analysis pipeline."""

    scout = "scout"
    tracker = "tracker"
    analyst = "analyst"
    sleuth = "sleuth"
    sentinel = "sentinel"
    orchestrator = "orchestrator"


class AgentStatusValue(str, Enum):
    """Possible runtime statuses for an agent."""

    idle = "idle"
    initializing = "initializing"
    working = "working"
    complete = "complete"
    error = "error"


class AgentStatusUpdate(BaseModel):
    """Status update emitted by an agent during execution."""

    agent_type: AgentType
    status: AgentStatusValue
    progress: int = Field(ge=0, le=100)
    current_task: str = ""


class AgentMessage(BaseModel):
    """Informational message emitted by an agent."""

    id: str
    agent_type: AgentType
    message: str
    timestamp: float
    type: str = Field(
        default="info",
        description="Message severity: info, success, warning, or error",
    )
