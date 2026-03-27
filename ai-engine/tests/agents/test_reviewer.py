"""
Unit tests for Reviewer Agent.
Tests review verdict processing, looping logic, and notifications.
"""

import pytest
from agents.reviewer.agent import ReviewerAgent
from core.schemas import ReviewerOutput, ReviewComment
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestReviewerAgent:
    """Tests for ReviewerAgent."""

    async def test_agent_metadata(self):
        agent = ReviewerAgent()
        assert agent.agent_id == "reviewer"
        assert agent.name == "Reviewer"
        assert agent.default_room == "War Room"

    async def test_approval_notifies_orchestrator(self, mock_context, base_state):
        """Reviewer should notify Orchestrator when code is approved."""
        output = ReviewerOutput(
            thought_process="Code looks great",
            overall_verdict="approved",
            summary="Approved with no issues",
            comments=[],
            loop_back_to_developer=False
        )
        agent = ReviewerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)

        orchestrator_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "orchestrator"
        ]
        assert len(orchestrator_msgs) == 1
        assert orchestrator_msgs[0]["message_type"] == "knowledge"

    async def test_rejection_loops_back_to_developer(self, mock_context, base_state):
        """Reviewer should notify Developer and set error state when changes are requested."""
        output = ReviewerOutput(
            thought_process="Found some bugs",
            overall_verdict="request_changes",
            summary="Bugs found in prime logic",
            comments=[
                ReviewComment(file_path="prime.py", severity="critical", comment="Wrong math")
            ],
            loop_back_to_developer=True
        )
        agent = ReviewerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)

        dev_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "developer"
        ]
        assert len(dev_msgs) == 1
        assert dev_msgs[0]["message_type"] == "delegation"
        assert "Review failed" in result["error"]

    async def test_security_rejection_loops_back_to_developer(self, mock_context, base_state):
        """Reviewer should loop back to developer when security vulnerabilities are found."""
        output = ReviewerOutput(
            thought_process="High-risk security vulnerability found.",
            overall_verdict="request_changes",
            summary="SQL Injection vulnerability detected in query construction.",
            comments=[
                ReviewComment(file_path="db.py", severity="critical", comment="SQL Injection: User input directly interpolated into query.")
            ],
            loop_back_to_developer=True
        )
        agent = ReviewerAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)

        dev_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "developer"
        ]
        assert len(dev_msgs) == 1
        assert dev_msgs[0]["message_type"] == "delegation"
        assert "Review failed" in result["error"]
        assert "SQL Injection" in result["error"]
