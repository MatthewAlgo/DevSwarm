"""
Reviewer Agent — Implements code review and feedback loops.
"""

from __future__ import annotations

import logging
from langchain_core.prompts import ChatPromptTemplate

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import ReviewerOutput
from core.state import OfficeState
from agents.reviewer.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.reviewer")


class ReviewerAgent(BaseAgent[ReviewerOutput]):
    """Code Reviewer agent that checks developer work."""

    agent_id = "reviewer"
    name = "Reviewer"
    role = "Code Quality Lead"
    default_room = "War Room"
    output_schema = ReviewerOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: ReviewerOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Report review results and potentially loop back to Developer."""
        
        await context.update_agent(
            self.agent_id,
            current_task=f"Reviewing code: {parsed.overall_verdict}",
            thought_chain=parsed.thought_process,
        )

        if parsed.loop_back_to_developer:
            # Notify Developer
            await context.create_message(
                from_agent=self.agent_id,
                to_agent="developer",
                content=f"Changes requested: {parsed.summary}",
                message_type="delegation",
            )
            # Record error in state to trigger re-run of developer if needed
            state["error"] = f"Review failed: {parsed.summary}"
        else:
            # Approval
            await context.create_message(
                from_agent=self.agent_id,
                to_agent="orchestrator",
                content=f"Code approved: {parsed.summary}",
                message_type="knowledge",
            )

        return state


agent = ReviewerAgent()
