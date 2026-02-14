"""
Ariani — Knowledge Base Organizer Agent
Maintains persistent state of completed work. Converts unstructured
conversational memory into structured Markdown documentation.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import ArianiKBOutput
from core.state import OfficeState
from agents.ariani.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.ariani")


class ArianiAgent(BaseAgent):
    """Knowledge base organizer that structures and archives agent outputs."""

    agent_id = "ariani"
    name = "Ariani"
    role = "KB Organizer"
    default_room = "Desks"
    output_schema = ArianiKBOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: ArianiKBOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Organize knowledge and notify Marco."""
        await context.update_agent(
            self.agent_id,
            current_task="Organizing knowledge base",
            thought_chain=f"Organizing {parsed.entries_organized} entries. {parsed.summary}",
        )

        await context.create_message(
            from_agent=self.agent_id,
            to_agent="marco",
            content=f"Knowledge base updated: {parsed.entries_organized} new entries archived and categorized.",
            message_type="kb_update",
        )

        state["kb_entries_organized"] = parsed.entries_organized
        return state


agent = ArianiAgent()
