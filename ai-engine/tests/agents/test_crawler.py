"""
Probabilistic unit tests for Crawler Agent.
Tests crawl output processing, message routing, and state mutations.
"""

import pytest

from agents.crawler.agent import CrawlerAgent
from core.schemas import CrawlerCrawlOutput, CrawlFinding
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestCrawlerAgent:
    """Tests for CrawlerAgent."""

    async def test_agent_metadata(self):
        agent = CrawlerAgent()
        assert agent.agent_id == "crawler"
        assert agent.name == "Crawler"
        assert agent.default_room == "Desks"

    async def test_crawl_results_stored_in_state(
        self, mock_context, base_state, crawler_output
    ):
        """Crawl findings should be stored in state['crawl_results']."""
        agent = CrawlerAgent(context=mock_context)
        agent._chain = make_mock_chain(crawler_output)

        result = await agent.process(base_state)

        assert len(result["crawl_results"]) == 2
        assert result["crawl_results"][0]["topic"] == "AI Agent Frameworks"

    async def test_findings_sent_to_archivist(
        self, mock_context, base_state, crawler_output
    ):
        """Each finding should be sent as a message to Archivist for KB archival."""
        agent = CrawlerAgent(context=mock_context)
        agent._chain = make_mock_chain(crawler_output)

        await agent.process(base_state)

        archivist_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "archivist"
        ]
        assert len(archivist_msgs) == 2
        assert all(m["message_type"] == "knowledge" for m in archivist_msgs)

    async def test_status_lifecycle(self, mock_context, base_state, crawler_output):
        """Should go Working → Idle."""
        agent = CrawlerAgent(context=mock_context)
        agent._chain = make_mock_chain(crawler_output)

        await agent.process(base_state)

        statuses = [
            u["status"]
            for u in mock_context.updates
            if u["agent_id"] == "crawler" and u["status"]
        ]
        assert "Working" in statuses
        assert statuses[-1] == "Idle"

    async def test_empty_crawl(self, mock_context, base_state):
        """Agent should handle empty crawl results gracefully."""
        output = CrawlerCrawlOutput(findings=[], next_crawl_focus="")
        agent = CrawlerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["crawl_results"] == []
        assert len(mock_context.messages) == 0  # No messages sent for empty findings

    async def test_error_sets_state(self, mock_context, base_state):
        """Chain errors should be caught and written to state."""
        from langchain_core.runnables import RunnableLambda

        agent = CrawlerAgent(context=mock_context)
        agent._chain = RunnableLambda(
            lambda x, **k: (_ for _ in ()).throw(RuntimeError("Network timeout"))
        )

        result = await agent.process(base_state)
        assert "Network timeout" in result["error"]

    @pytest.mark.parametrize("n_findings", [1, 5, 10])
    async def test_scales_with_finding_count(
        self, mock_context, base_state, n_findings
    ):
        """Message count should match finding count."""
        findings = [
            CrawlFinding(
                topic=f"Topic {i}", summary=f"Summary {i}", relevance_score=i + 1
            )
            for i in range(n_findings)
        ]
        output = CrawlerCrawlOutput(findings=findings, next_crawl_focus="")
        agent = CrawlerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)
        archivist_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "archivist"
        ]
        assert len(archivist_msgs) == n_findings
