"""
Probabilistic unit tests for Comms Interface Agent.
Tests communication processing, escalation routing, and state mutations.
"""

import pytest

from agents.comms.agent import CommsAgent
from core.schemas import CommsOutput, CommItem
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestCommsAgent:
    """Tests for CommsAgent."""

    async def test_agent_metadata(self):
        agent = CommsAgent()
        assert agent.agent_id == "comms"
        assert agent.name == "Comms"
        assert agent.default_room == "Desks"

    async def test_comms_count_in_state(self, mock_context, base_state, comms_output):
        """State should track total processed communications."""
        agent = CommsAgent(context=mock_context)
        agent._chain = make_mock_chain(comms_output)

        result = await agent.process(base_state)
        assert result["comms_processed"] == 1

    async def test_escalations_sent_to_orchestrator(
        self, mock_context, base_state, comms_output
    ):
        """Escalated items should be messaged to Orchestrator."""
        agent = CommsAgent(context=mock_context)
        agent._chain = make_mock_chain(comms_output)

        await agent.process(base_state)

        escalation_msgs = [
            m for m in mock_context.messages if m["message_type"] == "escalation"
        ]
        assert len(escalation_msgs) == 1
        assert escalation_msgs[0]["to_agent"] == "orchestrator"

    async def test_no_escalations(self, mock_context, base_state):
        """No escalation messages when escalations list is empty."""
        output = CommsOutput(
            processed=[
                CommItem(
                    type="reply", to="test@example.com", subject="Test", body="Reply"
                )
            ],
            escalations=[],
            summary="All handled",
        )
        agent = CommsAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)

        escalation_msgs = [
            m for m in mock_context.messages if m["message_type"] == "escalation"
        ]
        assert len(escalation_msgs) == 0

    @pytest.mark.parametrize("n_escalations", [0, 1, 3, 5])
    async def test_escalation_scaling(self, mock_context, base_state, n_escalations):
        """Escalation message count should match escalation items."""
        output = CommsOutput(
            processed=[],
            escalations=[f"Escalation {i}" for i in range(n_escalations)],
            summary="Test",
        )
        agent = CommsAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)

        escalation_msgs = [
            m for m in mock_context.messages if m["message_type"] == "escalation"
        ]
        assert len(escalation_msgs) == n_escalations
