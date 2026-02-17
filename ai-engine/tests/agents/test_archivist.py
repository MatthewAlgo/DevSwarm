"""
Probabilistic unit tests for Archivist Agent.
Tests knowledge base organization, entry counting, and state mutations.
"""

import pytest

from agents.archivist.agent import ArchivistAgent
from core.schemas import ArchivistKBOutput, KBEntry
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestArchivistAgent:
    """Tests for ArchivistAgent."""

    async def test_agent_metadata(self):
        agent = ArchivistAgent()
        assert agent.agent_id == "archivist"
        assert agent.name == "Archivist"
        assert agent.default_room == "Desks"

    async def test_kb_count_in_state(
        self, mock_context, state_with_research, archivist_output
    ):
        """State should track total organized entries."""
        agent = ArchivistAgent(context=mock_context)
        agent._chain = make_mock_chain(archivist_output)

        result = await agent.process(state_with_research)
        assert result["kb_entries_organized"] == 3

    async def test_notifies_orchestrator(
        self, mock_context, state_with_research, archivist_output
    ):
        """Archivist should report KB updates to Orchestrator."""
        agent = ArchivistAgent(context=mock_context)
        agent._chain = make_mock_chain(archivist_output)

        await agent.process(state_with_research)

        orchestrator_msgs = [
            m for m in mock_context.messages if m["to_agent"] == "orchestrator"
        ]
        assert len(orchestrator_msgs) == 1
        assert orchestrator_msgs[0]["message_type"] == "kb_update"

    async def test_zero_entries(self, mock_context, base_state):
        """Handle zero entries gracefully."""
        output = ArchivistKBOutput(
            entries_organized=0, entries=[], summary="Nothing to organize"
        )
        agent = ArchivistAgent(context=mock_context)
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
        output = ArchivistKBOutput(
            entries_organized=n_entries, entries=entries, summary="Done"
        )
        agent = ArchivistAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["kb_entries_organized"] == n_entries

    @pytest.mark.parametrize("category", ["research", "content", "devops", "general"])
    async def test_category_variants(self, mock_context, base_state, category):
        """KB entries should support all category types."""
        output = ArchivistKBOutput(
            entries_organized=1,
            entries=[KBEntry(document_title="Test", category=category)],
            summary=f"Organized 1 {category} entry",
        )
        agent = ArchivistAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["kb_entries_organized"] == 1
