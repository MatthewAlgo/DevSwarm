"""
DevSwarm AI Engine - Database Operations
Async PostgreSQL operations via asyncpg.
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Optional

import asyncpg

logger = logging.getLogger("devswarm.database")

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """Get or create the database connection pool."""
    global _pool
    if _pool is None:
        dsn = os.getenv("DATABASE_URL", "postgresql://devswarm_user:devswarm_password@db:5432/devswarm_state")
        _pool = await asyncpg.create_pool(dsn, min_size=2, max_size=10)
        logger.info("Database connection pool created")
    return _pool


async def close_pool():
    """Close the database connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")


# --- Agent Operations ---

async def get_all_agents() -> list[dict]:
    """Fetch all agents from the database."""
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT id, name, role, current_room, status, current_task,
                  thought_chain, tech_stack, avatar_color, updated_at
           FROM agents ORDER BY name"""
    )
    return [dict(r) for r in rows]


async def get_agent(agent_id: str) -> Optional[dict]:
    """Fetch a single agent by ID."""
    pool = await get_pool()
    row = await pool.fetchrow(
        """SELECT id, name, role, current_room, status, current_task,
                  thought_chain, tech_stack, avatar_color, updated_at
           FROM agents WHERE id = $1""",
        agent_id,
    )
    return dict(row) if row else None


async def update_agent(
    agent_id: str,
    current_room: Optional[str] = None,
    status: Optional[str] = None,
    current_task: Optional[str] = None,
    thought_chain: Optional[str] = None,
) -> None:
    """Update an agent's mutable fields."""
    pool = await get_pool()

    updates = []
    params = []
    idx = 1

    if current_room is not None:
        updates.append(f"current_room = ${idx}")
        params.append(current_room)
        idx += 1
    if status is not None:
        updates.append(f"status = ${idx}")
        params.append(status)
        idx += 1
    if current_task is not None:
        updates.append(f"current_task = ${idx}")
        params.append(current_task)
        idx += 1
    if thought_chain is not None:
        updates.append(f"thought_chain = ${idx}")
        params.append(thought_chain)
        idx += 1

    if not updates:
        return

    updates.append("updated_at = NOW()")
    params.append(agent_id)

    query = f"UPDATE agents SET {', '.join(updates)} WHERE id = ${idx}"
    await pool.execute(query, *params)
    await increment_state_version()


async def bulk_update_agents(status: str, room: str) -> None:
    """Update all agents to a given status and room."""
    pool = await get_pool()
    await pool.execute(
        "UPDATE agents SET status = $1, current_room = $2, updated_at = NOW()",
        status, room,
    )
    await increment_state_version()


# --- State Operations ---

async def get_state_version() -> int:
    """Get the current office state version."""
    pool = await get_pool()
    row = await pool.fetchrow("SELECT version FROM office_state WHERE id = 1")
    return row["version"] if row else 0


async def increment_state_version() -> None:
    """Bump the state version to trigger WebSocket broadcast.
    Also publishes to Redis for instant notifications.
    """
    pool = await get_pool()
    await pool.execute(
        "UPDATE office_state SET version = version + 1, updated_at = NOW() WHERE id = 1"
    )
    # Notify via Redis pub/sub for instant broadcast
    try:
        import redis_client
        await redis_client.publish_state_changed()
    except Exception:
        pass  # Redis is optional; DB version bump is enough for fallback polling


async def update_global_state(state_data: dict) -> None:
    """Update the global office state JSON payload."""
    pool = await get_pool()
    await pool.execute(
        "UPDATE office_state SET state_json = $1, version = version + 1, updated_at = NOW() WHERE id = 1",
        json.dumps(state_data),
    )


# --- Task Operations ---

async def get_all_tasks() -> list[dict]:
    """Fetch all tasks."""
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT id, title, description, status, priority,
                  COALESCE(created_by, '') as created_by, created_at, updated_at
           FROM tasks ORDER BY priority DESC, created_at DESC"""
    )
    tasks = []
    for r in rows:
        task = dict(r)
        task["id"] = str(task["id"])
        task["assigned_agents"] = await get_task_assignees(task["id"])
        tasks.append(task)
    return tasks


async def get_tasks_by_agent(agent_id: str) -> list[dict]:
    """Fetch tasks assigned to a specific agent."""
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT t.id, t.title, t.description, t.status, t.priority,
                  COALESCE(t.created_by, '') as created_by, t.created_at, t.updated_at
           FROM tasks t
           JOIN task_assignments ta ON t.id = ta.task_id
           WHERE ta.agent_id = $1
           ORDER BY t.priority DESC, t.created_at DESC""",
        agent_id,
    )
    tasks = []
    for r in rows:
        task = dict(r)
        task["id"] = str(task["id"])
        task["assigned_agents"] = await get_task_assignees(task["id"])
        tasks.append(task)
    return tasks


