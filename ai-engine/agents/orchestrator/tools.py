"""
Marco - MCP Tools
Orchestration tools for task management and agent coordination.
"""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Marco_Orchestration")


@mcp.tool()
async def create_task(
    title: str, description: str, assigned_to: str, priority: int = 0
) -> str:
    """Create a new task and assign it to an agent."""
    from database import create_task as db_create_task

    task_id = await db_create_task(
        title=title,
        description=description,
        status="Backlog",
        priority=priority,
        created_by="marco",
        assigned_agents=[assigned_to],
    )
    return f"Task created (ID: {task_id}): {title} → assigned to {assigned_to}"


@mcp.tool()
async def assign_agent(agent_id: str, task_description: str) -> str:
    """Assign an agent to work on a specific task."""
    from database import update_agent, create_message

    await update_agent(agent_id, status="Working", current_task=task_description)
    await create_message(
        from_agent="marco",
        to_agent=agent_id,
        content=f"New assignment: {task_description}",
        message_type="delegation",
    )
    return f"Agent {agent_id} assigned to: {task_description}"


@mcp.tool()
async def schedule_meeting(agent_ids: list[str], topic: str) -> str:
    """Schedule a meeting by moving agents to the War Room."""
    from database import update_agent

    for aid in agent_ids:
        await update_agent(aid, current_room="War Room", status="Meeting")
    await update_agent("marco", current_room="War Room", status="Meeting")
    return f"Meeting scheduled in War Room for {agent_ids} regarding: {topic}"
