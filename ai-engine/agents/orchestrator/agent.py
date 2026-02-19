"""
Orchestrator — CEO / Orchestrator Agent
Decomposes goals, delegates to specialists, schedules cross-agent meetings.
Never executes direct labor.
"""

from __future__ import annotations

import logging

from langchain_core.prompts import ChatPromptTemplate

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import OrchestratorRoutingOutput
from core.state import OfficeState
from agents.orchestrator.prompts import PROMPT
from models import TaskStatusEnum, AgentStatusEnum, RoomEnum

logger = logging.getLogger("devswarm.agents.orchestrator")


class OrchestratorAgent(BaseAgent[OrchestratorRoutingOutput]):
    """CEO agent that decomposes goals and routes to specialist agents."""

    agent_id = "orchestrator"
    name = "Orchestrator"
    role = "CEO / Orchestrator"
    default_room = "Private Office"
    output_schema = OrchestratorRoutingOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: OrchestratorRoutingOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Create subtasks and delegate to specialist agents."""
        current_goal = state.get("current_goal", "")
        delegated_to: list[str] = []
        delegated_task_ids: list[str] = []

        for i, subtask in enumerate(parsed.subtasks):
            # Only the first delegated task enters active execution path immediately.
            # Remaining subtasks are queued as backlog to avoid "Idle + In Progress" mismatch.
            task_status = (
                TaskStatusEnum.IN_PROGRESS if i == 0 else TaskStatusEnum.BACKLOG
            )

            # Create task in DB
            task_id = await context.create_task(
                title=subtask.task,
                description=f"Delegated by Orchestrator from goal: {current_goal}",
                status=task_status,
                priority=subtask.priority,
                created_by=self.agent_id,
                assigned_agents=[subtask.agent],
            )
            delegated_task_ids.append(task_id)

            if i == 0:
                await context.update_agent(
                    subtask.agent,
                    status=AgentStatusEnum.WORKING,
                    current_task=subtask.task,
                    thought_chain=f"Picked up delegated task: {subtask.task}",
                )

            # Send delegation message
            await context.create_message(
                from_agent=self.agent_id,
                to_agent=subtask.agent,
                content=f"Task assigned: {subtask.task}",
                message_type="delegation",
            )

            delegated_to.append(subtask.agent)
            logger.info(f"Orchestrator delegated to {subtask.agent}: {subtask.task}")

        # Direct response to user
        if parsed.response:
            await context.create_message(
                from_agent=self.agent_id,
                to_agent="user",
                content=parsed.response,
                message_type="chat",
            )
            logger.info(f"Orchestrator replied to user: {parsed.response}")

        # Schedule meeting if needed
        if parsed.meeting_required and parsed.meeting_agents:
            for agent_id in parsed.meeting_agents:
                await context.update_agent(
                    agent_id, current_room=RoomEnum.WAR_ROOM, status=AgentStatusEnum.MEETING
                )
            await context.update_agent(
                self.agent_id,
                current_room=RoomEnum.WAR_ROOM,
                status=AgentStatusEnum.MEETING,
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
        state["delegated_task_ids"] = delegated_task_ids

        await context.update_agent(
            self.agent_id,
            current_room=None,
            status=None,
            current_task=f"Delegated: {current_goal}",
            thought_chain=f"Delegated to {', '.join(delegated_to)}. Monitoring progress.",
        )

        return state


# Module-level instance for backward compatibility with graph.py
agent = OrchestratorAgent()
