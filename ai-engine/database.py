"""
DevSwarm AI Engine - Database Operations
Async PostgreSQL operations via asyncpg.
"""

import json
import logging
import os
from datetime import datetime
import time
from typing import Any, Optional

import httpx
import jwt
import redis_client

logger = logging.getLogger("devswarm.database")

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        import uuid
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)

_client: Optional[httpx.AsyncClient] = None

async def get_pool() -> httpx.AsyncClient:
    """Get or create the HTTP client for Go Backend communication.
    (Kept named get_pool for compatibility but returns an httpx client)
    """
    global _client
    if _client is None:
        base_url = os.getenv("API_BASE_URL", "http://backend:8080/api")
        
        # Generate JWT token
        secret = os.getenv("JWT_SECRET")
        if not secret:
            logger.error("JWT_SECRET is not set, API calls will fail")
            token_string = ""
        else:
            token = jwt.encode(
                {
                    "iss": "ai-engine",
                    "aud": "backend",
                    "exp": time.time() + 300  # 5 minutes
                },
                secret,
                algorithm="HS256"
            )
            token_string = f"Bearer {token}"
            
        _client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": token_string, "Content-Type": "application/json"},
            timeout=10.0
        )
        logger.info(f"API client initialized pointing to {base_url}")
    return _client


async def close_pool():
    """Close the HTTP client."""
    global _client
    if _client:
        await _client.aclose()
        _client = None
        logger.info("API client closed")


async def get_all_agents() -> list[dict]:
    """Fetch all agents via Go Backend."""
    client = await get_pool()
    resp = await client.get("/agents")
    resp.raise_for_status()
    return resp.json()


async def get_agent(agent_id: str) -> Optional[dict]:
    """Fetch a single agent by ID via Go Backend."""
    client = await get_pool()
    resp = await client.get(f"/agents/{agent_id}")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


async def get_task(task_id: str) -> Optional[dict]:
    """Fetch a single task by ID."""
    pool = await get_pool()
    row = await pool.fetchrow(
        """SELECT t.id, t.title, t.description, t.status, t.priority,
                  COALESCE(t.created_by, '') as created_by, t.created_at, t.updated_at,
                  array_agg(ta.agent_id) FILTER (WHERE ta.agent_id IS NOT NULL) as assigned_agents
           FROM tasks t
           LEFT JOIN task_assignments ta ON t.id = ta.task_id
           WHERE t.id = $1
           GROUP BY t.id""",
        int(task_id) if task_id.isdigit() else task_id,
    )
    if not row:
        return None
    task = dict(row)
    task["id"] = str(task["id"])
    agents = task.get("assigned_agents")
    task["assigned_agents"] = list(agents) if agents else []
    return task


async def get_message(message_id: str) -> Optional[dict]:
    """Fetch a single message by ID."""
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT id, from_agent, to_agent, content, message_type, created_at FROM messages WHERE id = $1",
        int(message_id) if message_id.isdigit() else message_id,
    )
    return dict(row) if row else None


async def update_agent(
    agent_id: str,
    current_room: Optional[str] = None,
    status: Optional[str] = None,
    current_task: Optional[str] = None,
    thought_chain: Optional[str] = None,
) -> None:
    """Update an agent's mutable fields via Go Backend."""
    payload = {}
    if current_room is not None:
        payload["current_room"] = current_room
    if status is not None:
        payload["status"] = status
    if current_task is not None:
        payload["current_task"] = current_task
    if thought_chain is not None:
        payload["thought_chain"] = thought_chain

    if not payload:
        return

    client = await get_pool()
    # The Go backend triggers state changed broadcast
    resp = await client.patch(f"/agents/{agent_id}", json=payload)
    resp.raise_for_status()


async def bulk_update_agents(status: str, room: str) -> None:
    """Update all agents to a given status and room."""
    # Not implemented directly in API, but used for state override.
    # The Go backend will handle the bulk update via the /state/override endpoint
    pass


