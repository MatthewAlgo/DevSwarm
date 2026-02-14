"""
Probabilistic unit tests for Bob — DevOps Monitor Agent.
Tests health checking, error recovery, and state mutations.
"""

import pytest

from agents.bob.agent import BobAgent
from core.context import MockContext
from core.state import create_initial_state
from core.schemas import BobHealthOutput
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestBobAgent:
    """Tests for BobAgent."""

    async def test_agent_metadata(self):
        agent = BobAgent()
        assert agent.agent_id == "bob"
        assert agent.name == "Bob"
        assert agent.default_room == "Server Room"

    async def test_health_report_stored(self, mock_context_with_agents, state_with_error, bob_output):
        """Health report should be written to state."""
        agent = BobAgent(context=mock_context_with_agents)
        agent._chain = make_mock_chain(bob_output)

        result = await agent.process(state_with_error)

        assert "health_report" in result
        assert result["health_report"]["system_status"] == "recovering"

    async def test_error_agents_recovered(self, mock_context_with_agents, state_with_error, bob_output):
        """Agents in Error state should be recovered to Idle."""
        agent = BobAgent(context=mock_context_with_agents)
        agent._chain = make_mock_chain(bob_output)

        await agent.process(state_with_error)

        # Find updates for mona (the agent in Error state)
        mona_recoveries = [
            u for u in mock_context_with_agents.updates
            if u["agent_id"] == "mona" and u.get("status") == "Idle"
        ]
        assert len(mona_recoveries) >= 1

    async def test_recovery_messages_sent(self, mock_context_with_agents, state_with_error, bob_output):
        """Recovery + status report messages should be sent."""
        agent = BobAgent(context=mock_context_with_agents)
        agent._chain = make_mock_chain(bob_output)

        await agent.process(state_with_error)

        recovery_msgs = [m for m in mock_context_with_agents.messages if m["message_type"] == "recovery"]
        status_msgs = [m for m in mock_context_with_agents.messages if m["message_type"] == "status_report"]

        assert len(recovery_msgs) >= 1  # At least one recovery
        assert len(status_msgs) >= 1  # Report to Marco
        assert status_msgs[0]["to_agent"] == "marco"

    async def test_error_cleared_from_state(self, mock_context_with_agents, state_with_error, bob_output):
        """State error should be cleared after recovery."""
        agent = BobAgent(context=mock_context_with_agents)
        agent._chain = make_mock_chain(bob_output)

        result = await agent.process(state_with_error)
        assert result["error"] == ""

    async def test_no_error_agents(self, mock_context, base_state):
        """When no agents are in error, recovery should be skipped."""
        # mock_context has no agents, so no errors
        output = BobHealthOutput(
            diagnosis="All systems nominal",
            agents_online=8,
            agents_error=0,
            system_status="healthy",
        )
        agent = BobAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)

        assert result["health_report"]["system_status"] == "healthy"
        recovery_msgs = [m for m in mock_context.messages if m["message_type"] == "recovery"]
        assert len(recovery_msgs) == 0

    @pytest.mark.parametrize("status", ["healthy", "recovering", "critical"])
    async def test_system_status_variants(self, mock_context, base_state, status):
        """Health report should reflect the diagnosed system status."""
        output = BobHealthOutput(diagnosis="Test diagnosis", system_status=status)
        agent = BobAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["health_report"]["system_status"] == status
