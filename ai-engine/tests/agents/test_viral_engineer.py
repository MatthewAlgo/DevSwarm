"""
Probabilistic unit tests for Viral Engineer Agent.
Tests content creation, engagement predictions, and state mutations.
"""

import pytest

from agents.viral_engineer.agent import ViralEngineerAgent
from core.schemas import ViralContentOutput, ContentDraft
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestViralEngineerAgent:
    """Tests for ViralEngineerAgent."""

    async def test_agent_metadata(self):
        agent = ViralEngineerAgent()
        assert agent.agent_id == "viral_engineer"
        assert agent.name == "Viral Engineer"
        assert agent.default_room == "Lounge"

    async def test_content_stored_in_state(
        self, mock_context, state_with_research, viral_engineer_output
    ):
        """Content drafts should be stored in state."""
        agent = ViralEngineerAgent(context=mock_context)
        agent._chain = make_mock_chain(viral_engineer_output)

        result = await agent.process(state_with_research)

        assert len(result["content_drafts"]) == 1
        assert result["content_drafts"][0]["platform"] == "twitter"

    async def test_notifies_orchestrator(
        self, mock_context, state_with_research, viral_engineer_output
    ):
        """Viral Engineer should notify Orchestrator when content is ready."""
        agent = ViralEngineerAgent(context=mock_context)
        agent._chain = make_mock_chain(viral_engineer_output)

        await agent.process(state_with_research)

        orchestrator_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "orchestrator"
        ]
        assert len(orchestrator_msgs) == 1
        assert orchestrator_msgs[0]["message_type"] == "content_ready"

    async def test_empty_drafts(self, mock_context, state_with_research):
        """Handle case where LLM produces no drafts."""
        output = ViralContentOutput(
            topic="Test", drafts=[], sentiment_analysis="Neutral"
        )
        agent = ViralEngineerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(state_with_research)
        assert result["content_drafts"] == []

    @pytest.mark.parametrize("platform", ["twitter", "linkedin", "blog"])
    async def test_platform_variety(self, mock_context, state_with_research, platform):
        """Content should work for any platform."""
        output = ViralContentOutput(
            topic="AI Testing",
            drafts=[
                ContentDraft(
                    platform=platform,
                    content=f"Testing {platform} content",
                    engagement_prediction="medium",
                )
            ],
        )
        agent = ViralEngineerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(state_with_research)
        assert result["content_drafts"][0]["platform"] == platform

    @pytest.mark.parametrize("n_drafts", [1, 3, 5])
    async def test_scales_with_draft_count(
        self, mock_context, state_with_research, n_drafts
    ):
        """State should contain all generated drafts."""
        drafts = [
            ContentDraft(
                platform="twitter",
                content=f"Draft {i}",
                engagement_prediction="medium",
            )
            for i in range(n_drafts)
        ]
        output = ViralContentOutput(topic="Test", drafts=drafts)
        agent = ViralEngineerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(state_with_research)
        assert len(result["content_drafts"]) == n_drafts
