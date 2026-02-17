"""
DevSwarm AI Engine - Pydantic Models
Domain models shared across the AI engine.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class AgentStatusEnum(str, Enum):
    IDLE = "Idle"
    WORKING = "Working"
    MEETING = "Meeting"
    ERROR = "Error"
    CLOCKED_OUT = "Clocked Out"


class RoomEnum(str, Enum):
    PRIVATE_OFFICE = "Private Office"
    WAR_ROOM = "War Room"
    DESKS = "Desks"
    LOUNGE = "Lounge"
    SERVER_ROOM = "Server Room"


class TaskStatusEnum(str, Enum):
    BACKLOG = "Backlog"
    IN_PROGRESS = "In Progress"
    REVIEW = "Review"
    DONE = "Done"
    BLOCKED = "Blocked"


class NodeName(str, Enum):
    ORCHESTRATOR = "Orchestrator"
    CRAWLER = "Crawler"
    RESEARCHER = "Researcher"
    VIRAL_ENGINEER = "ViralEngineer"
    COMMS = "Comms"
    DEVOPS = "DevOps"
    ARCHIVIST = "Archivist"
    FRONTEND_DESIGNER = "FrontendDesigner"


class AgentState(BaseModel):
    """Represents a single AI agent's current state."""

    agent_id: str = Field(alias="id")
    name: str
    role: str = ""
    current_room: RoomEnum = Field(RoomEnum.DESKS, alias="room")
    status: AgentStatusEnum = AgentStatusEnum.IDLE
    current_task: str = Field("", alias="currentTask")
    thought_chain: str = Field("", alias="thoughtChain")
    tech_stack: list[str] = Field(default_factory=list, alias="techStack")
    avatar_color: str = Field("#6366f1", alias="avatarColor")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")

    class Config:
        use_enum_values = True
        populate_by_name = True


class TaskModel(BaseModel):
    """Represents a Kanban task."""

    id: Optional[str] = None
    title: str
    description: str = ""
    status: TaskStatusEnum = TaskStatusEnum.BACKLOG
    priority: int = 0
    created_by: Optional[str] = Field(None, alias="createdBy")
    assigned_agents: list[str] = Field(default_factory=list, alias="assignedAgents")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")

    class Config:
        use_enum_values = True
        populate_by_name = True


class MessageModel(BaseModel):
    """Represents an inter-agent message."""

    id: Optional[str] = None
    from_agent: str = Field(alias="fromAgent")
    to_agent: str = Field(alias="toAgent")
    content: str
    message_type: str = Field("chat", alias="messageType")
    created_at: Optional[datetime] = Field(None, alias="createdAt")

    class Config:
        populate_by_name = True


class AgentUpdateRequest(BaseModel):
    """Request payload for updating an agent's state."""

    current_room: Optional[RoomEnum] = Field(None, alias="room")
    status: Optional[AgentStatusEnum] = None
    current_task: Optional[str] = Field(None, alias="currentTask")
    thought_chain: Optional[str] = Field(None, alias="thoughtChain")

    class Config:
        use_enum_values = True
        populate_by_name = True


class StateOverrideRequest(BaseModel):
    """Request payload for global state overrides (clock in/out)."""

    global_status: str = Field(
        alias="globalStatus"
    )  # Assuming consistency, though mostly internal
    default_room: str = Field(alias="defaultRoom")
    message: str = ""

    class Config:
        populate_by_name = True


class TriggerTaskRequest(BaseModel):
    """Request payload for triggering a task execution."""

    goal: str
    priority: int = 0
    assigned_to: Optional[list[str]] = Field(None, alias="assignedTo")

    class Config:
        populate_by_name = True


class AgentCostRecord(BaseModel):
    """Tracks token usage and costs per agent."""

    agent_id: str = Field(alias="agentId")
    input_tokens: int = Field(0, alias="totalInput")
    output_tokens: int = Field(0, alias="totalOutput")
    cost_usd: float = Field(0.0, alias="totalCost")
    model: str = "gemini-3-flash-preview"

    class Config:
        populate_by_name = True
