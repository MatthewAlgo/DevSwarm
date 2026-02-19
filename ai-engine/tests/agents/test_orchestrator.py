"""
Probabilistic unit tests for Orchestrator Agent.
Tests delegation routing, task creation, meeting scheduling, and error handling.
"""

import pytest
import random

from agents.orchestrator.agent import OrchestratorAgent
from core.schemas import OrchestratorRoutingOutput, SubtaskAssignment
from tests.conftest import make_mock_chain


@pytest.mark.asyncio
class TestOrchestratorAgent:
    """Tests for OrchestratorAgent."""

    async def test_agent_metadata(self):
        """Verify agent identity attributes."""
        agent = OrchestratorAgent()
        assert agent.agent_id == "orchestrator"
        assert agent.name == "Orchestrator"
        assert agent.role == "CEO / Orchestrator"
        assert agent.default_room == "Private Office"
        assert agent.output_schema == OrchestratorRoutingOutput

    async def test_delegation_creates_tasks(
        self, mock_context, base_state, orchestrator_output
    ):
        """When Orchestrator delegates, a task should be created in DB for each subtask."""
        agent = OrchestratorAgent(context=mock_context)
        agent._chain = make_mock_chain(orchestrator_output)

        await agent.process(base_state)

        # Should create tasks for researcher and viral_engineer
        assert len(mock_context.tasks_created) == 2
        assert mock_context.tasks_created[0]["created_by"] == "orchestrator"
        assert mock_context.tasks_created[0]["assigned_agents"] == ["researcher"]
        assert mock_context.tasks_created[1]["assigned_agents"] == ["viral_engineer"]

    async def test_delegation_sends_messages(
        self, mock_context, base_state, orchestrator_output
    ):
        """Orchestrator should send delegation messages to assigned agents."""
        agent = OrchestratorAgent(context=mock_context)
        agent._chain = make_mock_chain(orchestrator_output)

        await agent.process(base_state)

        delegation_msgs = [
            m for m in mock_context.messages if m["message_type"] == "delegation"
        ]
        assert len(delegation_msgs) == 2
        assert delegation_msgs[0]["from_agent"] == "orchestrator"
        assert delegation_msgs[0]["to_agent"] == "researcher"
        assert delegation_msgs[1]["to_agent"] == "viral_engineer"

    async def test_state_updated_with_delegated_agents(
        self, mock_context, base_state, orchestrator_output
    ):
        """State should contain the list of delegated agent IDs."""
        if len(base_state["active_tasks"]) == 0:
            base_state["active_tasks"].append("Test Goal")

        agent = OrchestratorAgent(mock_context)
        agent._chain = make_mock_chain(orchestrator_output)

        result = await agent.process(base_state)

        assert result["delegated_agents"] == ["researcher", "viral_engineer"]
        assert len(result["delegated_task_ids"]) == 2
        assert "routing_decisions" in result
        assert isinstance(result["routing_decisions"], dict)

    async def test_meeting_scheduling(self, mock_context, base_state):
        """When meeting_required=True, agents should be moved to War Room."""
        output = OrchestratorRoutingOutput(
            analysis="Complex goal requiring collaboration",
            subtasks=[
                SubtaskAssignment(agent="researcher", task="Research", priority=5)
            ],
            meeting_required=True,
            meeting_agents=["researcher", "viral_engineer"],
        )
        agent = OrchestratorAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        await agent.process(base_state)

        # Check that meeting agents were moved to War Room
        war_room_updates = [
            u
            for u in mock_context.updates
            if u.get("current_room") == "War Room" and u.get("status") == "Meeting"
        ]
        # researcher + viral_engineer + orchestrator = 3 agents in War Room
        assert len(war_room_updates) >= 3

        # Meeting message should be sent
        meeting_msgs = [
            m for m in mock_context.messages if m["message_type"] == "meeting"
        ]
        assert len(meeting_msgs) == 1

    async def test_status_transitions(
        self, mock_context, base_state, orchestrator_output
    ):
        """Agent should transition: Working → Idle."""
        agent = OrchestratorAgent(context=mock_context)
        agent._chain = make_mock_chain(orchestrator_output)

        await agent.process(base_state)

        statuses = [
            u["status"]
            for u in mock_context.updates
            if u["agent_id"] == "orchestrator" and u["status"]
        ]
        assert "Working" in statuses
        assert statuses[-1] == "Idle"  # Final status should be Idle

    async def test_activity_logged(self, mock_context, base_state, orchestrator_output):
        """Orchestrator should log activity after processing."""
        agent = OrchestratorAgent(context=mock_context)
        agent._chain = make_mock_chain(orchestrator_output)

        await agent.process(base_state)

        # BaseAgent logs + Orchestrator's execute might log
        assert len(mock_context.activities) >= 1
        agent_activities = [
            a for a in mock_context.activities if a["agent_id"] == "orchestrator"
        ]
        assert len(agent_activities) >= 1

    async def test_error_handling(self, mock_context, base_state):
        """On chain error, agent should set status to Error."""
        agent = OrchestratorAgent(context=mock_context)

        async def _fail(input_dict, **kwargs):
            raise ValueError("LLM unavailable")

        from langchain_core.runnables import RunnableLambda

        agent._chain = RunnableLambda(_fail)

        result = await agent.process(base_state)

        assert result["error"] == "LLM unavailable"
        error_updates = [u for u in mock_context.updates if u.get("status") == "Error"]
        assert len(error_updates) >= 1

    async def test_no_subtasks_produces_empty_delegation(
        self, mock_context, base_state
    ):
        """When LLM returns no subtasks, delegated_agents should be empty."""
        output = OrchestratorRoutingOutput(
            analysis="No action needed",
            subtasks=[],
            meeting_required=False,
            meeting_agents=[],
        )
        agent = OrchestratorAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)
        assert result["delegated_agents"] == []
        assert len(mock_context.tasks_created) == 0

    @pytest.mark.parametrize("n_subtasks", [1, 3, 5, 7])
    async def test_probabilistic_scaling(self, mock_context, base_state, n_subtasks):
        """Verify correct task count scales with number of subtasks."""
        subtasks = [
            SubtaskAssignment(
                agent=random.choice(
                    [
                        "researcher",
                        "viral_engineer",
                        "crawler",
                        "devops",
                        "comms",
                        "archivist",
                        "frontend_designer",
                    ]
                ),
                task=f"Subtask {i + 1}",
                priority=random.randint(1, 5),
            )
            for i in range(n_subtasks)
        ]
        output = OrchestratorRoutingOutput(
            analysis="Multi-part goal",
            subtasks=subtasks,
            meeting_required=n_subtasks > 2,
            meeting_agents=[s.agent for s in subtasks[:3]],
        )
        agent = OrchestratorAgent(context=mock_context)
        agent._chain = make_mock_chain(output)

        result = await agent.process(base_state)

        assert len(mock_context.tasks_created) == n_subtasks
        assert len(result["delegated_agents"]) == n_subtasks
