"""
Probabilistic unit tests for Tonny — Comms Interface Agent.
Tests communication processing, escalation routing, and state mutations.
"""

import pytest

from agents.tonny.agent import TonnyAgent
from core.context import MockContext
from core.state import create_initial_state
from core.schemas import TonnyCommsOutput, CommItem
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestTonnyAgent:
    """Tests for TonnyAgent."""

    async def test_agent_metadata(self):
        agent = TonnyAgent()
        assert agent.agent_id == "tonny"
        assert agent.name == "Tonny"
        assert agent.default_room == "Desks"

    async def test_comms_count_in_state(self, mock_context, base_state, tonny_output):
        """State should track total processed communications."""
        agent = TonnyAgent(context=mock_context)
        agent._chain = make_mock_chain(tonny_output)

        result = await agent.process(base_state)
        assert result["comms_processed"] == 1

    async def test_escalations_sent_to_marco(self, mock_context, base_state, tonny_output):
        """Escalated items should be messaged to Marco."""
        agent = TonnyAgent(context=mock_context)
        agent._chain = make_mock_chain(tonny_output)

        await agent.process(base_state)

        escalation_msgs = [m for m in mock_context.messages if m["message_type"] == "escalation"]
        assert len(escalation_msgs) == 1
        assert escalation_msgs[0]["to_agent"] == "marco"

    async def test_no_escalations(self, mock_context, base_state):
        """No escalation messages when escalations list is empty."""
        output = TonnyCommsOutput(
            processed=[CommItem(type="reply", to="test@example.com", subject="Test", body="Reply")],
            escalations=[],
            summary="All handled",
        )
        agent = TonnyAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)

        escalation_msgs = [m for m in mock_context.messages if m["message_type"] == "escalation"]
        assert len(escalation_msgs) == 0

    @pytest.mark.parametrize("n_escalations", [0, 1, 3, 5])
    async def test_escalation_scaling(self, mock_context, base_state, n_escalations):
        """Escalation message count should match escalation items."""
        output = TonnyCommsOutput(
            processed=[],
            escalations=[f"Escalation {i}" for i in range(n_escalations)],
            summary="Test",
        )
        agent = TonnyAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)

        escalation_msgs = [m for m in mock_context.messages if m["message_type"] == "escalation"]
        assert len(escalation_msgs) == n_escalations
