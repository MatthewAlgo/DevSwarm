"""
Bob — DevOps Monitor Agent
The swarm's immune system. Monitors health, intercepts errors, and initiates recovery.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import BobHealthOutput
from core.state import OfficeState
from agents.bob.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.bob")


class BobAgent(BaseAgent):
    """DevOps monitor that checks system health and recovers error agents."""

    agent_id = "bob"
    name = "Bob"
    role = "DevOps Monitor"
    default_room = "Server Room"
    output_schema = BobHealthOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: BobHealthOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Check for error agents and attempt recovery."""
        await context.update_agent(
            self.agent_id,
            current_task="System health monitoring",
            thought_chain=f"Diagnosis: {parsed.diagnosis}",
        )

        # Recover error agents if any found
        agents = await context.get_all_agents()
        error_agents = [a for a in agents if a.get("status") == "Error"]

        for agent_data in error_agents:
            agent_id = agent_data["id"]
            logger.info(f"Bob recovering agent: {agent_id}")

            await context.update_agent(
                agent_id,
                status="Idle",
                current_task="",
                thought_chain="Recovered by Bob (DevOps Monitor). Error cleared.",
            )

            await context.create_message(
                from_agent=self.agent_id,
                to_agent=agent_id,
                content="Recovery complete. Your error has been resolved.",
                message_type="recovery",
            )

            await context.create_message(
                from_agent=self.agent_id,
                to_agent="marco",
                content=f"Agent {agent_id} recovered from Error state.",
                message_type="status_report",
            )

        # Build health report
        health_report = {
            "agents_online": parsed.agents_online or len([a for a in agents if a.get("status") != "Clocked Out"]),
            "agents_error": parsed.agents_error or len(error_agents),
            "agents_recovered": len(error_agents),
            "system_status": parsed.system_status,
            "diagnosis": parsed.diagnosis,
            "actions_taken": parsed.actions_taken,
        }

        state["health_report"] = health_report
        # Clear error after health check
        if error_agents:
            state["error"] = ""

        return state


agent = BobAgent()
