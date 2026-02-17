"""
Unit tests for database.py — Query parameter construction and pool lifecycle.
Uses mocked asyncpg.Pool to verify SQL correctness without a live database.
"""

import pytest
from unittest.mock import AsyncMock, patch
import json

import database as db


@pytest.fixture
def mock_pool():
    """Create a mock asyncpg Pool."""
    pool = AsyncMock()
    pool.fetch = AsyncMock(return_value=[])
    pool.fetchrow = AsyncMock(return_value=None)
    pool.execute = AsyncMock()
    return pool


@pytest.fixture
def patch_pool(mock_pool):
    """Patch the database._pool with a mock."""
    with patch.object(db, "_pool", mock_pool):
        with patch("database.get_pool", AsyncMock(return_value=mock_pool)):
            with patch("database.increment_state_version", AsyncMock()):
                yield mock_pool


@pytest.mark.asyncio
class TestGetPool:
    async def test_pool_is_none_initially(self):
        """The module-level _pool should be None before first call."""
        # Reset for test isolation
        original = db._pool
        db._pool = None
        assert db._pool is None
        db._pool = original  # Restore


@pytest.mark.asyncio
class TestGetAllAgents:
    async def test_returns_list_of_dicts(self, patch_pool):
        patch_pool.fetch.return_value = [
            {"id": "marco", "name": "Marco", "status": "Idle"},
        ]
        result = await db.get_all_agents()
        assert isinstance(result, list)
        patch_pool.fetch.assert_called_once()

    async def test_empty_result(self, patch_pool):
        patch_pool.fetch.return_value = []
        result = await db.get_all_agents()
        assert result == []


@pytest.mark.asyncio
class TestGetAgent:
    async def test_existing_agent(self, patch_pool):
        patch_pool.fetchrow.return_value = {"id": "marco", "name": "Marco"}
        result = await db.get_agent("marco")
        assert result["id"] == "marco"

    async def test_missing_agent_returns_none(self, patch_pool):
        patch_pool.fetchrow.return_value = None
        result = await db.get_agent("nonexistent")
        assert result is None


@pytest.mark.asyncio
class TestUpdateAgent:
    async def test_builds_correct_params(self, patch_pool):
        await db.update_agent("marco", status="Working", current_room="War Room")
        call_args = patch_pool.execute.call_args
        query = call_args[0][0]
        # Should have parameterized placeholders
        assert "$1" in query
        assert "status" in query.lower()
        assert "current_room" in query.lower()

    async def test_no_updates_skips_query(self, patch_pool):
        await db.update_agent("marco")
        # Should not call execute since no fields changed
        patch_pool.execute.assert_not_called()


@pytest.mark.asyncio
class TestBulkUpdateAgents:
    async def test_calls_execute(self, patch_pool):
        await db.bulk_update_agents("Clocked Out", "Desks")
        patch_pool.execute.assert_called_once()
        args = patch_pool.execute.call_args[0]
        assert "Clocked Out" in args
        assert "Desks" in args


@pytest.mark.asyncio
class TestCreateTask:
    async def test_returns_task_id(self, patch_pool):
        patch_pool.fetchrow.return_value = {"id": 42}
        result = await db.create_task(
            title="Test Task",
            description="Description",
            created_by="marco",
            assigned_agents=["mona"],
        )
        assert result == "42"

    async def test_assigns_agents(self, patch_pool):
        patch_pool.fetchrow.return_value = {"id": 1}
        await db.create_task(
            title="Test",
            assigned_agents=["mona", "dan"],
        )
        # fetchrow for INSERT + 2x execute for assignments
        assert patch_pool.execute.call_count == 2

    async def test_no_agents_skips_assignment(self, patch_pool):
        patch_pool.fetchrow.return_value = {"id": 1}
        await db.create_task(title="Test")
        assert patch_pool.execute.call_count == 0


@pytest.mark.asyncio
class TestUpdateTaskStatus:
    async def test_correct_parameter_order(self, patch_pool):
        """Verify the fixed version: status=$1, task_id=$2."""
        await db.update_task_status("task-1", "In Progress")
        call_args = patch_pool.execute.call_args[0]
        query = call_args[0]
        assert "status = $1" in query
        assert "WHERE id = $2" in query
        assert call_args[1] == "In Progress"
        assert call_args[2] == "task-1"


@pytest.mark.asyncio
class TestCreateMessage:
    async def test_returns_message_id(self, patch_pool):
        patch_pool.fetchrow.return_value = {"id": 99}
        result = await db.create_message("marco", "mona", "Hello", "chat")
        assert result == "99"


@pytest.mark.asyncio
class TestRecordCost:
    async def test_calls_execute(self, patch_pool):
        await db.record_cost("marco", 1000, 500, 0.005)
        patch_pool.execute.assert_called_once()
        args = patch_pool.execute.call_args[0]
        assert "marco" in args
        assert 1000 in args


@pytest.mark.asyncio
class TestLogActivity:
    async def test_serializes_details(self, patch_pool):
        await db.log_activity("marco", "test_action", {"key": "value"})
        patch_pool.execute.assert_called_once()
        args = patch_pool.execute.call_args[0]
        # Details should be JSON serialized
        assert json.loads(args[3]) == {"key": "value"}


@pytest.mark.asyncio
class TestGetAllTasks:
    async def test_fetches_tasks_and_assignees_in_one_query(self, patch_pool):
        # Mock return value for the optimized query
        patch_pool.fetch.return_value = [
            {
                "id": 1,
                "title": "Task 1",
                "assigned_agents": ["marco", "mona"],  # array_agg result
                "created_at": "2023-01-01",
                "updated_at": "2023-01-01",
            },
            {
                "id": 2,
                "title": "Task 2",
                "assigned_agents": [],
                "created_at": "2023-01-02",
                "updated_at": "2023-01-02",
            },
        ]

        tasks = await db.get_all_tasks()

        assert len(tasks) == 2
        assert tasks[0]["assigned_agents"] == ["marco", "mona"]
        assert tasks[1]["assigned_agents"] == []

        # verification: only ONE fetch call should be made
        assert patch_pool.fetch.call_count == 1


@pytest.mark.asyncio
class TestDeltaPublishing:
    async def test_update_agent_publishes_delta(self, patch_pool):
        # Mock get_agent to return the "updated" agent
        agent_data = {"id": "marco", "status": "Busy"}
        with patch("database.get_agent", AsyncMock(return_value=agent_data)):
            with patch("redis_client.publish_delta", AsyncMock()) as mock_publish:
                await db.update_agent("marco", status="Busy")
                # Wait for any background tasks if necessary, but here it's direct
                mock_publish.assert_called_once_with("agents", "marco", agent_data)

    async def test_create_task_publishes_delta(self, patch_pool):
        task_data = {"id": "1", "title": "New Task"}
        patch_pool.fetchrow.return_value = {"id": 1}
        with patch("database.get_task", AsyncMock(return_value=task_data)):
            with patch("redis_client.publish_delta", AsyncMock()) as mock_publish:
                await db.create_task(title="New Task")
                mock_publish.assert_called_once_with("tasks", "1", task_data)

    async def test_create_message_publishes_delta(self, patch_pool):
        msg_data = {"id": "100", "content": "Hello"}
        patch_pool.fetchrow.return_value = {"id": 100}
        with patch("database.get_message", AsyncMock(return_value=msg_data)):
            with patch("redis_client.publish_delta", AsyncMock()) as mock_publish:
                await db.create_message("agent_a", "agent_b", "Hello")
                mock_publish.assert_called_once_with("messages", "100", msg_data)
