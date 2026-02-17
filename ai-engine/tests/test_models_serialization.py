import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from main import app

client = TestClient(app)


@pytest.mark.asyncio
async def test_list_agents_serialization():
    """Verify that agents are serialized with camelCase keys matching Go backend."""

    # Mock data with snake_case keys (as returned by DB)
    mock_agents = [
        {
            "id": "agent-123",
            "name": "Test Agent",
            "role": "Tester",
            "current_room": "Desks",
            "status": "Idle",
            "current_task": "Testing serialization",
            "thought_chain": "Checking keys...",
            "tech_stack": ["Python", "Pydantic"],
            "avatar_color": "#000000",
            "updated_at": "2023-01-01T12:00:00",
        }
    ]

    with patch("database.get_all_agents", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_agents

        response = client.get(
            "/api/agents", headers={"Authorization": "Bearer devswarm-secret-key"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        agent = data[0]

        # Verify camelCase keys (from Pydantic aliases)
        assert "id" in agent
        assert "room" in agent
        assert agent["room"] == "Desks"
        assert "currentTask" in agent
        assert agent["currentTask"] == "Testing serialization"
        assert "thoughtChain" in agent
        assert "techStack" in agent
        assert "avatarColor" in agent

        # Verify snake_case keys are NOT present
        assert "current_room" not in agent
        assert "current_task" not in agent
