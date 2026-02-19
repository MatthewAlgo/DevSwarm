"""
OfficeState — Global state tracked across LangGraph execution turns.
Extracted from graph.py for reuse across agents and tests.
"""

from __future__ import annotations

from typing import Annotated, TypedDict


class OfficeState(TypedDict):
    """Global office state tracked across all execution turns."""

    active_tasks: list[str]
    messages: Annotated[list, "messages"]
    routing_decisions: dict
    delegated_agents: list[str]
    delegated_task_ids: list[str]
    research_findings: dict
    content_drafts: list[dict]
    crawl_results: list[dict]
    health_report: dict
    design_output: dict
    comms_processed: int
    kb_entries_organized: int
    current_goal: str
    error: str


def create_initial_state(goal: str = "") -> OfficeState:
    """Create a fresh initial state for a new graph execution."""
    return OfficeState(
        active_tasks=[goal] if goal else [],
        messages=[],
        routing_decisions={},
        delegated_agents=[],
        delegated_task_ids=[],
        research_findings={},
        content_drafts=[],
        crawl_results=[],
        health_report={},
        design_output={},
        comms_processed=0,
        kb_entries_organized=0,
        current_goal=goal,
        error="",
    )
