"""
Agent Registry — Central registry of all DevSwarm agents.
Provides lookup by ID and iteration over all agents.
"""

from __future__ import annotations

from typing import Optional

from core.base_agent import BaseAgent
from core.context import AgentContext

from agents.marco.agent import MarcoAgent
from agents.jimmy.agent import JimmyAgent
from agents.mona.agent import MonaAgent
from agents.dan.agent import DanAgent
from agents.tonny.agent import TonnyAgent
from agents.bob.agent import BobAgent
from agents.ariani.agent import ArianiAgent
from agents.peter.agent import PeterAgent

# All agent classes in the order they appear on the office floor
AGENT_CLASSES = [
    MarcoAgent,
    JimmyAgent,
    MonaAgent,
    DanAgent,
    TonnyAgent,
    BobAgent,
    ArianiAgent,
    PeterAgent,
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
