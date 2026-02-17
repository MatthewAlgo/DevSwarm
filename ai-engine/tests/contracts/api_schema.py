from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, RootModel

# --- Agent Models ---


class AgentBase(BaseModel):
    id: str
    name: str
    role: str
    room: Optional[str] = Field(
        None, alias="currentRoom"
    )  # Go JSON tag "room" vs "currentRoom"
    status: str
    currentTask: Optional[str] = ""
    thoughtChain: Optional[str] = ""
    techStack: List[str] = []
    avatarColor: str
    updatedAt: datetime


class AgentListResponse(RootModel):
    root: List[AgentBase]


# --- Task Models ---


class Task(BaseModel):
    id: str
    title: str
    description: str
    status: str
    priority: int
    createdBy: str
    assignedAgents: List[str] = []
    createdAt: datetime
    updatedAt: datetime


# --- Message Models ---


class Message(BaseModel):
    id: str
    fromAgent: str
    toAgent: str
    content: str
    messageType: str
    createdAt: datetime


# --- Service Response Models ---


class HealthCheckResponse(BaseModel):
    status: str
    service: str
    database: str
