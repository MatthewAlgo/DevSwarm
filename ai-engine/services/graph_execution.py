"""
Graph execution service.
Coordinates graph invocation, task reconciliation, and post-run dispatching.
"""

from __future__ import annotations

import logging
from typing import Any, Protocol

from core.state import OfficeState

logger = logging.getLogger("devswarm.services.graph_execution")


class DatabasePort(Protocol):
    async def log_activity(self, agent_id: str, action: str, details: Any = None) -> None: ...


class DispatcherPort(Protocol):
    async def finalize_primary_task(self, graph_result: dict) -> None: ...
    async def dispatch_idle_agents(self) -> None: ...


class GraphPort(Protocol):
    async def ainvoke(self, state: OfficeState) -> dict: ...


class GraphExecutionService:
    """Single-responsibility wrapper around graph workflow runs."""

    def __init__(
        self,
        graph: GraphPort,
        dispatcher: DispatcherPort,
        db: DatabasePort,
    ):
        self._graph = graph
        self._dispatcher = dispatcher
        self._db = db

    async def run(self, initial_state: OfficeState, goal: str) -> None:
        """Execute the LangGraph workflow in the background."""
        try:
            logger.info("Starting graph execution for goal: %s", goal)
            result = await self._graph.ainvoke(initial_state)
            logger.info("Graph execution complete for goal: %s", goal)

            await self._dispatcher.finalize_primary_task(result)
            await self._dispatcher.dispatch_idle_agents()

            await self._db.log_activity(
                "system",
                "graph_complete",
                {
                    "goal": goal,
                    "delegated": result.get("delegated_agents", []),
                },
            )
        except Exception as exc:
            logger.error("Graph execution error: %s", exc)
            await self._db.log_activity(
                "system",
                "graph_error",
                {
                    "goal": goal,
                    "error": str(exc),
                },
            )

