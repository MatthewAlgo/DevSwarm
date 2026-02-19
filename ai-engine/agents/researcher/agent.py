"""
Researcher — Deep Researcher Agent
Activated by Orchestrator. Synthesizes exhaustive academic and competitive analysis reports.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import ResearcherOutput
from core.state import OfficeState
from agents.researcher.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.researcher")


class ResearcherAgent(BaseAgent[ResearcherOutput]):
    """Deep researcher that produces academic-grade research reports."""

    agent_id = "researcher"
    name = "Researcher"
    role = "Deep Researcher"
    default_room = "War Room"
    output_schema = ResearcherOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: ResearcherOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Share research findings with Viral Engineer and Archivist."""
        await context.update_agent(
            self.agent_id,
            current_task="Deep research in progress",
            thought_chain=f"Synthesizing report: {parsed.title}",
        )

        # Share with Viral Engineer for content creation
        await context.create_message(
            from_agent=self.agent_id,
            to_agent="viral_engineer",
            content=f"Research complete: {parsed.title}. Key findings available for content creation.",
            message_type="research_complete",
        )

        # Share with Archivist for KB
        await context.create_message(
            from_agent=self.agent_id,
            to_agent="archivist",
            content=f"New research report: {parsed.title}",
            message_type="knowledge",
        )

        state["research_findings"] = parsed.model_dump()
        return state


agent = ResearcherAgent()
