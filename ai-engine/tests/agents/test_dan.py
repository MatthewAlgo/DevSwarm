"""
Probabilistic unit tests for Dan — Viral Engineer Agent.
Tests content creation, engagement predictions, and state mutations.
"""

import pytest

from agents.dan.agent import DanAgent
from core.context import MockContext
from core.state import create_initial_state
from core.schemas import DanContentOutput, ContentDraft
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestDanAgent:
    """Tests for DanAgent."""

    async def test_agent_metadata(self):
        agent = DanAgent()
        assert agent.agent_id == "dan"
        assert agent.name == "Dan"
        assert agent.default_room == "Lounge"

    async def test_content_stored_in_state(self, mock_context, state_with_research, dan_output):
        """Content drafts should be stored in state."""
        agent = DanAgent(context=mock_context)
        agent._chain = make_mock_chain(dan_output)

        result = await agent.process(state_with_research)

        assert len(result["content_drafts"]) == 1
        assert result["content_drafts"][0]["platform"] == "twitter"

    async def test_notifies_marco(self, mock_context, state_with_research, dan_output):
        """Dan should notify Marco when content is ready."""
        agent = DanAgent(context=mock_context)
        agent._chain = make_mock_chain(dan_output)

        await agent.process(state_with_research)

        marco_msgs = [m for m in mock_context.messages if m["to_agent"] == "marco"]
        assert len(marco_msgs) == 1
        assert marco_msgs[0]["message_type"] == "content_ready"

    async def test_empty_drafts(self, mock_context, state_with_research):
        """Handle case where LLM produces no drafts."""
        output = DanContentOutput(topic="Test", drafts=[], sentiment_analysis="Neutral")
        agent = DanAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(state_with_research)
        assert result["content_drafts"] == []

    @pytest.mark.parametrize("platform", ["twitter", "linkedin", "blog"])
    async def test_platform_variety(self, mock_context, state_with_research, platform):
        """Content should work for any platform."""
        output = DanContentOutput(
            topic="AI Testing",
            drafts=[ContentDraft(
                platform=platform,
                content=f"Testing {platform} content",
                engagement_prediction="medium",
            )],
        )
        agent = DanAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(state_with_research)
        assert result["content_drafts"][0]["platform"] == platform

    @pytest.mark.parametrize("n_drafts", [1, 3, 5])
    async def test_scales_with_draft_count(self, mock_context, state_with_research, n_drafts):
        """State should contain all generated drafts."""
        drafts = [
            ContentDraft(
                platform="twitter",
                content=f"Draft {i}",
                engagement_prediction="medium",
            )
            for i in range(n_drafts)
        ]
        output = DanContentOutput(topic="Test", drafts=drafts)
        agent = DanAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(state_with_research)
        assert len(result["content_drafts"]) == n_drafts
