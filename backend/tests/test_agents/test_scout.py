"""Tests for scout agent."""
import pytest


class TestScoutAgent:
    @pytest.mark.asyncio
    async def test_scout_init(self):
        from app.agents.scout import ScoutAgent
        # Basic import and instantiation test
        assert ScoutAgent is not None
