"""
DevSwarm AI Engine — LangGraph Orchestration Graph
Stateful graph with conditional edges for multi-agent routing.
Uses AgentRegistry for clean agent management.
"""

import logging

from langgraph.graph import StateGraph, END

from core.state import OfficeState, create_initial_state
from core.context import LiveContext
from agents import AgentRegistry

logger = logging.getLogger("devswarm.graph")

# Shared registry with production context
_context = LiveContext()
registry = AgentRegistry(context=_context)


# --- Node Wrappers ---
# Each creates a closure that calls agent.process(state) with the live context.

async def marco_node(state: OfficeState) -> OfficeState:
    """Marco evaluates high-level goals and delegates sub-tasks."""
    return await registry["marco"].process(state)

async def jimmy_node(state: OfficeState) -> OfficeState:
    """Jimmy crawls the web for trending content."""
    return await registry["jimmy"].process(state)

async def mona_node(state: OfficeState) -> OfficeState:
    """Mona Lisa performs deep research."""
    return await registry["mona"].process(state)

async def dan_node(state: OfficeState) -> OfficeState:
    """Dan creates viral content from research."""
    return await registry["dan"].process(state)

async def tonny_node(state: OfficeState) -> OfficeState:
    """Tonny handles communications."""
    return await registry["tonny"].process(state)

async def bob_node(state: OfficeState) -> OfficeState:
    """Bob monitors system health."""
    return await registry["bob"].process(state)

async def ariani_node(state: OfficeState) -> OfficeState:
    """Ariani organizes the knowledge base."""
    return await registry["ariani"].process(state)

async def peter_node(state: OfficeState) -> OfficeState:
    """Peter creates and critiques designs."""
    return await registry["peter"].process(state)


# --- Conditional Routing ---

def route_from_marco(state: OfficeState) -> str:
    """Determine which agent to route to after Marco's evaluation."""
    delegated = state.get("delegated_agents", [])
    if not delegated:
        return "Jimmy"

    agent_map = {
        "jimmy": "Jimmy",
        "mona": "MonaLisa",
        "dan": "Dan",
        "tonny": "Tonny",
        "bob": "Bob",
        "ariani": "Ariani",
        "peter": "Peter",
    }
    return agent_map.get(delegated[0], "Jimmy")


def route_after_research(state: OfficeState) -> str:
    """After research, route to Dan for content creation or Ariani for archiving."""
    if state.get("research_findings"):
        return "Dan"
    return "Ariani"


def route_after_content(state: OfficeState) -> str:
    """After content creation, route to Ariani for knowledge base update."""
    return "Ariani"


def should_run_health_check(state: OfficeState) -> str:
    """Check if Bob needs to run a health check."""
    if state.get("error"):
        return "Bob"
    return END


# --- Graph Construction ---

def build_workflow() -> StateGraph:
    """Build the LangGraph workflow with all agent nodes and conditional edges."""
    workflow = StateGraph(OfficeState)

    # Add all agent nodes
    workflow.add_node("Marco", marco_node)
    workflow.add_node("Jimmy", jimmy_node)
    workflow.add_node("MonaLisa", mona_node)
    workflow.add_node("Dan", dan_node)
    workflow.add_node("Tonny", tonny_node)
    workflow.add_node("Bob", bob_node)
    workflow.add_node("Ariani", ariani_node)
    workflow.add_node("Peter", peter_node)

    # Entry point
    workflow.set_entry_point("Marco")

    # Conditional routing from Marco
    workflow.add_conditional_edges(
        "Marco",
        route_from_marco,
        {
            "Jimmy": "Jimmy",
            "MonaLisa": "MonaLisa",
            "Dan": "Dan",
            "Tonny": "Tonny",
            "Bob": "Bob",
            "Ariani": "Ariani",
            "Peter": "Peter",
        },
    )

    # Research → Content or Archive
    workflow.add_conditional_edges(
        "MonaLisa",
        route_after_research,
        {"Dan": "Dan", "Ariani": "Ariani"},
    )

    # Content → Archive
    workflow.add_edge("Dan", "Ariani")

    # Jimmy → Archive
    workflow.add_edge("Jimmy", "Ariani")

    # Tonny → Health check or END
    workflow.add_conditional_edges(
        "Tonny",
        should_run_health_check,
        {"Bob": "Bob", END: END},
    )

    # Bob → END
    workflow.add_edge("Bob", END)

    # Ariani → Health check or END
    workflow.add_conditional_edges(
        "Ariani",
        should_run_health_check,
        {"Bob": "Bob", END: END},
    )

    # Peter → END
    workflow.add_edge("Peter", END)

    return workflow


def compile_graph():
    """Compile the workflow into an executable graph."""
    workflow = build_workflow()
    return workflow.compile()


# Compiled graph instance
graph = compile_graph()
