"""
Agent task dispatcher service.
Owns task progression and idle-agent queue draining behavior.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Protocol

from core.state import create_initial_state
from models import AgentStatusEnum, TaskStatusEnum

logger = logging.getLogger("devswarm.services.dispatcher")

PENDING_TASK_STATUSES = {
    TaskStatusEnum.BACKLOG.value,
    TaskStatusEnum.IN_PROGRESS.value,
    TaskStatusEnum.REVIEW.value,
}
BUSY_AGENT_STATUSES = {
    AgentStatusEnum.WORKING.value,
    AgentStatusEnum.MEETING.value,
    AgentStatusEnum.ERROR.value,
    AgentStatusEnum.CLOCKED_OUT.value,
}


class DatabasePort(Protocol):
    async def get_task(self, task_id: str) -> dict | None: ...
    async def get_agent(self, agent_id: str) -> dict | None: ...
    async def get_all_agents(self) -> list[dict]: ...
    async def get_tasks_by_agent(self, agent_id: str) -> list[dict]: ...
    async def update_agent(
        self,
        agent_id: str,
        current_room: str | None = None,
        status: str | None = None,
        current_task: str | None = None,
        thought_chain: str | None = None,
    ) -> None: ...
    async def update_task_status(self, task_id: str, status: str) -> None: ...
    async def create_message(
        self,
        from_agent: str,
        to_agent: str,
        content: str,
        message_type: str = "chat",
    ) -> str: ...
    async def log_activity(self, agent_id: str, action: str, details: Any = None) -> None: ...


class AgentRegistryPort(Protocol):
    def __contains__(self, agent_id: str) -> bool: ...
    def __getitem__(self, agent_id: str) -> Any: ...


class AgentTaskDispatcher:
    """Executes assigned tasks and keeps task/agent state in sync."""

    def __init__(
        self,
        db: DatabasePort,
        agent_registry: AgentRegistryPort,
    ):
        self._db = db
        self._registry = agent_registry
        self._dispatch_lock = asyncio.Lock()
        self._agent_locks: dict[str, asyncio.Lock] = {}

    def _get_agent_lock(self, agent_id: str) -> asyncio.Lock:
        lock = self._agent_locks.get(agent_id)
        if lock is None:
            lock = asyncio.Lock()
            self._agent_locks[agent_id] = lock
        return lock

    @staticmethod
    def _task_goal(task: dict) -> str:
        title = (task.get("title") or "").strip()
        description = (task.get("description") or "").strip()
        if not description:
            return title
        return f"{title}\n\nTask context: {description}"

    @staticmethod
    def _display_agent_name(agent_id: str) -> str:
        return agent_id.replace("_", " ").title()

    @staticmethod
    def _clean_message_text(text: str) -> str:
        return " ".join((text or "").split())

    def _build_user_completion_message(
        self, agent_id: str, task_title: str, result: dict
    ) -> str:
        task_label = task_title or "delegated task"
        agent_name = self._display_agent_name(agent_id)

        if agent_id == "devops":
            health = result.get("health_report") or {}
            status = str(health.get("system_status") or "unknown")
            diagnosis = self._clean_message_text(
                str(health.get("diagnosis") or "No diagnosis")
            )
            recovered = int(health.get("agents_recovered") or 0)
            return (
                f"Status update: DevOps completed '{task_label}'. "
                f"System status: {status}. Recovered agents: {recovered}. "
                f"Diagnosis: {diagnosis}"
            )

        if agent_id == "crawler":
            crawl_results = result.get("crawl_results") or []
            count = len(crawl_results)
            top_topic = ""
            if count > 0 and isinstance(crawl_results[0], dict):
                top_topic = self._clean_message_text(
                    str(crawl_results[0].get("topic") or "")
                )
            if top_topic:
                return (
                    f"Status update: Crawler completed '{task_label}' with {count} findings. "
                    f"Top finding: {top_topic}."
                )
            return (
                f"Status update: Crawler completed '{task_label}' with {count} findings."
            )

        if agent_id == "researcher":
            findings = result.get("research_findings") or {}
            title = self._clean_message_text(str(findings.get("title") or ""))
            if title:
                return (
                    f"Status update: Researcher completed '{task_label}'. "
                    f"Report: {title}."
                )

        if agent_id == "viral_engineer":
            drafts = result.get("content_drafts") or []
            return (
                f"Status update: Viral Engineer completed '{task_label}' and produced "
                f"{len(drafts)} content draft(s)."
            )

        if agent_id == "archivist":
            organized = int(result.get("kb_entries_organized") or 0)
            return (
                f"Status update: Archivist completed '{task_label}' and organized "
                f"{organized} knowledge-base entries."
            )

        if agent_id == "comms":
            processed = int(result.get("comms_processed") or 0)
            return (
                f"Status update: Comms completed '{task_label}' and processed "
                f"{processed} communication item(s)."
            )

        return f"Status update: {agent_name} completed '{task_label}'."

    def _build_user_failure_message(
        self, agent_id: str, task_title: str, error: str
    ) -> str:
        task_label = task_title or "delegated task"
        agent_name = self._display_agent_name(agent_id)
        return (
            f"Status update: {agent_name} could not complete '{task_label}'. "
            f"Error: {self._clean_message_text(error)}"
        )

    async def _notify_task_success(
        self, agent_id: str, task_id: str, task_title: str, result: dict
    ) -> None:
        await self._db.create_message(
            from_agent=agent_id,
            to_agent="orchestrator",
            content=f"Task complete ({task_id}): {task_title}",
            message_type="task_complete",
        )
        await self._db.create_message(
            from_agent="orchestrator",
            to_agent="user",
            content=self._build_user_completion_message(agent_id, task_title, result),
            message_type="chat",
        )

    async def _notify_task_failure(
        self, agent_id: str, task_id: str, task_title: str, error: str
    ) -> None:
        await self._db.create_message(
            from_agent="system",
            to_agent="orchestrator",
            content=f"Task blocked ({task_id}) for {agent_id}: {error}",
            message_type="error",
        )
        await self._db.create_message(
            from_agent="orchestrator",
            to_agent="user",
            content=self._build_user_failure_message(agent_id, task_title, error),
            message_type="chat",
        )

    async def move_task_forward(self, task_id: str) -> None:
        """Progress a task through Review -> Done."""
        task = await self._db.get_task(task_id)
        if not task:
            return

        current_status = task.get("status")
        if current_status in {TaskStatusEnum.DONE.value, TaskStatusEnum.BLOCKED.value}:
            return

        if current_status != TaskStatusEnum.REVIEW.value:
            await self._db.update_task_status(task_id, TaskStatusEnum.REVIEW.value)

        await self._db.update_task_status(task_id, TaskStatusEnum.DONE.value)

    async def finalize_primary_task(self, graph_result: dict) -> None:
        """
        The graph executes the first delegated specialist directly.
        Mark that task complete to avoid stale "In Progress" state.
        """
        delegated_agents = graph_result.get("delegated_agents") or []
        delegated_task_ids = graph_result.get("delegated_task_ids") or []
        if not delegated_agents or not delegated_task_ids:
            return

        primary_agent = delegated_agents[0]
        primary_task_id = str(delegated_task_ids[0])
        primary_task = await self._db.get_task(primary_task_id)
        task_title = (
            str((primary_task or {}).get("title") or "").strip()
            or "Primary delegated task"
        )
        lock = self._get_agent_lock(primary_agent)
        async with lock:
            if graph_result.get("error"):
                await self._db.update_task_status(
                    primary_task_id, TaskStatusEnum.BLOCKED.value
                )
                await self._notify_task_failure(
                    primary_agent,
                    primary_task_id,
                    task_title,
                    str(graph_result.get("error") or "Unknown error"),
                )
            else:
                await self.move_task_forward(primary_task_id)
                await self._notify_task_success(
                    primary_agent,
                    primary_task_id,
                    task_title,
                    graph_result,
                )
                await self._db.log_activity(
                    primary_agent,
                    "task_completed",
                    {"task_id": primary_task_id, "title": task_title},
                )

    async def execute_assigned_task(self, agent_id: str, task: dict) -> None:
        """Run one assigned task with an agent and move task status progressively."""
        task_id = str(task.get("id", ""))
        if not task_id:
            return

        if agent_id not in self._registry:
            logger.warning("Task %s assigned to unknown agent %s", task_id, agent_id)
            await self._db.update_task_status(task_id, TaskStatusEnum.BLOCKED.value)
            await self._db.log_activity(
                "system",
                "task_blocked_unknown_agent",
                {"task_id": task_id, "agent_id": agent_id},
            )
            return

        try:
            if task.get("status") != TaskStatusEnum.IN_PROGRESS.value:
                await self._db.update_task_status(task_id, TaskStatusEnum.IN_PROGRESS.value)

            await self._db.update_agent(
                agent_id,
                status=AgentStatusEnum.WORKING.value,
                current_task=task.get("title", ""),
                thought_chain=f"Executing assigned task: {task.get('title', '')}",
            )

            state = create_initial_state(self._task_goal(task))
            state["active_tasks"] = [task.get("title", "")]
            result = await self._registry[agent_id].process(state)

            if result.get("error"):
                raise RuntimeError(result["error"])

            await self.move_task_forward(task_id)
            await self._notify_task_success(
                agent_id,
                task_id,
                task.get("title", ""),
                result,
            )
            await self._db.log_activity(
                agent_id,
                "task_completed",
                {"task_id": task_id, "title": task.get("title", "")},
            )
        except Exception as exc:
            logger.error(
                "Agent task execution failed for %s on %s: %s", agent_id, task_id, exc
            )
            await self._db.update_task_status(task_id, TaskStatusEnum.BLOCKED.value)
            await self._notify_task_failure(
                agent_id,
                task_id,
                task.get("title", ""),
                str(exc),
            )
            await self._db.log_activity(
                "system",
                "task_blocked_error",
                {"task_id": task_id, "agent_id": agent_id, "error": str(exc)},
            )

    async def run_agent_queue(self, agent_id: str) -> None:
        """Drain pending tasks for a single agent."""
        lock = self._get_agent_lock(agent_id)
        if lock.locked():
            return

        async with lock:
            while True:
                agent = await self._db.get_agent(agent_id)
                if not agent:
                    return

                if agent.get("status") in BUSY_AGENT_STATUSES:
                    return

                assigned_tasks = await self._db.get_tasks_by_agent(agent_id)
                pending = [
                    task
                    for task in assigned_tasks
                    if task.get("status") in PENDING_TASK_STATUSES
                ]
                if not pending:
                    return

                await self.execute_assigned_task(agent_id, pending[0])

    async def dispatch_idle_agents(self) -> None:
        """Assign work to idle agents by consuming their pending task queue."""
        if self._dispatch_lock.locked():
            return

        async with self._dispatch_lock:
            agents = await self._db.get_all_agents()
            idle_ids: list[str] = []
            for agent in agents:
                agent_id = agent.get("id")
                if (
                    agent.get("status") == AgentStatusEnum.IDLE.value
                    and isinstance(agent_id, str)
                    and agent_id in self._registry
                ):
                    idle_ids.append(agent_id)
            if not idle_ids:
                return

            await asyncio.gather(
                *[self.run_agent_queue(agent_id) for agent_id in idle_ids],
                return_exceptions=True,
            )

    async def run_forever(self, interval_seconds: float = 1.5) -> None:
        """Periodic scheduler: when an agent is free, it drains assigned tasks."""
        logger.info("[Dispatcher] Agent task dispatcher started")
        while True:
            try:
                await self.dispatch_idle_agents()
                await asyncio.sleep(interval_seconds)
            except asyncio.CancelledError:
                logger.info("[Dispatcher] Agent task dispatcher shutting down")
                return
            except Exception as exc:
                logger.error("[Dispatcher] Error while dispatching tasks: %s", exc)
                await asyncio.sleep(2)
