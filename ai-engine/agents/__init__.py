"""
Agent Registry — Central registry of all DevSwarm agents.
Provides lookup by ID and iteration over all agents.
"""

from __future__ import annotations

from typing import Any, Optional

from core.base_agent import BaseAgent
from core.context import AgentContext

from agents.orchestrator.agent import OrchestratorAgent
from agents.crawler.agent import CrawlerAgent
from agents.researcher.agent import ResearcherAgent
from agents.viral_engineer.agent import ViralEngineerAgent
from agents.comms.agent import CommsAgent
from agents.devops.agent import DevOpsAgent
from agents.archivist.agent import ArchivistAgent
from agents.frontend_designer.agent import FrontendDesignerAgent

# All agent classes in the order they appear on the office floor
AGENT_CLASSES: list[type[BaseAgent[Any]]] = [
    OrchestratorAgent,
    CrawlerAgent,
    ResearcherAgent,
    ViralEngineerAgent,
    CommsAgent,
    DevOpsAgent,
    ArchivistAgent,
    FrontendDesignerAgent,
]


class AgentRegistry:
    """
    Registry that manages agent instances with shared context.
    Supports lookup by agent_id and iteration.
    """

    def __init__(self, context: Optional[AgentContext] = None):
        self._agents: dict[str, BaseAgent] = {}
        for cls in AGENT_CLASSES:
            instance = cls(context=context) if context else cls()
            self._agents[instance.agent_id] = instance

    def get(self, agent_id: str) -> Optional[BaseAgent]:
        """Get an agent by ID."""
        return self._agents.get(agent_id)

    def __getitem__(self, agent_id: str) -> BaseAgent:
        return self._agents[agent_id]

    def __contains__(self, agent_id: str) -> bool:
        return agent_id in self._agents

    def __iter__(self):
        return iter(self._agents.values())

    def __len__(self) -> int:
        return len(self._agents)

    @property
    def ids(self) -> list[str]:
        """All registered agent IDs."""
        return list(self._agents.keys())
