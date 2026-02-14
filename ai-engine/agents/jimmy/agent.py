"""
Jimmy — Content Crawler Agent
Autonomous temporal loop agent. Searches the web, scrapes URLs, and
summarizes content to populate the shared knowledge base.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import JimmyCrawlOutput
from core.state import OfficeState
from agents.jimmy.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.jimmy")


class JimmyAgent(BaseAgent):
    """Content crawler that searches the web for trending topics."""

    agent_id = "jimmy"
    name = "Jimmy"
    role = "Content Crawler"
    default_room = "Desks"
    output_schema = JimmyCrawlOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: JimmyCrawlOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Report crawl findings to Ariani for KB archival."""
        await context.update_agent(
            self.agent_id,
            current_task="Crawling web for trending content",
            thought_chain=f"Found {len(parsed.findings)} trending topics. Summarizing findings.",
        )

        # Share findings with Ariani
        for finding in parsed.findings:
            await context.create_message(
                from_agent=self.agent_id,
                to_agent="ariani",
                content=f"New finding: {finding.topic} - {finding.summary}",
                message_type="knowledge",
            )

        await context.update_agent(
            self.agent_id,
            thought_chain=f"Crawl cycle complete. Found {len(parsed.findings)} items.",
        )

        state["crawl_results"] = [f.model_dump() for f in parsed.findings]
        return state


agent = JimmyAgent()
