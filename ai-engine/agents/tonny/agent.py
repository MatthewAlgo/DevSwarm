"""
Tonny — Comms Interface Agent
Sole ingestion point for inbound human requests and egress point for automated communications.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import TonnyCommsOutput
from core.state import OfficeState
from agents.tonny.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.tonny")


class TonnyAgent(BaseAgent):
    """Communications interface that handles inbound/outbound messages."""

    agent_id = "tonny"
    name = "Tonny"
    role = "Comms Interface"
    default_room = "Desks"
    output_schema = TonnyCommsOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: TonnyCommsOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Process communications and escalate high-priority items."""
        await context.update_agent(
            self.agent_id,
            current_task="Processing inbound communications",
            thought_chain=f"Processing {len(parsed.processed)} messages. {len(parsed.escalations)} escalations.",
        )

        # Escalate items to Marco
        for escalation in parsed.escalations:
            await context.create_message(
                from_agent=self.agent_id,
                to_agent="marco",
                content=f"Escalation: {escalation}",
                message_type="escalation",
            )

        state["comms_processed"] = len(parsed.processed)
        return state


agent = TonnyAgent()
