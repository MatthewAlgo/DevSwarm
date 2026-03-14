"""
Comms — Comms Interface Agent
Sole ingestion point for inbound human requests and egress point for automated communications.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import CommsOutput
from core.state import OfficeState
from agents.comms.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.comms")


class CommsAgent(BaseAgent[CommsOutput]):
    """Communications interface that handles inbound/outbound messages."""

    agent_id = "comms"
    name = "Comms"
    role = "Comms Interface"
    default_room = "Desks"
    output_schema = CommsOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: CommsOutput,
        context: AgentContext,
    ) -> dict:
        """Process communications and escalate high-priority items."""
        await self.update_status(
            current_task="Processing inbound communications",
            thought_chain=f"Processing {len(parsed.processed)} messages. {len(parsed.escalations)} escalations.",
        )

        # Escalate items to Orchestrator
        for escalation in parsed.escalations:
            await self.broadcast_message(
            to_agent="orchestrator",
                content=f"Escalation: {escalation}",
                message_type="escalation",
            )

        return {"comms_processed": len(parsed.processed)}


agent = CommsAgent()
