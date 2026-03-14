"""
Unit tests for database.py — Verified API routing and proxy interaction.
Uses respx to mock httpx.AsyncClient calls to the backend API.
"""

import pytest
import respx
import httpx
import jwt
from unittest.mock import AsyncMock, patch

import database as db


@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    """Automatically set default environment variables for tests."""
    monkeypatch.setenv("API_BASE_URL", "http://backend:8080/api")
    monkeypatch.setenv("JWT_SECRET", "test_secret_key")
    
    # Reset the singleton client between tests
    db._client = None
    yield
    db._client = None


@pytest.mark.asyncio
class TestGetPool:
    async def test_pool_initializes_client(self):
        """Verify get_pool creates an httpx.AsyncClient with JWT auth."""
        client = await db.get_pool()
        assert isinstance(client, httpx.AsyncClient)
        assert str(client.base_url) == "http://backend:8080/api/"
        
        # Verify JWT header is set
        auth_header = client.headers.get("Authorization")
        assert auth_header is not None
        assert auth_header.startswith("Bearer ")
        
        # Verify the token decodes
        token = auth_header.split(" ")[1]
        decoded = jwt.decode(token, "test_secret_key", algorithms=["HS256"], audience="backend")
        assert decoded["iss"] == "ai-engine"

    async def test_close_pool(self):
        """Verify close_pool safely closes the client."""
        client = await db.get_pool()
        assert db._client is not None
        await db.close_pool()
        assert db._client is None


@pytest.mark.asyncio
@respx.mock
class TestAgentOperations:
    async def test_get_all_agents(self):
        route = respx.get("http://backend:8080/api/agents").respond(
            200, json=[{"id": "orchestrator", "name": "Orchestrator", "status": "Idle"}]
        )
        result = await db.get_all_agents()
        assert isinstance(result, list)
        assert result[0]["id"] == "orchestrator"
        assert route.called

    async def test_get_all_agents_empty(self):
        respx.get("http://backend:8080/api/agents").respond(200, json=[])
        result = await db.get_all_agents()
        assert result == []

    async def test_get_agent(self):
        route = respx.get("http://backend:8080/api/agents/orchestrator").respond(
            200, json={"id": "orchestrator", "name": "Orchestrator"}
        )
        result = await db.get_agent("orchestrator")
        assert result["id"] == "orchestrator"
        assert route.called

    async def test_get_agent_not_found(self):
        respx.get("http://backend:8080/api/agents/nonexistent").respond(404, json={"error": "not found"})
        result = await db.get_agent("nonexistent")
        assert result is None

    async def test_update_agent(self):
        route = respx.patch("http://backend:8080/api/agents/orchestrator").respond(200, json={"success": True})
        await db.update_agent("orchestrator", status="Working", current_room="War Room")
        assert route.called
        
        request = route.calls.last.request
        body = json.loads(request.content)
        assert body["status"] == "Working"
        assert body["current_room"] == "War Room"

    async def test_update_agent_no_changes(self):
        route = respx.patch("http://backend:8080/api/agents/orchestrator").respond(200)
        await db.update_agent("orchestrator")
        assert not route.called

    async def test_bulk_update_agents(self):
        await db.bulk_update_agents("Clocked Out", "Desks")
        # Currently a pass operation in python


@pytest.mark.asyncio
@respx.mock
class TestTaskOperations:
    async def test_get_all_tasks(self):
        respx.get("http://backend:8080/api/tasks").respond(
            200, json=[{"id": "1", "title": "Task 1", "assigned_agents": ["orchestrator"]}]
        )
        tasks = await db.get_all_tasks()
        assert len(tasks) == 1
        assert tasks[0]["assigned_agents"] == ["orchestrator"]

    async def test_get_tasks_by_agent(self):
        route = respx.get("http://backend:8080/api/tasks?agent_id=researcher").respond(
            200, json=[{"id": "1", "title": "Task 1"}]
        )
        tasks = await db.get_tasks_by_agent("researcher")
        assert len(tasks) == 1
        assert route.called

    async def test_create_task(self):
        route = respx.post("http://backend:8080/api/tasks").respond(
            200, json={"id": "42"}
        )
        task_id = await db.create_task(
            title="Test Task",
            description="Description",
            created_by="orchestrator",
            assigned_agents=["researcher"]
        )
        assert task_id == "42"
        assert route.called
        
        body = json.loads(route.calls.last.request.content)
        assert body["title"] == "Test Task"
        assert body["created_by"] == "orchestrator"
        assert body["assigned_agents"] == ["researcher"]

    async def test_update_task_status(self):
        route = respx.patch("http://backend:8080/api/tasks/task-1/status?status=In Progress").respond(200)
        await db.update_task_status("task-1", "In Progress")
        assert route.called


@pytest.mark.asyncio
@respx.mock
class TestMessageOperations:
    async def test_create_message(self):
        route = respx.post("http://backend:8080/api/messages").respond(200, json={"id": "99"})
        msg_id = await db.create_message("orchestrator", "researcher", "Hello", "chat")
        assert msg_id == "99"
        assert route.called
        body = json.loads(route.calls.last.request.content)
        assert body["content"] == "Hello"

    async def test_get_recent_messages(self):
        route = respx.get("http://backend:8080/api/messages?limit=10").respond(
            200, json=[{"id": "1", "content": "Hi"}]
        )
        msgs = await db.get_recent_messages(limit=10)
        assert len(msgs) == 1
        assert route.called


@pytest.mark.asyncio
@respx.mock
class TestStateOperations:
    async def test_get_state_version(self):
        respx.get("http://backend:8080/api/state").respond(200, json={"version": 5, "payload": {}})
        version = await db.get_state_version()
        assert version == 5

    async def test_get_state_version_fallback(self):
        respx.get("http://backend:8080/api/state").respond(500)
        version = await db.get_state_version()
        assert version == 0
