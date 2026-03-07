"""
Unit tests for Developer Agent.
Tests code change processing, reviewer notification, and state mutations.
"""

import pytest
from agents.developer.agent import DeveloperAgent
from core.schemas import DeveloperOutput, CodeChange
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestDeveloperAgent:
    """Tests for DeveloperAgent."""

    async def test_agent_metadata(self):
        agent = DeveloperAgent()
        assert agent.agent_id == "developer"
        assert agent.name == "Developer"
        assert agent.default_room == "Desks"

    async def test_code_changes_stored_in_state(self, mock_context, base_state):
        """Code changes should be stored in state['content_drafts']."""
        output = DeveloperOutput(
            thought_process="Implementing prime calculation",
            implementation_plan="Write a python script",
            changes=[
                CodeChange(file_path="prime.py", action="create", description="Add prime logic", code_snippet="def is_prime(n): ...")
            ],
            ready_for_review=True
        )
        agent = DeveloperAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)

        assert len(result["content_drafts"]) == 1
        assert result["content_drafts"][0]["developer"] == "developer"
        assert len(result["content_drafts"][0]["changes"]) == 1

    async def test_notifies_reviewer(self, mock_context, base_state):
        """Developer should notify Reviewer when code is ready."""
        output = DeveloperOutput(
            thought_process="Code complete",
            implementation_plan="Feature X",
            changes=[],
            ready_for_review=True
        )
        agent = DeveloperAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)

        reviewer_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "reviewer"
        ]
        assert len(reviewer_msgs) == 1
        assert reviewer_msgs[0]["message_type"] == "delegation"

    async def test_not_ready_for_review_no_message(self, mock_context, base_state):
        """Developer should NOT notify Reviewer if code is not ready."""
        output = DeveloperOutput(
            thought_process="Still working",
            implementation_plan="Feature X",
            changes=[],
            ready_for_review=False
        )
        agent = DeveloperAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)

        reviewer_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "reviewer"
        ]
        assert len(reviewer_msgs) == 0
