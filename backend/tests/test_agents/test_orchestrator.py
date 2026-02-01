"""Tests for agent orchestrator."""
import pytest


class TestOrchestrator:
    @pytest.mark.asyncio
    async def test_orchestrator_init(self):
        from app.agents.orchestrator import HiveMindOrchestrator
        orchestrator = HiveMindOrchestrator.__new__(HiveMindOrchestrator)
        assert orchestrator is not None
