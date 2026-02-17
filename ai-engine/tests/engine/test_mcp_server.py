"""
Unit tests for mcp_server.py — Tool registration, server lookup, and call_agent.
"""

import pytest
import json

from mcp_server import (
    AGENT_MCP_SERVERS,
    get_mcp_server,
    list_all_tools,
)


class TestAgentMCPServers:
    """Verify all 8 agent MCP servers are registered."""

    def test_all_agents_registered(self):
        expected = {"marco", "jimmy", "mona", "dan", "tonny", "bob", "ariani", "peter"}
        assert set(AGENT_MCP_SERVERS.keys()) == expected

    def test_server_count(self):
        assert len(AGENT_MCP_SERVERS) == 8

    def test_each_server_has_name(self):
        for agent_id, server in AGENT_MCP_SERVERS.items():
            assert hasattr(server, "name"), f"Server for {agent_id} has no name"


class TestGetMCPServer:
    def test_valid_agent(self):
        server = get_mcp_server("marco")
        assert server is not None

    def test_invalid_agent(self):
        server = get_mcp_server("nonexistent")
        assert server is None

    @pytest.mark.parametrize(
        "agent_id", ["marco", "jimmy", "mona", "dan", "tonny", "bob", "ariani", "peter"]
    )
    def test_all_agents_retrievable(self, agent_id):
        assert get_mcp_server(agent_id) is not None


class TestListAllTools:
    def test_returns_dict(self):
        tools = list_all_tools()
        assert isinstance(tools, dict)

    def test_all_agents_present(self):
        tools = list_all_tools()
        assert len(tools) == 8

    def test_tools_are_lists(self):
        tools = list_all_tools()
        for agent_id, tool_list in tools.items():
            assert isinstance(tool_list, list), f"{agent_id} tools is not a list"


@pytest.mark.asyncio
class TestCallAgent:
    async def test_valid_agent(self):
        from mcp_server import call_agent

        result = await call_agent("marco", "create_task", '{"title": "Test"}')
        assert "marco" in result
        assert "create_task" in result

    async def test_invalid_agent(self):
        from mcp_server import call_agent

        result = await call_agent("nonexistent", "test_tool")
        assert "Error" in result
        assert "not found" in result

    async def test_invalid_json_params(self):
        from mcp_server import call_agent

        result = await call_agent("marco", "create_task", "{invalid_json}")
        assert "Error" in result
        assert "Invalid JSON" in result

    async def test_empty_params(self):
        from mcp_server import call_agent

        result = await call_agent("marco", "assign_agent")
        assert "marco" in result


@pytest.mark.asyncio
class TestListAvailableTools:
    async def test_returns_json_string(self):
        from mcp_server import list_available_tools

        result = await list_available_tools()
        parsed = json.loads(result)
        assert isinstance(parsed, dict)
        assert len(parsed) == 8
