"""Test configuration and shared fixtures for all agent tests."""

from __future__ import annotations

import sys
import os
from typing import Any
from unittest.mock import AsyncMock

import pytest

# Ensure ai-engine root is on sys.path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.context import MockContext
from core.state import OfficeState, create_initial_state
from core.schemas import (
    MarcoRoutingOutput,
    SubtaskAssignment,
    JimmyCrawlOutput,
    CrawlFinding,
    MonaResearchOutput,
    DanContentOutput,
    ContentDraft,
    TonnyCommsOutput,
    CommItem,
    BobHealthOutput,
    ArianiKBOutput,
    KBEntry,
    PeterDesignOutput,
)


@pytest.fixture
def mock_context():
    """Provide a fresh MockContext for each test."""
    return MockContext()


@pytest.fixture
def mock_context_with_agents():
    """MockContext pre-loaded with agent data (for Bob's health checks)."""
    agents = [
        {"id": "marco", "name": "Marco", "status": "Idle", "current_room": "Private Office"},
        {"id": "jimmy", "name": "Jimmy", "status": "Idle", "current_room": "Desks"},
        {"id": "mona", "name": "Mona Lisa", "status": "Error", "current_room": "War Room"},
        {"id": "dan", "name": "Dan", "status": "Idle", "current_room": "Lounge"},
        {"id": "tonny", "name": "Tonny", "status": "Idle", "current_room": "Desks"},
        {"id": "bob", "name": "Bob", "status": "Working", "current_room": "Server Room"},
        {"id": "ariani", "name": "Ariani", "status": "Idle", "current_room": "Desks"},
        {"id": "peter", "name": "Peter", "status": "Idle", "current_room": "Desks"},
    ]
    return MockContext(mock_agents=agents)


@pytest.fixture
def base_state():
    """A basic OfficeState for testing."""
    return create_initial_state("Research AI agent frameworks")


@pytest.fixture
def state_with_research():
    """State with populated research findings (for Dan, Ariani)."""
    state = create_initial_state("Create content about AI agents")
    state["research_findings"] = {
        "title": "AI Agent Architecture Analysis",
        "executive_summary": "Multi-agent systems evolving rapidly",
        "key_findings": ["LangGraph adoption up 340%", "MCP becoming standard"],
        "confidence_level": "high",
    }
    return state


@pytest.fixture
def state_with_crawl():
    """State with crawl results (for Ariani)."""
    state = create_initial_state("Organize knowledge")
    state["crawl_results"] = [
        {"topic": "AI Frameworks", "summary": "New frameworks emerging", "relevance": 9},
    ]
    return state


@pytest.fixture
def state_with_error():
    """State with an error (for Bob)."""
    state = create_initial_state("Fix system error")
    state["error"] = "Agent mona crashed: timeout"
    return state


# --- Mock LLM ---

def make_mock_chain(output):
    """
    Create a mock LangChain chain that returns a fixed Pydantic output.
    Replaces the entire prompt | llm | parser pipeline.
    """
    from langchain_core.runnables import RunnableLambda

    async def _invoke(input_dict, **kwargs):
        return output

    return RunnableLambda(_invoke)


# --- Output Fixtures ---

@pytest.fixture
def marco_output():
    return MarcoRoutingOutput(
        analysis="Goal requires research and content creation",
        subtasks=[
            SubtaskAssignment(agent="mona", task="Deep research on AI agents", priority=5),
            SubtaskAssignment(agent="dan", task="Create social media content", priority=3),
        ],
        meeting_required=False,
        meeting_agents=[],
    )


@pytest.fixture
def jimmy_output():
    return JimmyCrawlOutput(
        findings=[
            CrawlFinding(
                topic="AI Agent Frameworks",
                summary="New frameworks for multi-agent orchestration",
                sources=["https://example.com/ai"],
                relevance_score=9,
                tags=["AI", "agents"],
            ),
            CrawlFinding(
                topic="MCP Protocol",
                summary="Industry adoption growing",
                sources=["https://example.com/mcp"],
                relevance_score=8,
                tags=["MCP", "tools"],
            ),
        ],
        next_crawl_focus="Agent communication patterns",
    )


@pytest.fixture
def mona_output():
    return MonaResearchOutput(
        title="AI Agent Architecture Analysis",
        executive_summary="Multi-agent systems evolving toward spatial paradigms",
        key_findings=["LangGraph adoption up 340%", "MCP becoming standard"],
        data_sources=["arxiv.org", "github.com"],
        recommendations=["Adopt LangGraph", "Implement MCP tools"],
        confidence_level="high",
    )


@pytest.fixture
def dan_output():
    return DanContentOutput(
        topic="AI Agent Systems",
        drafts=[
            ContentDraft(
                platform="twitter",
                content="Multi-agent architectures are the future 🚀",
                hashtags=["#AI", "#DevSwarm"],
                engagement_prediction="high",
            ),
        ],
        sentiment_analysis="Positive sentiment around AI agent adoption",
    )


@pytest.fixture
def tonny_output():
    return TonnyCommsOutput(
        processed=[
            CommItem(
                type="reply",
                to="client@example.com",
                subject="Project status update",
                body="Project is on track.",
                priority="high",
            ),
        ],
        escalations=["Partnership proposal requires Marco's review"],
        summary="Processed 1 message, 1 escalation",
    )


@pytest.fixture
def bob_output():
    return BobHealthOutput(
        diagnosis="All systems nominal. No critical issues.",
        agents_online=7,
        agents_error=1,
        agents_recovered=1,
        system_status="recovering",
        actions_taken=["Restarted mona agent", "Cleared error state"],
    )


@pytest.fixture
def ariani_output():
    return ArianiKBOutput(
        entries_organized=3,
        entries=[
            KBEntry(
                document_title="AI Agent Research Summary",
                category="research",
                tags=["AI", "agents", "LangGraph"],
                linked_agents=["mona", "jimmy"],
            ),
        ],
        summary="Organized research and crawl data into 3 KB entries",
    )


@pytest.fixture
def peter_output():
    return PeterDesignOutput(
        type="mockup",
        description="Dashboard UI with glassmorphism dark theme",
        design_notes="Using neutral-950 background with emerald/violet accent",
        iterations=1,
        approval_status="draft",
    )
