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


class AgentState(BaseModel):
    """Represents a single AI agent's current state."""
    agent_id: str
    name: str
    role: str = ""
    current_room: RoomEnum = RoomEnum.DESKS
    status: AgentStatusEnum = AgentStatusEnum.IDLE
    current_task: str = ""
    thought_chain: str = ""
    tech_stack: list[str] = Field(default_factory=list)
    avatar_color: str = "#6366f1"

    class Config:
        use_enum_values = True


class TaskModel(BaseModel):
    """Represents a Kanban task."""
    id: Optional[str] = None
    title: str
    description: str = ""
    status: TaskStatusEnum = TaskStatusEnum.BACKLOG
    priority: int = 0
    created_by: Optional[str] = None
    assigned_agents: list[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        use_enum_values = True


class MessageModel(BaseModel):
    """Represents an inter-agent message."""
    id: Optional[str] = None
    from_agent: str
    to_agent: str
    content: str
    message_type: str = "chat"
    created_at: Optional[datetime] = None


class AgentUpdateRequest(BaseModel):
    """Request payload for updating an agent's state."""
    current_room: Optional[RoomEnum] = None
    status: Optional[AgentStatusEnum] = None
    current_task: Optional[str] = None
    thought_chain: Optional[str] = None

    class Config:
        use_enum_values = True


class StateOverrideRequest(BaseModel):
    """Request payload for global state overrides (clock in/out)."""
    global_status: str
    default_room: str
    message: str = ""


class TriggerTaskRequest(BaseModel):
    """Request payload for triggering a task execution."""
    goal: str
    priority: int = 0
    assigned_to: Optional[list[str]] = None


class AgentCostRecord(BaseModel):
    """Tracks token usage and costs per agent."""
    agent_id: str
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    model: str = "gemini-1.5-flash"
