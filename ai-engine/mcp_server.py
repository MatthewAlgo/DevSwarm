"""
DevSwarm AI Engine - MCP Server Exposure
Exposes all agent tools via a unified MCP server for external access.
"""

import logging

from mcp.server.fastmcp import FastMCP

from agents.orchestrator.tools import mcp as marco_mcp
from agents.crawler.tools import mcp as jimmy_mcp
from agents.researcher.tools import mcp as mona_mcp
from agents.viral_engineer.tools import mcp as dan_mcp
from agents.comms.tools import mcp as tonny_mcp
from agents.devops.tools import mcp as bob_mcp
from agents.archivist.tools import mcp as ariani_mcp
from agents.frontend_designer.tools import mcp as peter_mcp

logger = logging.getLogger("devswarm.mcp_server")

# Unified MCP server that aggregates all agent capabilities
unified_mcp = FastMCP("DevSwarm_Unified")

# Registry of all agent MCP servers for external exposure
AGENT_MCP_SERVERS = {
    "marco": marco_mcp,
    "jimmy": jimmy_mcp,
    "mona": mona_mcp,
    "dan": dan_mcp,
    "tonny": tonny_mcp,
    "bob": bob_mcp,
    "ariani": ariani_mcp,
    "peter": peter_mcp,
}


def get_mcp_server(agent_id: str) -> FastMCP | None:
    """Get the MCP server for a specific agent."""
    return AGENT_MCP_SERVERS.get(agent_id)


def list_all_tools() -> dict[str, list[str]]:
    """List all available MCP tools grouped by agent."""
    tools = {}
    for agent_id, server in AGENT_MCP_SERVERS.items():
        tool_list = []
        if hasattr(server, "_tool_manager") and hasattr(server._tool_manager, "tools"):
            for tool_name in server._tool_manager.tools:
                tool_list.append(tool_name)
        tools[agent_id] = tool_list
    return tools


# Cross-agent MCP tools on the unified server


@unified_mcp.tool()
async def call_agent(agent_id: str, tool_name: str, params: str = "{}") -> str:
    """
    Invoke a specific tool on a specific agent's MCP server.
    This is the primary inter-agent communication mechanism.
    """
    import json

    server = get_mcp_server(agent_id)
    if not server:
        return f"Error: Agent '{agent_id}' not found"

    try:
        parsed_params = json.loads(params) if isinstance(params, str) else params
    except json.JSONDecodeError:
        return f"Error: Invalid JSON params: {params}"

    logger.info(f"MCP call: {agent_id}.{tool_name}({parsed_params})")

    # In production, this would invoke the tool via the MCP protocol
    return (
        f"Tool '{tool_name}' invoked on agent '{agent_id}' with params: {parsed_params}"
    )


@unified_mcp.tool()
async def list_available_tools() -> str:
    """List all available tools across all agents."""
    import json

    tools = list_all_tools()
    return json.dumps(tools, indent=2)