# --- State Operations ---


async def get_state_version() -> int:
    """Get the current office state version via Go Backend."""
    client = await get_pool()
    resp = await client.get("/state")
    if resp.status_code == 200:
        data = resp.json()
        return data.get("version", 0)
    return 0


async def increment_state_version() -> None:
    """Bump the state version.
    (Handled automatically by Go on mutation endpoints)
    """
    pass


async def _publish_delta_json(category: str, entity_id: str, data: dict) -> None:
    """Helper to publish delta to Redis with JSON serialization.
    (Handled automatically by Go on mutation endpoints)
    """
    pass


async def update_global_state(state_data: dict) -> None:
    """Update the global office state JSON payload."""
    # Not used directly in the proxy version, state is composed dynamically
    pass


# --- Task Operations ---


async def get_all_tasks() -> list[dict]:
    """Fetch all tasks."""
    client = await get_pool()
    resp = await client.get("/tasks")
    resp.raise_for_status()
    return resp.json()


async def get_tasks_by_agent(agent_id: str) -> list[dict]:
    """Fetch tasks assigned to a specific agent."""
    client = await get_pool()
    resp = await client.get("/tasks", params={"agent_id": agent_id})
    resp.raise_for_status()
    return resp.json()


async def get_task_assignees(task_id: str) -> list[str]:
    """Get the list of agent IDs assigned to a task."""
    task = await get_task(task_id)
    return task.get("assigned_agents", []) if task else []


async def create_task(
    title: str,
    description: str = "",
    status: str = "Backlog",
    priority: int = 0,
    created_by: Optional[str] = None,
    assigned_agents: Optional[list[str]] = None,
) -> str:
    """Create a new task and assign agents."""
    client = await get_pool()
    payload = {
        "title": title,
        "description": description,
        "status": status,
        "priority": priority,
        "created_by": created_by or "system",
        "assigned_agents": assigned_agents or []
    }
    resp = await client.post("/tasks", json=payload)
    resp.raise_for_status()
    return resp.json().get("id", "")


async def update_task_status(task_id: str, status: str) -> None:
    """Update a task's Kanban status."""
    client = await get_pool()
    resp = await client.patch(f"/tasks/{task_id}/status", params={"status": status})
    resp.raise_for_status()


# --- Message Operations ---


async def create_message(
    from_agent: str, to_agent: str, content: str, message_type: str = "chat"
) -> str:
    """Create an inter-agent message."""
    client = await get_pool()
    payload = {
        "from_agent": from_agent,
        "to_agent": to_agent,
        "content": content,
        "message_type": message_type
    }
    resp = await client.post("/messages", json=payload)
    resp.raise_for_status()
    return resp.json().get("id", "")


async def get_recent_messages(limit: int = 20) -> list[dict]:
    """Get recent inter-agent messages."""
    client = await get_pool()
    resp = await client.get("/messages", params={"limit": limit})
    resp.raise_for_status()
    return resp.json()


# --- Cost Operations ---


async def record_cost(
    agent_id: str, input_tokens: int, output_tokens: int, cost_usd: float
) -> None:
    """Record a cost entry for an agent. 
    (Not exposed in current API, logging locally or skipping for now. 
    In production, this would make an API call to a specific inner route)."""
    pass


async def get_agent_costs() -> list[dict]:
    """Get aggregated costs per agent."""
    client = await get_pool()
    resp = await client.get("/costs")
    resp.raise_for_status()
    return resp.json()


# --- Activity Log ---


async def log_activity(agent_id: str, action: str, details: Any = None) -> None:
    """Record an activity log entry."""
    # This is typically implicitly managed by Go now on state update endpoints
    # but we can leave it silent on the Python side if we're fully proxying state
    pass


async def get_activity_log(limit: int = 50) -> list[dict]:
    """Get recent activity log entries."""
    client = await get_pool()
    resp = await client.get("/activity", params={"limit": limit})
    resp.raise_for_status()
    return resp.json()
