"""
Probabilistic unit tests for Researcher Agent.
Tests research output, cross-agent messaging, and state mutations.
"""

import pytest

from agents.researcher.agent import ResearcherAgent
from core.schemas import ResearcherOutput
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestResearcherAgent:
    """Tests for ResearcherAgent."""

    async def test_agent_metadata(self):
        agent = ResearcherAgent()
        assert agent.agent_id == "researcher"
        assert agent.name == "Researcher"
        assert agent.default_room == "War Room"

    async def test_research_stored_in_state(
        self, mock_context, base_state, researcher_output
    ):
        """Research findings should be stored in state."""
        agent = ResearcherAgent(context=mock_context)
        agent._chain = make_mock_chain(researcher_output)

        result = await agent.process(base_state)

        assert "title" in result["research_findings"]
        assert result["research_findings"]["title"] == "AI Agent Architecture Analysis"
        assert result["research_findings"]["confidence_level"] == "high"

    async def test_messages_sent_to_viral_engineer_and_archivist(
        self, mock_context, base_state, researcher_output
    ):
        """Research results should be shared with Viral Engineer and Archivist."""
        agent = ResearcherAgent(context=mock_context)
        agent._chain = make_mock_chain(researcher_output)

        await agent.process(base_state)

        viral_engineer_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "viral_engineer"
        ]
        archivist_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "archivist"
        ]
        assert len(viral_engineer_msgs) == 1
        assert viral_engineer_msgs[0]["message_type"] == "research_complete"
        assert len(archivist_msgs) == 1
        assert archivist_msgs[0]["message_type"] == "knowledge"

    async def test_status_transitions(
        self, mock_context, base_state, researcher_output
    ):
        agent = ResearcherAgent(context=mock_context)
        agent._chain = make_mock_chain(researcher_output)

        await agent.process(base_state)

        statuses = [
            u["status"]
            for u in mock_context.updates
            if u["agent_id"] == "researcher" and u["status"]
        ]
        assert "Working" in statuses
        assert statuses[-1] == "Idle"

    async def test_error_handling(self, mock_context, base_state):
        from langchain_core.runnables import RunnableLambda

        agent = ResearcherAgent(context=mock_context)
        agent._chain = RunnableLambda(
            lambda x, **k: (_ for _ in ()).throw(
                RuntimeError("Context window exceeded")
            )
        )

        result = await agent.process(base_state)
        assert "Context window exceeded" in result["error"]

    @pytest.mark.parametrize("confidence", ["high", "medium", "low"])
    async def test_confidence_levels(self, mock_context, base_state, confidence):
        """Output should preserve confidence level."""
        output = ResearcherOutput(
            title="Test Report",
            executive_summary="Summary",
            key_findings=["Finding 1"],
            confidence_level=confidence,
        )
        agent = ResearcherAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["research_findings"]["confidence_level"] == confidence
