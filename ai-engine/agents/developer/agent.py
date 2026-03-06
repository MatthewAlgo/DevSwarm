"""
Developer Agent — Implements coding and implementation logic.
"""

from __future__ import annotations

import logging
from langchain_core.prompts import ChatPromptTemplate

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import DeveloperOutput
from core.state import OfficeState
from agents.developer.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.developer")


class DeveloperAgent(BaseAgent[DeveloperOutput]):
    """Software Developer agent that writes code."""

    agent_id = "developer"
    name = "Developer"
    role = "Software Engineer"
    default_room = "Desks"
    output_schema = DeveloperOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: DeveloperOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Report coding progress and notify Reviewer."""
        
        await context.update_agent(
            self.agent_id,
            current_task=f"Implementing: {parsed.implementation_plan[:50]}...",
            thought_chain=parsed.thought_process,
        )

        if parsed.ready_for_review:
            # Share draft with Reviewer
            await context.create_message(
                from_agent=self.agent_id,
                to_agent="reviewer",
                content=f"Code ready for review: {parsed.implementation_plan}",
                message_type="delegation",
            )
            
            # Store in content drafts for reviewer to see
            state["content_drafts"].append({
                "developer": self.agent_id,
                "plan": parsed.implementation_plan,
                "changes": [c.model_dump() for c in parsed.changes]
            })

        return state


agent = DeveloperAgent()
