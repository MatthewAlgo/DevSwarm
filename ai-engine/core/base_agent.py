"""
BaseAgent — Abstract base class for all DevSwarm AI agents.
Implements the Template Method pattern: subclasses define their chain,
BaseAgent orchestrates the lifecycle (status transitions, DB updates, error handling).
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Optional, Type

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableConfig
from pydantic import BaseModel

from core.context import AgentContext, LiveContext
from core.llm import get_llm
from core.state import OfficeState

logger = logging.getLogger("devswarm.core.base_agent")


class BaseAgent(ABC):
    """
    Abstract base class all DevSwarm agents inherit from.

    Subclasses implement:
      - `output_schema` (class var): Pydantic model for structured output
      - `build_prompt()`: returns a ChatPromptTemplate
      - `execute(state, parsed_output, context)`: applies parsed LLM output to state

    The base class handles:
      - Chain construction (prompt | llm | parser)
      - Status transitions (Idle → Working → Idle/Error)
      - Error handling with graceful degradation
      - Activity logging
    """

    agent_id: str
    name: str
    role: str
    default_room: str
    output_schema: Type[BaseModel]

    _UNSET = object()  # Sentinel for lazy LLM init

    def __init__(
        self,
        context: Optional[AgentContext] = None,
        llm: Optional[Runnable] = None,
    ):
        """
        Args:
            context: AgentContext for DB operations. Defaults to LiveContext.
            llm: LangChain LLM runnable. Defaults to Gemini via get_llm() (lazy).
        """
        self.context = context or LiveContext()
        self._llm = llm if llm is not None else self._UNSET
        self._chain: Optional[Runnable] = None

    @property
    def llm(self) -> Runnable:
        """Lazy-initialized LLM. Only calls get_llm() on first access."""
        if self._llm is self._UNSET:
            self._llm = get_llm()
        return self._llm

    @llm.setter
    def llm(self, value: Runnable) -> None:
        self._llm = value

    @property
    def parser(self) -> PydanticOutputParser:
        """Pydantic output parser for this agent's schema."""
        return PydanticOutputParser(pydantic_object=self.output_schema)

    @abstractmethod
    def build_prompt(self) -> ChatPromptTemplate:
        """
        Build the ChatPromptTemplate for this agent.
        Must include `{format_instructions}` placeholder for the output parser.
        """
        ...

    @abstractmethod
    async def execute(
        self,
        state: OfficeState,
        parsed: BaseModel,
        context: AgentContext,
    ) -> OfficeState:
        """
        Apply the parsed LLM output to the office state.
        This is where agent-specific logic lives (creating tasks, messages, etc).
        """
        ...

    def build_chain(self) -> Runnable:
        """Construct the LangChain chain: prompt | llm | parser."""
        prompt = self.build_prompt()
        chain = prompt | self.llm | self.parser
        return chain

    @property
    def chain(self) -> Runnable:
        """Lazy-initialized chain (built once, cached)."""
        if self._chain is None:
            self._chain = self.build_chain()
        return self._chain

    async def process(
        self,
        state: OfficeState,
        context: Optional[AgentContext] = None,
    ) -> OfficeState:
        """
        Full agent lifecycle:
        1. Set status to Working
        2. Invoke the LangChain chain
        3. Apply parsed output via execute()
        4. Set status to Idle
        5. Log activity

        On error: set status to Error, record in state, log.
        """
        ctx = context or self.context
        agent_logger = logging.getLogger(f"devswarm.agents.{self.agent_id}")

        try:
            # 1. Set Working
            agent_logger.info(f"{self.name} starting work")
            await ctx.update_agent(
                self.agent_id,
                current_room=self.default_room,
                status="Working",
                thought_chain=f"Analyzing request and preparing {self.role.lower()} response...",
            )

            # 2. Build chain input
            chain_input = self._build_chain_input(state)

            # 3. Invoke chain
            agent_logger.info(f"{self.name} invoking LLM chain")
            parsed = await self.chain.ainvoke(
                chain_input,
                config=RunnableConfig(run_name=f"{self.name}_chain"),
            )
            agent_logger.info(f"{self.name} chain returned {type(parsed).__name__}")

            # 4. Execute agent-specific logic
            state = await self.execute(state, parsed, ctx)

            # 5. Set Idle
            await ctx.update_agent(
                self.agent_id,
                status="Idle",
                current_task="",
                thought_chain=f"Task complete. {self.role} work finished successfully.",
            )

            # 6. Log activity
            await ctx.log_activity(
                self.agent_id,
                f"{self.agent_id}_complete",
                {"output_type": type(parsed).__name__},
            )

            return state

        except Exception as e:
            agent_logger.error(f"{self.name} error: {e}", exc_info=True)

            await ctx.update_agent(
                self.agent_id,
                status="Error",
                thought_chain=f"Error encountered: {str(e)[:200]}",
            )

            await ctx.log_activity(
                self.agent_id,
                f"{self.agent_id}_error",
                {"error": str(e)[:500]},
            )

            state["error"] = str(e)
            return state

    def _build_chain_input(self, state: OfficeState) -> dict[str, Any]:
        """Build the input dict for the chain from the current state."""
        return {
            "current_goal": state.get("current_goal", ""),
            "active_tasks": ", ".join(state.get("active_tasks", [])) or "None",
            "delegated_agents": ", ".join(state.get("delegated_agents", [])) or "None",
            "research_findings": str(state.get("research_findings", {})) or "None",
            "content_drafts": str(state.get("content_drafts", [])) or "None",
            "crawl_results": str(state.get("crawl_results", [])) or "None",
            "health_report": str(state.get("health_report", {})) or "None",
            "error": state.get("error", ""),
            "format_instructions": self.parser.get_format_instructions(),
        }
