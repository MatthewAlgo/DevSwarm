"""
Probabilistic unit tests for Peter — Frontend Designer Agent.
Tests design output, cross-agent messaging, and state mutations.
"""

import pytest

from agents.peter.agent import PeterAgent
from core.context import MockContext
from core.state import create_initial_state
from core.schemas import PeterDesignOutput
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestPeterAgent:
    """Tests for PeterAgent."""

    async def test_agent_metadata(self):
        agent = PeterAgent()
        assert agent.agent_id == "peter"
        assert agent.name == "Peter"
        assert agent.default_room == "Desks"

    async def test_design_stored_in_state(self, mock_context, base_state, peter_output):
        """Design output should be stored in state."""
        agent = PeterAgent(context=mock_context)
        agent._chain = make_mock_chain(peter_output)

        result = await agent.process(base_state)

        assert "design_output" in result
        assert result["design_output"]["type"] == "mockup"
        assert result["design_output"]["approval_status"] == "draft"

    async def test_messages_to_dan_and_marco(self, mock_context, base_state, peter_output):
        """Peter should notify Dan and Marco about the design."""
        agent = PeterAgent(context=mock_context)
        agent._chain = make_mock_chain(peter_output)

        await agent.process(base_state)

        dan_msgs = [m for m in mock_context.messages if m["to_agent"] == "dan"]
        marco_msgs = [m for m in mock_context.messages if m["to_agent"] == "marco"]
        assert len(dan_msgs) == 1
        assert dan_msgs[0]["message_type"] == "design_ready"
        assert len(marco_msgs) == 1
        assert marco_msgs[0]["message_type"] == "design_complete"

    @pytest.mark.parametrize("design_type", ["mockup", "asset", "critique"])
    async def test_design_type_variants(self, mock_context, base_state, design_type):
        """All design types should be handled."""
        output = PeterDesignOutput(
            type=design_type,
            description=f"Test {design_type}",
            design_notes="Notes",
            approval_status="draft",
        )
        agent = PeterAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["design_output"]["type"] == design_type

    @pytest.mark.parametrize("status", ["draft", "review", "approved"])
    async def test_approval_status_variants(self, mock_context, base_state, status):
        """All approval statuses should propagate correctly."""
        output = PeterDesignOutput(
            type="mockup",
            description="Test",
            design_notes="Notes",
            approval_status=status,
        )
        agent = PeterAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["design_output"]["approval_status"] == status

    async def test_error_handling(self, mock_context, base_state):
        from langchain_core.runnables import RunnableLambda
        agent = PeterAgent(context=mock_context)
        agent._chain = RunnableLambda(lambda x, **k: (_ for _ in ()).throw(RuntimeError("Imagen API error")))

        result = await agent.process(base_state)
        assert "Imagen API error" in result["error"]
