"""
Probabilistic unit tests for Mona Lisa — Deep Researcher Agent.
Tests research output, cross-agent messaging, and state mutations.
"""

import pytest

from agents.mona.agent import MonaAgent
from core.context import MockContext
from core.state import create_initial_state
from core.schemas import MonaResearchOutput
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestMonaAgent:
    """Tests for MonaAgent."""

    async def test_agent_metadata(self):
        agent = MonaAgent()
        assert agent.agent_id == "mona"
        assert agent.name == "Mona Lisa"
        assert agent.default_room == "War Room"

    async def test_research_stored_in_state(self, mock_context, base_state, mona_output):
        """Research findings should be stored in state."""
        agent = MonaAgent(context=mock_context)
        agent._chain = make_mock_chain(mona_output)

        result = await agent.process(base_state)

        assert "title" in result["research_findings"]
        assert result["research_findings"]["title"] == "AI Agent Architecture Analysis"
        assert result["research_findings"]["confidence_level"] == "high"

    async def test_messages_sent_to_dan_and_ariani(self, mock_context, base_state, mona_output):
        """Research results should be shared with Dan and Ariani."""
        agent = MonaAgent(context=mock_context)
        agent._chain = make_mock_chain(mona_output)

        await agent.process(base_state)

        dan_msgs = [m for m in mock_context.messages if m["to_agent"] == "dan"]
        ariani_msgs = [m for m in mock_context.messages if m["to_agent"] == "ariani"]
        assert len(dan_msgs) == 1
        assert dan_msgs[0]["message_type"] == "research_complete"
        assert len(ariani_msgs) == 1
        assert ariani_msgs[0]["message_type"] == "knowledge"

    async def test_status_transitions(self, mock_context, base_state, mona_output):
        agent = MonaAgent(context=mock_context)
        agent._chain = make_mock_chain(mona_output)

        await agent.process(base_state)

        statuses = [u["status"] for u in mock_context.updates if u["agent_id"] == "mona" and u["status"]]
        assert "Working" in statuses
        assert statuses[-1] == "Idle"

    async def test_error_handling(self, mock_context, base_state):
        from langchain_core.runnables import RunnableLambda
        agent = MonaAgent(context=mock_context)
        agent._chain = RunnableLambda(lambda x, **k: (_ for _ in ()).throw(RuntimeError("Context window exceeded")))

        result = await agent.process(base_state)
        assert "Context window exceeded" in result["error"]

    @pytest.mark.parametrize("confidence", ["high", "medium", "low"])
    async def test_confidence_levels(self, mock_context, base_state, confidence):
        """Output should preserve confidence level."""
        output = MonaResearchOutput(
            title="Test Report",
            executive_summary="Summary",
            key_findings=["Finding 1"],
            confidence_level=confidence,
        )
        agent = MonaAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["research_findings"]["confidence_level"] == confidence
