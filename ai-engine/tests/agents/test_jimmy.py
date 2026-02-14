"""
Probabilistic unit tests for Jimmy — Content Crawler Agent.
Tests crawl output processing, message routing, and state mutations.
"""

import pytest

from agents.jimmy.agent import JimmyAgent
from core.context import MockContext
from core.state import create_initial_state
from core.schemas import JimmyCrawlOutput, CrawlFinding
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestJimmyAgent:
    """Tests for JimmyAgent."""

    async def test_agent_metadata(self):
        agent = JimmyAgent()
        assert agent.agent_id == "jimmy"
        assert agent.name == "Jimmy"
        assert agent.default_room == "Desks"

    async def test_crawl_results_stored_in_state(self, mock_context, base_state, jimmy_output):
        """Crawl findings should be stored in state['crawl_results']."""
        agent = JimmyAgent(context=mock_context)
        agent._chain = make_mock_chain(jimmy_output)

        result = await agent.process(base_state)

        assert len(result["crawl_results"]) == 2
        assert result["crawl_results"][0]["topic"] == "AI Agent Frameworks"

    async def test_findings_sent_to_ariani(self, mock_context, base_state, jimmy_output):
        """Each finding should be sent as a message to Ariani for KB archival."""
        agent = JimmyAgent(context=mock_context)
        agent._chain = make_mock_chain(jimmy_output)

        await agent.process(base_state)

        ariani_msgs = [m for m in mock_context.messages if m["to_agent"] == "ariani"]
        assert len(ariani_msgs) == 2
        assert all(m["message_type"] == "knowledge" for m in ariani_msgs)

    async def test_status_lifecycle(self, mock_context, base_state, jimmy_output):
        """Should go Working → Idle."""
        agent = JimmyAgent(context=mock_context)
        agent._chain = make_mock_chain(jimmy_output)

        await agent.process(base_state)

        statuses = [u["status"] for u in mock_context.updates if u["agent_id"] == "jimmy" and u["status"]]
        assert "Working" in statuses
        assert statuses[-1] == "Idle"

    async def test_empty_crawl(self, mock_context, base_state):
        """Agent should handle empty crawl results gracefully."""
        output = JimmyCrawlOutput(findings=[], next_crawl_focus="")
        agent = JimmyAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["crawl_results"] == []
        assert len(mock_context.messages) == 0  # No messages sent for empty findings

    async def test_error_sets_state(self, mock_context, base_state):
        """Chain errors should be caught and written to state."""
        from langchain_core.runnables import RunnableLambda

        agent = JimmyAgent(context=mock_context)
        agent._chain = RunnableLambda(lambda x, **k: (_ for _ in ()).throw(RuntimeError("Network timeout")))

        result = await agent.process(base_state)
        assert "Network timeout" in result["error"]

    @pytest.mark.parametrize("n_findings", [1, 5, 10])
    async def test_scales_with_finding_count(self, mock_context, base_state, n_findings):
        """Message count should match finding count."""
        findings = [
            CrawlFinding(topic=f"Topic {i}", summary=f"Summary {i}", relevance_score=i + 1)
            for i in range(n_findings)
        ]
        output = JimmyCrawlOutput(findings=findings, next_crawl_focus="")
        agent = JimmyAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)
        ariani_msgs = [m for m in mock_context.messages if m["to_agent"] == "ariani"]
        assert len(ariani_msgs) == n_findings
