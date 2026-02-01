"""Tests for analysis endpoints."""
import pytest


@pytest.mark.asyncio
async def test_start_analysis_invalid_address(client):
    response = await client.post("/api/v1/analysis/start", json={"contract_address": "invalid"})
    assert response.status_code in (400, 422)
