"""
Archivist — Knowledge Base Organizer Agent
Maintains persistent state of completed work. Converts unstructured
conversational memory into structured Markdown documentation.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import ArchivistKBOutput
from core.state import OfficeState
from agents.archivist.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.archivist")


class ArchivistAgent(BaseAgent[ArchivistKBOutput]):
    """Knowledge base organizer that structures and archives agent outputs."""

    agent_id = "archivist"
    name = "Archivist"
    role = "KB Organizer"
    default_room = "Desks"
    output_schema = ArchivistKBOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: ArchivistKBOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Organize knowledge and notify Orchestrator."""
        await context.update_agent(
            self.agent_id,
            current_task="Organizing knowledge base",
            thought_chain=f"Organizing {parsed.entries_organized} entries. {parsed.summary}",
        )

        await context.create_message(
            from_agent=self.agent_id,
            to_agent="orchestrator",
            content=f"Knowledge base updated: {parsed.entries_organized} new entries archived and categorized.",
            message_type="kb_update",
        )

        state["kb_entries_organized"] = parsed.entries_organized
        return state


agent = ArchivistAgent()
