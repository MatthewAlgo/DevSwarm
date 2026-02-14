"""
AgentContext — Dependency injection interface for database operations.
Agents depend on the AgentContext protocol, not directly on the database module.
This enables clean testing with MockContext.
"""

from __future__ import annotations

import logging
from typing import Any, Optional, Protocol, runtime_checkable

logger = logging.getLogger("devswarm.core.context")


@runtime_checkable
class AgentContext(Protocol):
    """Protocol defining the operations agents can perform on the system."""

    async def update_agent(
        self,
        agent_id: str,
        *,
        current_room: Optional[str] = None,
        status: Optional[str] = None,
        current_task: Optional[str] = None,
        thought_chain: Optional[str] = None,
    ) -> None: ...

    async def create_message(
        self,
        from_agent: str,
        to_agent: str,
        content: str,
        message_type: str = "chat",
    ) -> str: ...

    async def create_task(
        self,
        title: str,
        description: str = "",
        status: str = "Backlog",
        priority: int = 0,
        created_by: Optional[str] = None,
        assigned_agents: Optional[list[str]] = None,
    ) -> str: ...

    async def log_activity(
        self, agent_id: str, action: str, details: Any = None
    ) -> None: ...

    async def get_all_agents(self) -> list[dict]: ...


class LiveContext:
    """Production context that delegates to the real database module."""

    async def update_agent(
        self,
        agent_id: str,
        *,
        current_room: Optional[str] = None,
        status: Optional[str] = None,
        current_task: Optional[str] = None,
        thought_chain: Optional[str] = None,
    ) -> None:
        import database as db
        await db.update_agent(
            agent_id,
            current_room=current_room,
            status=status,
            current_task=current_task,
            thought_chain=thought_chain,
        )

    async def create_message(
        self,
        from_agent: str,
        to_agent: str,
        content: str,
        message_type: str = "chat",
    ) -> str:
        import database as db
        return await db.create_message(from_agent, to_agent, content, message_type)

    async def create_task(
        self,
        title: str,
        description: str = "",
        status: str = "Backlog",
        priority: int = 0,
        created_by: Optional[str] = None,
        assigned_agents: Optional[list[str]] = None,
    ) -> str:
        import database as db
        return await db.create_task(
            title=title,
            description=description,
            status=status,
            priority=priority,
            created_by=created_by,
            assigned_agents=assigned_agents,
        )

    async def log_activity(
        self, agent_id: str, action: str, details: Any = None
    ) -> None:
        import database as db
        await db.log_activity(agent_id, action, details)

    async def get_all_agents(self) -> list[dict]:
        import database as db
        return await db.get_all_agents()


class MockContext:
    """
    Test context that records all calls without touching the database.
    Used in unit tests for verifying agent behavior.
    """

    def __init__(self, mock_agents: Optional[list[dict]] = None):
        self.updates: list[dict] = []
        self.messages: list[dict] = []
        self.tasks_created: list[dict] = []
        self.activities: list[dict] = []
        self._mock_agents = mock_agents or []
        self._task_counter = 0

    async def update_agent(
        self,
        agent_id: str,
        *,
        current_room: Optional[str] = None,
        status: Optional[str] = None,
        current_task: Optional[str] = None,
        thought_chain: Optional[str] = None,
    ) -> None:
        self.updates.append({
            "agent_id": agent_id,
            "current_room": current_room,
            "status": status,
            "current_task": current_task,
            "thought_chain": thought_chain,
        })

    async def create_message(
        self,
        from_agent: str,
        to_agent: str,
        content: str,
        message_type: str = "chat",
    ) -> str:
        msg_id = f"msg-{len(self.messages) + 1}"
        self.messages.append({
            "id": msg_id,
            "from_agent": from_agent,
            "to_agent": to_agent,
            "content": content,
            "message_type": message_type,
        })
        return msg_id

    async def create_task(
        self,
        title: str,
        description: str = "",
        status: str = "Backlog",
        priority: int = 0,
        created_by: Optional[str] = None,
        assigned_agents: Optional[list[str]] = None,
    ) -> str:
        self._task_counter += 1
        task_id = f"task-{self._task_counter}"
        self.tasks_created.append({
            "id": task_id,
            "title": title,
            "description": description,
            "status": status,
            "priority": priority,
            "created_by": created_by,
            "assigned_agents": assigned_agents or [],
        })
        return task_id

    async def log_activity(
        self, agent_id: str, action: str, details: Any = None
    ) -> None:
        self.activities.append({
            "agent_id": agent_id,
            "action": action,
            "details": details,
        })

    async def get_all_agents(self) -> list[dict]:
        return self._mock_agents

    def reset(self) -> None:
        """Clear all recorded calls."""
        self.updates.clear()
        self.messages.clear()
        self.tasks_created.clear()
        self.activities.clear()
        self._task_counter = 0
