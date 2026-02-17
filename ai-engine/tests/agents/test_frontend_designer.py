"""
Probabilistic unit tests for Frontend Designer Agent.
Tests design output, cross-agent messaging, and state mutations.
"""

import pytest

from agents.frontend_designer.agent import FrontendDesignerAgent
from core.schemas import FrontendDesignOutput
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestFrontendDesignerAgent:
    """Tests for FrontendDesignerAgent."""

    async def test_agent_metadata(self):
        agent = FrontendDesignerAgent()
        assert agent.agent_id == "frontend_designer"
        assert agent.name == "Frontend Designer"
        assert agent.default_room == "Desks"

    async def test_design_stored_in_state(
        self, mock_context, base_state, frontend_designer_output
    ):
        """Design output should be stored in state."""
        agent = FrontendDesignerAgent(context=mock_context)
        agent._chain = make_mock_chain(frontend_designer_output)

        result = await agent.process(base_state)

        assert "design_output" in result
        assert result["design_output"]["type"] == "mockup"
        assert result["design_output"]["approval_status"] == "draft"

    async def test_messages_to_viral_engineer_and_orchestrator(
        self, mock_context, base_state, frontend_designer_output
    ):
        """Frontend Designer should notify Viral Engineer and Orchestrator about the design."""
        agent = FrontendDesignerAgent(context=mock_context)
        agent._chain = make_mock_chain(frontend_designer_output)

        await agent.process(base_state)

        viral_engineer_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "viral_engineer"
        ]
        orchestrator_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "orchestrator"
        ]
        assert len(viral_engineer_msgs) == 1
        assert viral_engineer_msgs[0]["message_type"] == "design_ready"
        assert len(orchestrator_msgs) == 1
        assert orchestrator_msgs[0]["message_type"] == "design_complete"

    @pytest.mark.parametrize("design_type", ["mockup", "asset", "critique"])
    async def test_design_type_variants(self, mock_context, base_state, design_type):
        """All design types should be handled."""
        output = FrontendDesignOutput(
            type=design_type,
            description=f"Test {design_type}",
            design_notes="Notes",
            approval_status="draft",
        )
        agent = FrontendDesignerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["design_output"]["type"] == design_type

    @pytest.mark.parametrize("status", ["draft", "review", "approved"])
    async def test_approval_status_variants(self, mock_context, base_state, status):
        """All approval statuses should propagate correctly."""
        output = FrontendDesignOutput(
            type="mockup",
            description="Test",
            design_notes="Notes",
            approval_status=status,
        )
        agent = FrontendDesignerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["design_output"]["approval_status"] == status

    async def test_error_handling(self, mock_context, base_state):
        from langchain_core.runnables import RunnableLambda

        agent = FrontendDesignerAgent(context=mock_context)
        agent._chain = RunnableLambda(
            lambda x, **k: (_ for _ in ()).throw(RuntimeError("Imagen API error"))
        )

        result = await agent.process(base_state)
        assert "Imagen API error" in result["error"]
