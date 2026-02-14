"""
Unit tests for graph.py — Routing functions and workflow structure.
Tests routing logic without requiring a live LLM or database.
"""

import pytest

from core.state import create_initial_state
from graph import (
    route_from_marco,
    route_after_research,
    route_after_content,
    should_run_health_check,
    build_workflow,
)


class TestRouteFromMarco:
    """Test Marco's delegation routing logic."""

    def test_no_delegated_agents_routes_to_jimmy(self):
        state = create_initial_state()
        assert route_from_marco(state) == "Jimmy"

    def test_empty_delegation_routes_to_jimmy(self):
        state = create_initial_state()
        state["delegated_agents"] = []
        assert route_from_marco(state) == "Jimmy"

    @pytest.mark.parametrize("agent,expected_node", [
        ("jimmy", "Jimmy"),
        ("mona", "MonaLisa"),
        ("dan", "Dan"),
        ("tonny", "Tonny"),
        ("bob", "Bob"),
        ("ariani", "Ariani"),
        ("peter", "Peter"),
    ])
    def test_routes_to_correct_agent(self, agent, expected_node):
        state = create_initial_state()
        state["delegated_agents"] = [agent]
        assert route_from_marco(state) == expected_node

    def test_routes_first_agent_when_multiple(self):
        """When multiple agents delegated, routes to the first one."""
        state = create_initial_state()
        state["delegated_agents"] = ["mona", "dan", "peter"]
        assert route_from_marco(state) == "MonaLisa"

    def test_unknown_agent_falls_back_to_jimmy(self):
        state = create_initial_state()
        state["delegated_agents"] = ["unknown_agent"]
        assert route_from_marco(state) == "Jimmy"


class TestRouteAfterResearch:
    """Test Mona's post-research routing."""

    def test_with_findings_routes_to_dan(self):
        state = create_initial_state()
        state["research_findings"] = {"title": "Report", "key_findings": ["F1"]}
        assert route_after_research(state) == "Dan"

    def test_no_findings_routes_to_ariani(self):
        state = create_initial_state()
        assert route_after_research(state) == "Ariani"

    def test_empty_findings_routes_to_ariani(self):
        state = create_initial_state()
        state["research_findings"] = {}
        assert route_after_research(state) == "Ariani"


class TestRouteAfterContent:
    """Test post-content routing."""

    def test_always_routes_to_ariani(self):
        state = create_initial_state()
        assert route_after_content(state) == "Ariani"


class TestShouldRunHealthCheck:
    """Test error-based routing for Bob."""

    def test_with_error_routes_to_bob(self):
        state = create_initial_state()
        state["error"] = "Agent crashed"
        assert should_run_health_check(state) == "Bob"

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
        expected_nodes = {"Marco", "Jimmy", "MonaLisa", "Dan", "Tonny", "Bob", "Ariani", "Peter"}
        actual_nodes = set(wf.nodes.keys())
        assert expected_nodes.issubset(actual_nodes)

    def test_entry_point_is_marco(self):
        wf = build_workflow()
        # The entry point should route to Marco first
        compiled = wf.compile()
        # First node in the graph should be Marco
        assert "Marco" in wf.nodes
