"""
Dan — Viral Engineer Agent
Consumes research from Mona Lisa to generate external-facing content
optimized for algorithmic engagement metrics.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import ViralContentOutput
from core.state import OfficeState
from agents.viral_engineer.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.viral_engineer")


class ViralEngineerAgent(BaseAgent[ViralContentOutput]):
    """Viral engineer that creates engaging content from research."""

    agent_id = "viral_engineer"
    name = "Viral Engineer"
    role = "Viral Engineer"
    default_room = "Lounge"
    output_schema = ViralContentOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: ViralContentOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Create content drafts and notify Orchestrator."""
        await context.update_agent(
            self.agent_id,
            current_task="Creating viral content",
            thought_chain=f"Created {len(parsed.drafts)} content drafts for '{parsed.topic}'.",
        )

        # Notify Orchestrator about content readiness
        await context.create_message(
            from_agent=self.agent_id,
            to_agent="orchestrator",
            content=f"Content ready: {len(parsed.drafts)} drafts for review on topic '{parsed.topic}'",
            message_type="content_ready",
        )

        state["content_drafts"] = [d.model_dump() for d in parsed.drafts]
        return state


agent = ViralEngineerAgent()
