"""Shared response schemas used across multiple endpoints."""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Wrapper for paginated list results."""

    items: list[T]
    total: int = Field(ge=0, description="Total number of matching records")
    offset: int = Field(ge=0, description="Number of records skipped")
    limit: int = Field(ge=1, description="Maximum records returned")


class ErrorResponse(BaseModel):
    """Standard error payload."""

    detail: str


class SuccessResponse(BaseModel):
    """Simple acknowledgement payload."""

    message: str
