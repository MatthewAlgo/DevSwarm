"""
Probabilistic unit tests for DevOps Monitor Agent.
Tests health checking, error recovery, and state mutations.
"""

import pytest

from agents.devops.agent import DevOpsAgent
from core.schemas import DevOpsHealthOutput
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestDevOpsAgent:
    """Tests for DevOpsAgent."""

    async def test_agent_metadata(self):
        agent = DevOpsAgent()
        assert agent.agent_id == "devops"
        assert agent.name == "DevOps"
        assert agent.default_room == "Server Room"

    async def test_health_report_stored(
        self, mock_context_with_agents, state_with_error, devops_output
    ):
        """Health report should be written to state."""
        agent = DevOpsAgent(context=mock_context_with_agents)
        agent._chain = make_mock_chain(devops_output)

        result = await agent.process(state_with_error)

        assert "health_report" in result
        assert result["health_report"]["system_status"] == "recovering"

    async def test_error_agents_recovered(
        self, mock_context_with_agents, state_with_error, devops_output
    ):
        """Agents in Error state should be recovered to Idle."""
        agent = DevOpsAgent(context=mock_context_with_agents)
        agent._chain = make_mock_chain(devops_output)

        await agent.process(state_with_error)

        # Find updates for researcher (the agent in Error state in mock_context_with_agents)
        researcher_recoveries = [
            u
            for u in mock_context_with_agents.updates
            if u["agent_id"] == "researcher" and u.get("status") == "Idle"
        ]
        assert len(researcher_recoveries) >= 1

    async def test_recovery_messages_sent(
        self, mock_context_with_agents, state_with_error, devops_output
    ):
        """Recovery + status report messages should be sent."""
        agent = DevOpsAgent(context=mock_context_with_agents)
        agent._chain = make_mock_chain(devops_output)

        await agent.process(state_with_error)

        recovery_msgs = [
            m
            for m in mock_context_with_agents.messages
            if m["message_type"] == "recovery"
        ]
        status_msgs = [
            m
            for m in mock_context_with_agents.messages
            if m["message_type"] == "status_report"
        ]

        assert len(recovery_msgs) >= 1  # At least one recovery
        assert len(status_msgs) >= 1  # Report to Orchestrator
        assert status_msgs[0]["to_agent"] == "orchestrator"

    async def test_error_cleared_from_state(
        self, mock_context_with_agents, state_with_error, devops_output
    ):
        """State error should be cleared after recovery."""
        agent = DevOpsAgent(context=mock_context_with_agents)
        agent._chain = make_mock_chain(devops_output)

        result = await agent.process(state_with_error)
        assert result["error"] == ""

    async def test_no_error_agents(self, mock_context, base_state):
        """When no agents are in error, recovery should be skipped."""
        # mock_context has no agents, so no errors
        output = DevOpsHealthOutput(
            diagnosis="All systems nominal",
            agents_online=8,
            agents_error=0,
            system_status="healthy",
        )
        agent = DevOpsAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)

        assert result["health_report"]["system_status"] == "healthy"
        recovery_msgs = [
            m for m in mock_context.messages if m["message_type"] == "recovery"
        ]
        assert len(recovery_msgs) == 0

    @pytest.mark.parametrize("status", ["healthy", "recovering", "critical"])
    async def test_system_status_variants(self, mock_context, base_state, status):
        """Health report should reflect the diagnosed system status."""
        output = DevOpsHealthOutput(diagnosis="Test diagnosis", system_status=status)
        agent = DevOpsAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["health_report"]["system_status"] == status
