"""
Peter — Frontend Designer Agent
Interacts with multimodal APIs to generate, critique, and refine graphical assets.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import FrontendDesignOutput
from core.state import OfficeState
from agents.frontend_designer.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.frontend_designer")


class FrontendDesignerAgent(BaseAgent[FrontendDesignOutput]):
    """Frontend designer that creates and critiques visual designs."""

    agent_id = "frontend_designer"
    name = "Frontend Designer"
    role = "Frontend Designer"
    default_room = "Desks"
    output_schema = FrontendDesignOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: FrontendDesignOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Share design output with Viral Engineer and Orchestrator."""
        await context.update_agent(
            self.agent_id,
            current_task="Creating visual designs",
            thought_chain=f"Design '{parsed.description}' — {parsed.approval_status}.",
        )

        # Send to Viral Engineer for content integration
        await context.create_message(
            from_agent=self.agent_id,
            to_agent="viral_engineer",
            content=f"Design ready: {parsed.description}",
            message_type="design_ready",
        )

        # Notify Orchestrator
        await context.create_message(
            from_agent=self.agent_id,
            to_agent="orchestrator",
            content=f"Design draft complete: {parsed.description}. Ready for review.",
            message_type="design_complete",
        )

        state["design_output"] = parsed.model_dump()
        return state


agent = FrontendDesignerAgent()
