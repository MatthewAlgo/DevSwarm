"""Test configuration and shared fixtures for all agent tests."""

from __future__ import annotations

import sys
import os

import pytest

# Ensure ai-engine root is on sys.path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.context import MockContext
from core.state import create_initial_state
from core.schemas import (
    OrchestratorRoutingOutput,
    SubtaskAssignment,
    CrawlerCrawlOutput,
    CrawlFinding,
    ResearcherOutput,
    ViralContentOutput,
    ContentDraft,
    CommsOutput,
    CommItem,
    DevOpsHealthOutput,
    ArchivistKBOutput,
    KBEntry,
    FrontendDesignOutput,
)


def pytest_configure(config):
    config.addinivalue_line("markers", "contract: mark test as a contract test")


@pytest.fixture
def mock_context():
    """Provide a fresh MockContext for each test."""
    return MockContext()


@pytest.fixture
def mock_context_with_agents():
    """MockContext pre-loaded with agent data (for DevOps's health checks)."""
    agents = [
        {
            "id": "orchestrator",
            "name": "Orchestrator",
            "status": "Idle",
            "current_room": "Private Office",
        },
        {"id": "crawler", "name": "Crawler", "status": "Idle", "current_room": "Desks"},
        {
            "id": "researcher",
            "name": "Researcher",
            "status": "Error",
            "current_room": "War Room",
        },
        {
            "id": "viral_engineer",
            "name": "Viral Engineer",
            "status": "Idle",
            "current_room": "Lounge",
        },
        {"id": "comms", "name": "Comms", "status": "Idle", "current_room": "Desks"},
        {
            "id": "devops",
            "name": "DevOps",
            "status": "Working",
            "current_room": "Server Room",
        },
        {
            "id": "archivist",
            "name": "Archivist",
            "status": "Idle",
            "current_room": "Desks",
        },
        {
            "id": "frontend_designer",
            "name": "Frontend Designer",
            "status": "Idle",
            "current_room": "Desks",
        },
    ]
    return MockContext(mock_agents=agents)


@pytest.fixture
def base_state():
    """A basic OfficeState for testing."""
    return create_initial_state("Research AI agent frameworks")


@pytest.fixture
def state_with_research():
    """State with populated research findings (for Viral Engineer, Archivist)."""
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
    """State with crawl results (for Archivist)."""
    state = create_initial_state("Organize knowledge")
    state["crawl_results"] = [
        {
            "topic": "AI Frameworks",
            "summary": "New frameworks emerging",
            "relevance": 9,
        },
    ]
    return state


@pytest.fixture
def state_with_error():
    """State with an error (for DevOps)."""
    state = create_initial_state("Fix system error")
    state["error"] = "Agent researcher crashed: timeout"
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
def orchestrator_output():
    return OrchestratorRoutingOutput(
        analysis="Goal requires research and content creation",
        subtasks=[
            SubtaskAssignment(
                agent="researcher", task="Deep research on AI agents", priority=5
            ),
            SubtaskAssignment(
                agent="viral_engineer", task="Create social media content", priority=3
            ),
        ],
        meeting_required=False,
        meeting_agents=[],
    )


@pytest.fixture
def crawler_output():
    return CrawlerCrawlOutput(
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
def researcher_output():
    return ResearcherOutput(
        title="AI Agent Architecture Analysis",
        executive_summary="Multi-agent systems evolving toward spatial paradigms",
        key_findings=["LangGraph adoption up 340%", "MCP becoming standard"],
        data_sources=["arxiv.org", "github.com"],
        recommendations=["Adopt LangGraph", "Implement MCP tools"],
        confidence_level="high",
    )


@pytest.fixture
def viral_engineer_output():
    return ViralContentOutput(
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
def comms_output():
    return CommsOutput(
        processed=[
            CommItem(
                type="reply",
                to="client@example.com",
                subject="Project status update",
                body="Project is on track.",
                priority="high",
            ),
        ],
        escalations=["Partnership proposal requires Orchestrator's review"],
        summary="Processed 1 message, 1 escalation",
    )


@pytest.fixture
def devops_output():
    return DevOpsHealthOutput(
        diagnosis="All systems nominal. No critical issues.",
        agents_online=7,
        agents_error=1,
        agents_recovered=1,
        system_status="recovering",
        actions_taken=["Restarted researcher agent", "Cleared error state"],
    )


@pytest.fixture
def archivist_output():
    return ArchivistKBOutput(
        entries_organized=3,
        entries=[
            KBEntry(
                document_title="AI Agent Research Summary",
                category="research",
                tags=["AI", "agents", "LangGraph"],
                linked_agents=["researcher", "crawler"],
            ),
        ],
        summary="Organized research and crawl data into 3 KB entries",
    )


@pytest.fixture
def frontend_designer_output():
    return FrontendDesignOutput(
        type="mockup",
        description="Dashboard UI with glassmorphism dark theme",
        design_notes="Using neutral-950 background with emerald/violet accent",
        iterations=1,
        approval_status="draft",
    )
