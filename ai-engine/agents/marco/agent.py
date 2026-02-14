"""
Marco — CEO / Orchestrator Agent
Decomposes goals, delegates to specialists, schedules cross-agent meetings.
Never executes direct labor.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import MarcoRoutingOutput
from core.state import OfficeState
from agents.marco.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.marco")


class MarcoAgent(BaseAgent):
    """CEO agent that decomposes goals and routes to specialist agents."""

    agent_id = "marco"
    name = "Marco"
    role = "CEO / Orchestrator"
    default_room = "Private Office"
    output_schema = MarcoRoutingOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: MarcoRoutingOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Create subtasks and delegate to specialist agents."""
        current_goal = state.get("current_goal", "")
        delegated_to: list[str] = []

        for subtask in parsed.subtasks:
            # Create task in DB
            task_id = await context.create_task(
                title=subtask.task,
                description=f"Delegated by Marco from goal: {current_goal}",
                status="In Progress",
                priority=subtask.priority,
                created_by=self.agent_id,
                assigned_agents=[subtask.agent],
            )

            # Send delegation message
            await context.create_message(
                from_agent=self.agent_id,
                to_agent=subtask.agent,
                content=f"Task assigned: {subtask.task}",
                message_type="delegation",
            )

            delegated_to.append(subtask.agent)
            logger.info(f"Marco delegated to {subtask.agent}: {subtask.task}")

        # Schedule meeting if needed
        if parsed.meeting_required and parsed.meeting_agents:
            for agent_id in parsed.meeting_agents:
                await context.update_agent(
                    agent_id, current_room="War Room", status="Meeting"
                )
            await context.update_agent(
                self.agent_id,
                current_room="War Room",
                status="Meeting",
                thought_chain=f"Meeting in War Room about: {current_goal}",
            )
            await context.create_message(
                from_agent=self.agent_id,
                to_agent="system",
                content=f"Meeting scheduled: {current_goal} with {', '.join(parsed.meeting_agents)}",
                message_type="meeting",
            )

        # Update state
        state["routing_decisions"] = parsed.model_dump()
        state["delegated_agents"] = delegated_to

        await context.update_agent(
            self.agent_id,
            current_task=f"Delegated: {current_goal}",
            thought_chain=f"Delegated to {', '.join(delegated_to)}. Monitoring progress.",
        )

        return state


# Module-level instance for backward compatibility with graph.py
agent = MarcoAgent()
