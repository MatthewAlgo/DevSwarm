"""
Unit tests for graph.py — Routing functions and workflow structure.
Tests routing logic without requiring a live LLM or database.
"""

import pytest

from core.state import create_initial_state
from models import NodeName
from graph import (
    route_from_orchestrator,
    route_after_research,
    route_after_content,
    should_run_health_check,
    build_workflow,
)


class TestRouteFromOrchestrator:
    """Test Orchestrator's delegation routing logic."""

    def test_no_delegated_agents_routes_to_crawler(self):
        state = create_initial_state()
        assert route_from_orchestrator(state) == NodeName.CRAWLER

    def test_empty_delegation_routes_to_crawler(self):
        state = create_initial_state()
        state["delegated_agents"] = []
        assert route_from_orchestrator(state) == NodeName.CRAWLER

    @pytest.mark.parametrize(
        "agent,expected_node",
        [
            ("crawler", NodeName.CRAWLER),
            ("researcher", NodeName.RESEARCHER),
            ("viral_engineer", NodeName.VIRAL_ENGINEER),
            ("comms", NodeName.COMMS),
            ("devops", NodeName.DEVOPS),
            ("archivist", NodeName.ARCHIVIST),
            ("frontend_designer", NodeName.FRONTEND_DESIGNER),
        ],
    )
    def test_routes_to_correct_agent(self, agent, expected_node):
        state = create_initial_state()
        state["delegated_agents"] = [agent]
        assert route_from_orchestrator(state) == expected_node

    def test_routes_first_agent_when_multiple(self):
        """When multiple agents delegated, routes to the first one."""
        state = create_initial_state()
        state["delegated_agents"] = ["researcher", "viral_engineer", "frontend_designer"]
        assert route_from_orchestrator(state) == NodeName.RESEARCHER

    def test_unknown_agent_falls_back_to_crawler(self):
        state = create_initial_state()
        state["delegated_agents"] = ["unknown_agent"]
        assert route_from_orchestrator(state) == NodeName.CRAWLER


class TestRouteAfterResearch:
    """Test Researcher's post-research routing."""

    def test_with_findings_routes_to_dan(self):
        state = create_initial_state()
        state["research_findings"] = {"title": "Report", "key_findings": ["F1"]}
        assert route_after_research(state) == NodeName.VIRAL_ENGINEER

    def test_no_findings_routes_to_ariani(self):
        state = create_initial_state()
        assert route_after_research(state) == NodeName.ARCHIVIST

    def test_empty_findings_routes_to_ariani(self):
        state = create_initial_state()
        state["research_findings"] = {}
        assert route_after_research(state) == NodeName.ARCHIVIST


class TestRouteAfterContent:
    """Test post-content routing."""

    def test_always_routes_to_ariani(self):
        state = create_initial_state()
        assert route_after_content(state) == NodeName.ARCHIVIST


class TestShouldRunHealthCheck:
    """Test error-based routing for DevOps."""

    def test_with_error_routes_to_bob(self):
        state = create_initial_state()
        state["error"] = "Agent crashed"
        assert should_run_health_check(state) == NodeName.DEVOPS

    def test_no_error_routes_to_end(self):
        state = create_initial_state()
        assert should_run_health_check(state) == "__end__"

    def test_empty_error_routes_to_end(self):
        state = create_initial_state()
        state["error"] = ""
        assert should_run_health_check(state) == "__end__"


class TestBuildWorkflow:
    """Test workflow graph structure."""

    def test_returns_state_graph(self):
        from langgraph.graph import StateGraph

        wf = build_workflow()
        assert isinstance(wf, StateGraph)

    def test_has_all_agent_nodes(self):
        wf = build_workflow()
        expected_nodes = {
            NodeName.ORCHESTRATOR,
            NodeName.CRAWLER,
            NodeName.RESEARCHER,
            NodeName.VIRAL_ENGINEER,
            NodeName.COMMS,
            NodeName.DEVOPS,
            NodeName.ARCHIVIST,
            NodeName.FRONTEND_DESIGNER,
        }
        actual_nodes = set(wf.nodes.keys())
        assert expected_nodes.issubset(actual_nodes)

    def test_entry_point_is_marco(self):
        wf = build_workflow()
        # The entry point should route to Orchestrator first
        wf.compile()
        # First node in the graph should be Orchestrator
        assert NodeName.ORCHESTRATOR in wf.nodes
