"""
Unit tests for models.py — Enums, Pydantic domain models, request schemas.
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from models import (
    AgentStatusEnum,
    RoomEnum,
    TaskStatusEnum,
    AgentState,
    TaskModel,
    MessageModel,
    AgentUpdateRequest,
    StateOverrideRequest,
    TriggerTaskRequest,
    AgentCostRecord,
)


class TestEnums:
    """Verify enum values match the database/frontend contract."""

    def test_agent_status_values(self):
        assert AgentStatusEnum.IDLE == "Idle"
        assert AgentStatusEnum.WORKING == "Working"
        assert AgentStatusEnum.MEETING == "Meeting"
        assert AgentStatusEnum.ERROR == "Error"
        assert AgentStatusEnum.CLOCKED_OUT == "Clocked Out"
        assert len(AgentStatusEnum) == 5

    def test_room_values(self):
        assert RoomEnum.PRIVATE_OFFICE == "Private Office"
        assert RoomEnum.WAR_ROOM == "War Room"
        assert RoomEnum.DESKS == "Desks"
        assert RoomEnum.LOUNGE == "Lounge"
        assert RoomEnum.SERVER_ROOM == "Server Room"
        assert len(RoomEnum) == 5

    def test_task_status_values(self):
        assert TaskStatusEnum.BACKLOG == "Backlog"
        assert TaskStatusEnum.IN_PROGRESS == "In Progress"
        assert TaskStatusEnum.REVIEW == "Review"
        assert TaskStatusEnum.DONE == "Done"
        assert TaskStatusEnum.BLOCKED == "Blocked"
        assert len(TaskStatusEnum) == 5


class TestAgentState:
    def test_defaults(self):
        agent = AgentState(agent_id="marco", name="Marco")
        assert agent.agent_id == "marco"
        assert agent.current_room == "Desks"
        assert agent.status == "Idle"
        assert agent.current_task == ""
        assert agent.tech_stack == []
        assert agent.avatar_color == "#6366f1"

    def test_full_construction(self):
        agent = AgentState(
            agent_id="bob",
            name="Bob",
            role="DevOps",
            current_room=RoomEnum.SERVER_ROOM,
            status=AgentStatusEnum.WORKING,
            current_task="Monitoring",
            tech_stack=["Docker", "K8s"],
        )
        assert agent.current_room == "Server Room"
        assert agent.status == "Working"
        assert "Docker" in agent.tech_stack

    def test_uses_enum_values(self):
        """With use_enum_values=True, serialized values are strings."""
        agent = AgentState(agent_id="test", name="Test")
        data = agent.model_dump()
        assert isinstance(data["current_room"], str)
        assert isinstance(data["status"], str)

    def test_json_round_trip(self):
        agent = AgentState(agent_id="marco", name="Marco", role="CEO")
        json_str = agent.model_dump_json()
        restored = AgentState.model_validate_json(json_str)
        assert restored.agent_id == "marco"


class TestTaskModel:
    def test_defaults(self):
        task = TaskModel(title="Research AI")
        assert task.status == "Backlog"
        assert task.priority == 0
        assert task.assigned_agents == []
        assert task.id is None

    def test_full_construction(self):
        now = datetime.now()
        task = TaskModel(
            id="task-1",
            title="Build API",
            status=TaskStatusEnum.IN_PROGRESS,
            priority=5,
            created_by="marco",
            assigned_agents=["jimmy", "mona"],
            created_at=now,
        )
        assert task.status == "In Progress"
        assert len(task.assigned_agents) == 2


class TestMessageModel:
    def test_defaults(self):
        msg = MessageModel(from_agent="marco", to_agent="mona", content="Hello")
        assert msg.message_type == "chat"
        assert msg.id is None

    def test_full_construction(self):
        msg = MessageModel(
            id="msg-1",
            from_agent="bob",
            to_agent="marco",
            content="System recovered",
            message_type="status_report",
        )
        assert msg.message_type == "status_report"


class TestAgentUpdateRequest:
    def test_all_optional(self):
        req = AgentUpdateRequest()
        assert req.current_room is None
        assert req.status is None

    def test_partial_update(self):
        req = AgentUpdateRequest(status=AgentStatusEnum.WORKING)
        assert req.status == "Working"
        assert req.current_room is None


class TestStateOverrideRequest:
    def test_required_fields(self):
        req = StateOverrideRequest(global_status="Clocked Out", default_room="Desks")
        assert req.message == ""

    def test_missing_required_raises(self):
        with pytest.raises(ValidationError):
            StateOverrideRequest()


class TestTriggerTaskRequest:
    def test_defaults(self):
        req = TriggerTaskRequest(goal="Research AI")
        assert req.priority == 0
        assert req.assigned_to is None

    def test_full(self):
        req = TriggerTaskRequest(
            goal="Deploy v2",
            priority=5,
            assigned_to=["marco", "bob"],
        )
        assert len(req.assigned_to) == 2


class TestAgentCostRecord:
    def test_defaults(self):
        cost = AgentCostRecord(agent_id="marco")
        assert cost.input_tokens == 0
        assert cost.output_tokens == 0
        assert cost.cost_usd == 0.0
        assert cost.model == "gemini-3-flash-preview"

    def test_full(self):
        cost = AgentCostRecord(
            agent_id="mona",
            input_tokens=1000,
            output_tokens=500,
            cost_usd=0.005,
            model="gemini-2.0-flash",
        )
        assert cost.model == "gemini-2.0-flash"