async def get_task_assignees(task_id: str) -> list[str]:
    """Get the list of agent IDs assigned to a task."""
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT agent_id FROM task_assignments WHERE task_id = $1", task_id
    )
    return [r["agent_id"] for r in rows]


async def create_task(
    title: str,
    description: str = "",
    status: str = "Backlog",
    priority: int = 0,
    created_by: Optional[str] = None,
    assigned_agents: Optional[list[str]] = None,
) -> str:
    """Create a new task and assign agents."""
    pool = await get_pool()
    row = await pool.fetchrow(
        """INSERT INTO tasks (title, description, status, priority, created_by)
           VALUES ($1, $2, $3, $4, $5) RETURNING id""",
        title, description, status, priority, created_by,
    )
    task_id = str(row["id"])

    if assigned_agents:
        for agent_id in assigned_agents:
            await pool.execute(
                "INSERT INTO task_assignments (task_id, agent_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                row["id"], agent_id,
            )

    await increment_state_version()
    return task_id


async def update_task_status(task_id: str, status: str) -> None:
    """Update a task's Kanban status."""
    pool = await get_pool()
    await pool.execute(
        "UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2",
        status, task_id,
    )
    await increment_state_version()


# --- Message Operations ---

async def create_message(
    from_agent: str, to_agent: str, content: str, message_type: str = "chat"
) -> str:
    """Create an inter-agent message."""
    pool = await get_pool()
    row = await pool.fetchrow(
        """INSERT INTO messages (from_agent, to_agent, content, message_type)
           VALUES ($1, $2, $3, $4) RETURNING id""",
        from_agent, to_agent, content, message_type,
    )
    await increment_state_version()
    return str(row["id"])


async def get_recent_messages(limit: int = 20) -> list[dict]:
    """Get recent inter-agent messages."""
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT id, COALESCE(from_agent, '') as from_agent,
                  COALESCE(to_agent, '') as to_agent,
                  content, message_type, created_at
           FROM messages ORDER BY created_at DESC LIMIT $1""",
        limit,
    )
    result = []
    for r in rows:
        m = dict(r)
        m["id"] = str(m["id"])
        result.append(m)
    return result


# --- Cost Operations ---

async def record_cost(
    agent_id: str, input_tokens: int, output_tokens: int, cost_usd: float
) -> None:
    """Record a cost entry for an agent."""
    pool = await get_pool()
    await pool.execute(
        """INSERT INTO agent_costs (agent_id, input_tokens, output_tokens, cost_usd)
           VALUES ($1, $2, $3, $4)""",
        agent_id, input_tokens, output_tokens, cost_usd,
    )


async def get_agent_costs() -> list[dict]:
    """Get aggregated costs per agent."""
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT agent_id,
                  SUM(input_tokens)::int as total_input,
                  SUM(output_tokens)::int as total_output,
                  SUM(cost_usd)::float as total_cost
           FROM agent_costs GROUP BY agent_id ORDER BY total_cost DESC"""
    )
    return [dict(r) for r in rows]


# --- Activity Log ---

async def log_activity(agent_id: str, action: str, details: Any = None) -> None:
    """Record an activity log entry."""
    pool = await get_pool()
    details_json = json.dumps(details or {})
    await pool.execute(
        "INSERT INTO activity_log (agent_id, action, details) VALUES ($1, $2, $3)",
        agent_id, action, details_json,
    )


async def get_activity_log(limit: int = 50) -> list[dict]:
    """Get recent activity log entries."""
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT id, COALESCE(agent_id, '') as agent_id, action, details, created_at
           FROM activity_log ORDER BY created_at DESC LIMIT $1""",
        limit,
    )
    result = []
    for r in rows:
        entry = dict(r)
        entry["id"] = str(entry["id"])
        if isinstance(entry.get("details"), str):
            try:
                entry["details"] = json.loads(entry["details"])
            except (json.JSONDecodeError, TypeError):
                pass
        result.append(entry)
    return result
