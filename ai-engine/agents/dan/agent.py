"""
Dan — Viral Engineer Agent
Consumes research from Mona Lisa to generate external-facing content
optimized for algorithmic engagement metrics.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import DanContentOutput
from core.state import OfficeState
from agents.dan.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.dan")


class DanAgent(BaseAgent):
    """Viral engineer that creates engaging content from research."""

    agent_id = "dan"
    name = "Dan"
    role = "Viral Engineer"
    default_room = "Lounge"
    output_schema = DanContentOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: DanContentOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Create content drafts and notify Marco."""
        await context.update_agent(
            self.agent_id,
            current_task="Creating viral content",
            thought_chain=f"Created {len(parsed.drafts)} content drafts for '{parsed.topic}'.",
        )

        # Notify Marco about content readiness
        await context.create_message(
            from_agent=self.agent_id,
            to_agent="marco",
            content=f"Content ready: {len(parsed.drafts)} drafts for review on topic '{parsed.topic}'",
            message_type="content_ready",
        )

        state["content_drafts"] = [d.model_dump() for d in parsed.drafts]
        return state


agent = DanAgent()
