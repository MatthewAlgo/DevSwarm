"""
Redis stream worker service.
Consumes queued goals and executes the orchestration graph.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Protocol

from core.state import create_initial_state

logger = logging.getLogger("devswarm.services.task_queue")


class RedisQueuePort(Protocol):
    async def dequeue_tasks(self, count: int = 1, block_ms: int = 5000) -> list[dict]: ...
    async def ack_task(self, msg_id: str) -> int: ...


class GraphRunnerPort(Protocol):
    async def run(self, initial_state: dict, goal: str) -> None: ...


class DatabasePort(Protocol):
    async def log_activity(self, agent_id: str, action: str, details: Any = None) -> None: ...


class TaskQueueWorker:
    """Durable queue worker for triggered goals."""

    def __init__(
        self,
        redis_queue: RedisQueuePort,
        graph_runner: GraphRunnerPort,
        db: DatabasePort,
    ):
        self._redis = redis_queue
        self._graph_runner = graph_runner
        self._db = db

    async def run(self) -> None:
        logger.info("[Worker] Task queue worker started")

        while True:
            try:
                tasks = await self._redis.dequeue_tasks(count=1, block_ms=5000)
                for task in tasks:
                    goal = task.get("goal", "")
                    task_id = task.get("id", "")
                    logger.info("[Worker] Processing task: %s", goal[:60])
                    try:
                        initial_state = create_initial_state(goal)
                        await self._graph_runner.run(initial_state, goal)
                        await self._redis.ack_task(task_id)
                        logger.info("[Worker] Task completed: %s", task_id)
                    except Exception as exc:
                        logger.error("[Worker] Task failed: %s — %s", task_id, exc)
                        await self._redis.ack_task(task_id)
                        await self._db.log_activity(
                            "system",
                            "task_queue_error",
                            {
                                "task_id": task_id,
                                "goal": goal,
                                "error": str(exc),
                            },
                        )
            except asyncio.CancelledError:
                logger.info("[Worker] Task queue worker shutting down")
                return
            except Exception as exc:
                logger.error("[Worker] Stream read error: %s", exc)
                await asyncio.sleep(2)

