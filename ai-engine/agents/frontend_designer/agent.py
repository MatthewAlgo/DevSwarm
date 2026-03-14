"""
Frontend Designer — Frontend Designer Agent
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
    ) -> dict:
        """Share design output with Viral Engineer and Orchestrator."""
        await self.update_status(
            current_task="Creating visual designs",
            thought_chain=f"Design '{parsed.description}' — {parsed.approval_status}.",
        )

        # Send to Viral Engineer for content integration
        await self.broadcast_message(
            to_agent="viral_engineer",
            content=f"Design ready: {parsed.description}",
            message_type="design_ready",
        )

        # Notify Orchestrator
        await self.broadcast_message(
            to_agent="orchestrator",
            content=f"Design draft complete: {parsed.description}. Ready for review.",
            message_type="design_complete",
        )

        return {"design_output": parsed.model_dump()}


agent = FrontendDesignerAgent()
