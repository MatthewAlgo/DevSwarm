"""
DevSwarm AI Engine — LangGraph Orchestration Graph
Stateful graph with conditional edges for multi-agent routing.
Uses AgentRegistry for clean agent management.
"""

import logging

from langgraph.graph import StateGraph, END

from core.state import OfficeState
from core.context import LiveContext
from agents import AgentRegistry

from models import NodeName

logger = logging.getLogger("devswarm.graph")

# Shared registry with production context
_context = LiveContext()
registry = AgentRegistry(context=_context)


# --- Node Wrappers ---
# Each creates a closure that calls agent.process(state) with the live context.


async def orchestrator_node(state: OfficeState) -> OfficeState:
    """Orchestrator evaluates high-level goals and delegates sub-tasks."""
    return await registry["orchestrator"].process(state)


async def crawler_node(state: OfficeState) -> OfficeState:
    """Crawler crawls the web for trending content."""
    return await registry["crawler"].process(state)


async def researcher_node(state: OfficeState) -> OfficeState:
    """Researcher performs deep research."""
    return await registry["researcher"].process(state)


async def viral_engineer_node(state: OfficeState) -> OfficeState:
    """Viral Engineer creates viral content from research."""
    return await registry["viral_engineer"].process(state)


async def comms_node(state: OfficeState) -> OfficeState:
    """Comms handles communications."""
    return await registry["comms"].process(state)


async def devops_node(state: OfficeState) -> OfficeState:
    """DevOps monitors system health."""
    return await registry["devops"].process(state)


async def archivist_node(state: OfficeState) -> OfficeState:
    """Archivist organizes the knowledge base."""
    return await registry["archivist"].process(state)


async def frontend_designer_node(state: OfficeState) -> OfficeState:
    """Frontend Designer creates and critiques designs."""
    return await registry["frontend_designer"].process(state)


# --- Conditional Routing ---


def route_from_orchestrator(state: OfficeState) -> str:
    """Determine which agent to route to after Orchestrator's evaluation."""
    delegated = state.get("delegated_agents", [])
    if not delegated:
        return END

    agent_map = {
        "crawler": NodeName.CRAWLER,
        "researcher": NodeName.RESEARCHER,
        "viral_engineer": NodeName.VIRAL_ENGINEER,
        "comms": NodeName.COMMS,
        "devops": NodeName.DEVOPS,
        "archivist": NodeName.ARCHIVIST,
        "frontend_designer": NodeName.FRONTEND_DESIGNER,
    }
    return agent_map.get(delegated[0], END)


def route_after_research(state: OfficeState) -> str:
    """After research, route to Viral Engineer for content creation or Archivist for archiving."""
    if state.get("research_findings"):
        return NodeName.VIRAL_ENGINEER
    return NodeName.ARCHIVIST


def route_after_content(state: OfficeState) -> str:
    """After content creation, route to Archivist for knowledge base update."""
    return NodeName.ARCHIVIST


def should_run_health_check(state: OfficeState) -> str:
    """Check if DevOps needs to run a health check."""
    if state.get("error"):
        return NodeName.DEVOPS
    return END


# --- Graph Construction ---


def build_workflow() -> StateGraph:
    """Build the LangGraph workflow with all agent nodes and conditional edges."""
    workflow = StateGraph(OfficeState)

    # Add all agent nodes
    workflow.add_node(NodeName.ORCHESTRATOR, orchestrator_node)
    workflow.add_node(NodeName.CRAWLER, crawler_node)
    workflow.add_node(NodeName.RESEARCHER, researcher_node)
    workflow.add_node(NodeName.VIRAL_ENGINEER, viral_engineer_node)
    workflow.add_node(NodeName.COMMS, comms_node)
    workflow.add_node(NodeName.DEVOPS, devops_node)
    workflow.add_node(NodeName.ARCHIVIST, archivist_node)
    workflow.add_node(NodeName.FRONTEND_DESIGNER, frontend_designer_node)

    # Entry point
    workflow.set_entry_point(NodeName.ORCHESTRATOR)

    # Conditional routing from Orchestrator
    workflow.add_conditional_edges(
        NodeName.ORCHESTRATOR,
        route_from_orchestrator,
        {
            END: END,
            NodeName.CRAWLER: NodeName.CRAWLER,
            NodeName.RESEARCHER: NodeName.RESEARCHER,
            NodeName.VIRAL_ENGINEER: NodeName.VIRAL_ENGINEER,
            NodeName.COMMS: NodeName.COMMS,
            NodeName.DEVOPS: NodeName.DEVOPS,
            NodeName.ARCHIVIST: NodeName.ARCHIVIST,
            NodeName.FRONTEND_DESIGNER: NodeName.FRONTEND_DESIGNER,
        },
    )

    # Research → Content or Archive
    workflow.add_conditional_edges(
        NodeName.RESEARCHER,
        route_after_research,
        {NodeName.VIRAL_ENGINEER: NodeName.VIRAL_ENGINEER, NodeName.ARCHIVIST: NodeName.ARCHIVIST},
    )

    # Content → Archive
    workflow.add_edge(NodeName.VIRAL_ENGINEER, NodeName.ARCHIVIST)

    # Crawler → Archive
    workflow.add_edge(NodeName.CRAWLER, NodeName.ARCHIVIST)

    # Comms → Health check or END
    workflow.add_conditional_edges(
        NodeName.COMMS,
        should_run_health_check,
        {NodeName.DEVOPS: NodeName.DEVOPS, END: END},
    )

    # DevOps → END
    workflow.add_edge(NodeName.DEVOPS, END)

    # Archivist → Health check or END
    workflow.add_conditional_edges(
        NodeName.ARCHIVIST,
        should_run_health_check,
        {NodeName.DEVOPS: NodeName.DEVOPS, END: END},
    )

    # FrontendDesigner → END
    workflow.add_edge(NodeName.FRONTEND_DESIGNER, END)

    return workflow


def compile_graph():
    """Compile the workflow into an executable graph."""
    workflow = build_workflow()
    return workflow.compile()


# Compiled graph instance
graph = compile_graph()
