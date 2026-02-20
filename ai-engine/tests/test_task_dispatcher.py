from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from core.state import create_initial_state
from models import TaskStatusEnum
from services.agent_dispatcher import AgentTaskDispatcher
from services.graph_execution import GraphExecutionService


def test_devops_completion_message_keeps_full_diagnosis_text():
    dispatcher = AgentTaskDispatcher(db=SimpleNamespace(), agent_registry={})
    long_diagnosis = (
        "All systems operational. DevSwarm agents are reporting normal heartbeat signals. "
        "No anomalies detected in the current execution context. The initial ping confirms "
        "that the monitoring and orchestration loop is stable across all active services."
    )

    message = dispatcher._build_user_completion_message(
        "devops",
        "Comprehensive health check",
        {
            "health_report": {
                "system_status": "healthy",
                "diagnosis": long_diagnosis,
                "agents_recovered": 0,
            }
        },
    )

    assert f"Diagnosis: {long_diagnosis}" in message


def test_failure_message_keeps_full_error_text():
    dispatcher = AgentTaskDispatcher(db=SimpleNamespace(), agent_registry={})
    long_error = (
        "Connection timeout while reaching the orchestration endpoint after repeated retries. "
        "Trace captured for transport, DNS resolution, and TLS handshake diagnostics."
    )

    message = dispatcher._build_user_failure_message(
        "devops", "Comprehensive health check", long_error
    )

    assert f"Error: {long_error}" in message


@pytest.mark.asyncio
async def test_run_agent_queue_executes_pending_tasks():
    db = SimpleNamespace(
        get_agent=AsyncMock(return_value={"id": "researcher", "status": "Idle"}),
        get_tasks_by_agent=AsyncMock(
            side_effect=[
                [
                    {
                        "id": "task-1",
                        "title": "Research report",
                        "description": "Deep dive",
                        "status": "Backlog",
                    }
                ],
                [],
            ]
        ),
    )
    registry = {"researcher": SimpleNamespace(process=AsyncMock(return_value={}))}
    dispatcher = AgentTaskDispatcher(db=db, agent_registry=registry)
    dispatcher.execute_assigned_task = AsyncMock()

    await dispatcher.run_agent_queue("researcher")

    dispatcher.execute_assigned_task.assert_awaited_once()


@pytest.mark.asyncio
async def test_execute_assigned_task_blocks_unknown_agent():
    db = SimpleNamespace(
        update_task_status=AsyncMock(),
        log_activity=AsyncMock(),
    )
    dispatcher = AgentTaskDispatcher(db=db, agent_registry={})

    await dispatcher.execute_assigned_task(
        "unknown_agent",
        {
            "id": "task-404",
            "title": "Ghost task",
            "description": "",
            "status": "Backlog",
        },
    )

    db.update_task_status.assert_awaited_once_with(
        "task-404", TaskStatusEnum.BLOCKED.value
    )
    db.log_activity.assert_awaited()


@pytest.mark.asyncio
async def test_graph_execution_completes_primary_and_dispatches():
    graph = SimpleNamespace(
        ainvoke=AsyncMock(
            return_value={
                "delegated_agents": ["researcher", "archivist"],
                "delegated_task_ids": ["task-1", "task-2"],
                "error": "",
            }
        )
    )
    dispatcher = SimpleNamespace(
        finalize_primary_task=AsyncMock(),
        dispatch_idle_agents=AsyncMock(),
    )
    db = SimpleNamespace(log_activity=AsyncMock())

    service = GraphExecutionService(graph=graph, dispatcher=dispatcher, db=db)
    await service.run(create_initial_state("Test goal"), "Test goal")

    dispatcher.finalize_primary_task.assert_awaited_once()
    dispatcher.dispatch_idle_agents.assert_awaited_once()
    db.log_activity.assert_awaited()


@pytest.mark.asyncio
async def test_finalize_primary_task_sends_orchestrator_user_update():
    db = SimpleNamespace(
        get_task=AsyncMock(
            return_value={
                "id": "task-1",
                "title": "Run health check",
                "status": TaskStatusEnum.IN_PROGRESS.value,
            }
        ),
        update_task_status=AsyncMock(),
        create_message=AsyncMock(),
        log_activity=AsyncMock(),
    )
    dispatcher = AgentTaskDispatcher(db=db, agent_registry={})

    await dispatcher.finalize_primary_task(
        {
            "delegated_agents": ["devops"],
            "delegated_task_ids": ["task-1"],
            "error": "",
            "health_report": {
                "system_status": "healthy",
                "diagnosis": "All systems nominal.",
                "agents_recovered": 0,
            },
        }
    )

    assert db.create_message.await_count == 2
    messages = [call.kwargs for call in db.create_message.await_args_list]
    assert any(
        m["from_agent"] == "orchestrator"
        and m["to_agent"] == "user"
        and "Status update" in m["content"]
        for m in messages
    )


@pytest.mark.asyncio
async def test_execute_assigned_task_sends_orchestrator_user_update():
    db = SimpleNamespace(
        update_task_status=AsyncMock(),
        update_agent=AsyncMock(),
        create_message=AsyncMock(),
        log_activity=AsyncMock(),
    )
    registry = {
        "crawler": SimpleNamespace(
            process=AsyncMock(
                return_value={
                    "crawl_results": [
                        {"topic": "UTC Connectivity Verification", "summary": "ok"}
                    ]
                }
            )
        )
    }
    dispatcher = AgentTaskDispatcher(db=db, agent_registry=registry)
    dispatcher.move_task_forward = AsyncMock()

    await dispatcher.execute_assigned_task(
        "crawler",
        {
            "id": "task-2",
            "title": "Run connectivity test",
            "description": "",
            "status": TaskStatusEnum.BACKLOG.value,
        },
    )

    assert db.create_message.await_count == 2
    messages = [call.kwargs for call in db.create_message.await_args_list]
    assert any(
        m["from_agent"] == "orchestrator"
        and m["to_agent"] == "user"
        and "Status update" in m["content"]
        for m in messages
    )
