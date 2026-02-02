"""Pydantic schemas for the queue REST endpoints."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class QueueSubmitRequest(BaseModel):
    """Payload for submitting one or more contract addresses."""

    addresses: list[str] = Field(
        ...,
        min_length=1,
        description="List of Solana contract addresses to analyse",
    )


class QueueSubmitResponse(BaseModel):
    """Response after a successful batch submission."""

    batch_id: str
    job_ids: list[str]
    total: int


class JobSummary(BaseModel):
    """Lightweight view of a single job's state."""

    job_id: str
    contract_address: str
    status: str
    worker_id: Optional[str] = None
    risk_score: Optional[float] = None
    error: Optional[str] = None


class QueueStatusResponse(BaseModel):
    """Aggregate queue health snapshot."""

    pending: int
    processing: int
    complete: int
    error: int
    workers_active: int


class BatchStatusResponse(BaseModel):
    """Detailed batch progress report."""

    batch_id: str
    total: int
    pending: int
    processing: int
    complete: int
    error: int
    jobs: list[JobSummary] = Field(default_factory=list)
