"""Analysis-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.token import TokenMetadata
from app.schemas.wallet import WalletScore


class AnalysisRequest(BaseModel):
    """Payload to kick off a new analysis run."""

    contract_address: str = Field(..., max_length=44)


class AnalysisStartResponse(BaseModel):
    """Immediate response after an analysis is queued."""

    analysis_id: str
    status: str = "pending"


class AnalysisStatus(BaseModel):
    """Live status of a running analysis."""

    analysis_id: str
    status: str
    agents: dict[str, str] = Field(
        default_factory=dict,
        description="Mapping of agent_type -> current status string",
    )


class FlowNode(BaseModel):
    """Single node in the Sankey / flow graph."""

    id: str
    name: str
    type: str


class FlowLink(BaseModel):
    """Single directed edge in the flow graph."""

    source: str
    target: str
    value: float


class FlowGraph(BaseModel):
    """Complete flow graph structure for the frontend visualisation."""

    nodes: list[FlowNode] = Field(default_factory=list)
    links: list[FlowLink] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    """Full analysis result returned once the pipeline completes."""

    analysis_id: str
    token: Optional[TokenMetadata] = None
    wallets: list[WalletScore] = Field(default_factory=list)
    flow_graph: Optional[FlowGraph] = None
    risk_score: Optional[float] = None
    risk_factors: Optional[dict] = None
    ai_insights: Optional[str] = None
    wallet_count: Optional[int] = None
    transaction_count: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
