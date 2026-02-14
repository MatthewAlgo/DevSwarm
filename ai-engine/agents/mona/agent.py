"""
Mona Lisa — Deep Researcher Agent
Activated by Marco. Synthesizes exhaustive academic and competitive analysis reports.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import MonaResearchOutput
from core.state import OfficeState
from agents.mona.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.mona")


class MonaAgent(BaseAgent):
    """Deep researcher that produces academic-grade research reports."""

    agent_id = "mona"
    name = "Mona Lisa"
    role = "Deep Researcher"
    default_room = "War Room"
    output_schema = MonaResearchOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: MonaResearchOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Share research findings with Dan and Ariani."""
        await context.update_agent(
            self.agent_id,
            current_task="Deep research in progress",
            thought_chain=f"Synthesizing report: {parsed.title}",
        )

        # Share with Dan for content creation
        await context.create_message(
            from_agent=self.agent_id,
            to_agent="dan",
            content=f"Research complete: {parsed.title}. Key findings available for content creation.",
            message_type="research_complete",
        )

        # Share with Ariani for KB
        await context.create_message(
            from_agent=self.agent_id,
            to_agent="ariani",
            content=f"New research report: {parsed.title}",
            message_type="knowledge",
        )

        state["research_findings"] = parsed.model_dump()
        return state


agent = MonaAgent()
