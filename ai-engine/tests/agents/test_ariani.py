"""
Probabilistic unit tests for Ariani — KB Organizer Agent.
Tests knowledge base organization, entry counting, and state mutations.
"""

import pytest

from agents.ariani.agent import ArianiAgent
from core.context import MockContext
from core.state import create_initial_state
from core.schemas import ArianiKBOutput, KBEntry
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestArianiAgent:
    """Tests for ArianiAgent."""

    async def test_agent_metadata(self):
        agent = ArianiAgent()
        assert agent.agent_id == "ariani"
        assert agent.name == "Ariani"
        assert agent.default_room == "Desks"

    async def test_kb_count_in_state(self, mock_context, state_with_research, ariani_output):
        """State should track total organized entries."""
        agent = ArianiAgent(context=mock_context)
        agent._chain = make_mock_chain(ariani_output)

        result = await agent.process(state_with_research)
        assert result["kb_entries_organized"] == 3

    async def test_notifies_marco(self, mock_context, state_with_research, ariani_output):
        """Ariani should report KB updates to Marco."""
        agent = ArianiAgent(context=mock_context)
        agent._chain = make_mock_chain(ariani_output)

        await agent.process(state_with_research)

        marco_msgs = [m for m in mock_context.messages if m["to_agent"] == "marco"]
        assert len(marco_msgs) == 1
        assert marco_msgs[0]["message_type"] == "kb_update"

    async def test_zero_entries(self, mock_context, base_state):
        """Handle zero entries gracefully."""
        output = ArianiKBOutput(entries_organized=0, entries=[], summary="Nothing to organize")
        agent = ArianiAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["kb_entries_organized"] == 0

    @pytest.mark.parametrize("n_entries", [1, 5, 10, 20])
    async def test_entry_count_scaling(self, mock_context, base_state, n_entries):
        """KB entries organized should match output."""
        entries = [
            KBEntry(document_title=f"Doc {i}", category="research", tags=[f"tag{i}"])
            for i in range(n_entries)
        ]
        output = ArianiKBOutput(entries_organized=n_entries, entries=entries, summary="Done")
        agent = ArianiAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["kb_entries_organized"] == n_entries

    @pytest.mark.parametrize("category", ["research", "content", "devops", "general"])
    async def test_category_variants(self, mock_context, base_state, category):
        """KB entries should support all category types."""
        output = ArianiKBOutput(
            entries_organized=1,
            entries=[KBEntry(document_title="Test", category=category)],
            summary=f"Organized 1 {category} entry",
        )
        agent = ArianiAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["kb_entries_organized"] == 1
