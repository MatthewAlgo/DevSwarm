"""
Unit tests for core/ package — state, context, schemas, base_agent.
"""

import pytest
from pydantic import ValidationError

from core.state import OfficeState, create_initial_state
from core.context import MockContext, LiveContext, AgentContext
from core.schemas import (
    MarcoRoutingOutput, SubtaskAssignment,
    JimmyCrawlOutput, CrawlFinding,
    MonaResearchOutput,
    DanContentOutput, ContentDraft,
    TonnyCommsOutput, CommItem,
    BobHealthOutput,
    ArianiKBOutput, KBEntry,
    PeterDesignOutput,
)
from core.base_agent import BaseAgent


# ──────────────────────────────────────────────────────────────────────
# OfficeState Tests
# ──────────────────────────────────────────────────────────────────────

class TestOfficeState:
    def test_create_initial_state_defaults(self):
        state = create_initial_state()
        assert state["active_tasks"] == []
        assert state["messages"] == []
        assert state["delegated_agents"] == []
        assert state["current_goal"] == ""
        assert state["error"] == ""

    def test_create_initial_state_with_goal(self):
        state = create_initial_state("Research AI frameworks")
        assert state["current_goal"] == "Research AI frameworks"
        assert state["active_tasks"] == ["Research AI frameworks"]

    def test_state_is_dict(self):
        state = create_initial_state()
        assert isinstance(state, dict)

    def test_state_has_all_expected_keys(self):
        state = create_initial_state()
        expected_keys = {
            "active_tasks", "messages", "routing_decisions",
            "delegated_agents", "research_findings", "content_drafts",
            "crawl_results", "health_report", "design_output",
            "comms_processed", "kb_entries_organized",
            "current_goal", "error",
        }
        assert set(state.keys()) == expected_keys

    def test_state_mutable(self):
        state = create_initial_state()
        state["error"] = "Test error"
        assert state["error"] == "Test error"


# ──────────────────────────────────────────────────────────────────────
# MockContext Tests
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestMockContext:
    async def test_implements_protocol(self):
        ctx = MockContext()
        assert isinstance(ctx, AgentContext)

    async def test_update_agent_records(self):
        ctx = MockContext()
        await ctx.update_agent("marco", status="Working", current_room="War Room")
        assert len(ctx.updates) == 1
        assert ctx.updates[0]["agent_id"] == "marco"
        assert ctx.updates[0]["status"] == "Working"

    async def test_create_message_records(self):
        ctx = MockContext()
        msg_id = await ctx.create_message("marco", "mona", "Go research", "delegation")
        assert msg_id == "msg-1"
        assert len(ctx.messages) == 1
        assert ctx.messages[0]["from_agent"] == "marco"

    async def test_create_task_records(self):
        ctx = MockContext()
        task_id = await ctx.create_task("Research", created_by="marco", assigned_agents=["mona"])
        assert task_id == "task-1"
        assert len(ctx.tasks_created) == 1

    async def test_log_activity_records(self):
        ctx = MockContext()
        await ctx.log_activity("marco", "test_action", {"key": "value"})
        assert len(ctx.activities) == 1
        assert ctx.activities[0]["action"] == "test_action"

    async def test_get_all_agents_returns_mock_data(self):
        agents = [{"id": "marco", "status": "Idle"}, {"id": "mona", "status": "Error"}]
        ctx = MockContext(mock_agents=agents)
        result = await ctx.get_all_agents()
        assert len(result) == 2

    async def test_reset_clears_all(self):
        ctx = MockContext()
        await ctx.update_agent("marco", status="Working")
        await ctx.create_message("marco", "mona", "test")
        await ctx.create_task("Test task")
        await ctx.log_activity("marco", "test")
        assert len(ctx.updates) == 1

        ctx.reset()
        assert len(ctx.updates) == 0
        assert len(ctx.messages) == 0
        assert len(ctx.tasks_created) == 0
        assert len(ctx.activities) == 0

    async def test_task_counter_increments(self):
        ctx = MockContext()
        id1 = await ctx.create_task("Task 1")
        id2 = await ctx.create_task("Task 2")
        assert id1 == "task-1"
        assert id2 == "task-2"


# ──────────────────────────────────────────────────────────────────────
# LiveContext Tests
# ──────────────────────────────────────────────────────────────────────

class TestLiveContext:
    def test_implements_protocol(self):
        ctx = LiveContext()
        assert isinstance(ctx, AgentContext)


# ──────────────────────────────────────────────────────────────────────
# Pydantic Schemas Tests
# ──────────────────────────────────────────────────────────────────────

class TestSchemas:
    """Verify Pydantic schemas validate correct data and reject bad data."""

    # --- MarcoRoutingOutput ---

    def test_marco_valid(self):
        out = MarcoRoutingOutput(
            analysis="Test",
            subtasks=[SubtaskAssignment(agent="mona", task="Research", priority=3)],
        )
        assert len(out.subtasks) == 1
        assert out.meeting_required is False

    def test_marco_empty_subtasks(self):
        out = MarcoRoutingOutput(analysis="Nothing needed", subtasks=[])
        assert out.subtasks == []

    def test_subtask_priority_range(self):
        SubtaskAssignment(agent="mona", task="test", priority=1)
        SubtaskAssignment(agent="mona", task="test", priority=5)
        with pytest.raises(ValidationError):
            SubtaskAssignment(agent="mona", task="test", priority=0)
        with pytest.raises(ValidationError):
            SubtaskAssignment(agent="mona", task="test", priority=6)

    # --- JimmyCrawlOutput ---

    def test_jimmy_valid(self):
        out = JimmyCrawlOutput(
            findings=[CrawlFinding(topic="AI", summary="Test", relevance_score=5)],
        )
        assert len(out.findings) == 1

    def test_crawl_finding_relevance_range(self):
        CrawlFinding(topic="t", summary="s", relevance_score=1)
        CrawlFinding(topic="t", summary="s", relevance_score=10)
        with pytest.raises(ValidationError):
            CrawlFinding(topic="t", summary="s", relevance_score=0)
        with pytest.raises(ValidationError):
            CrawlFinding(topic="t", summary="s", relevance_score=11)

    # --- MonaResearchOutput ---

    def test_mona_valid(self):
        out = MonaResearchOutput(
            title="Report", executive_summary="Summary",
            key_findings=["Finding 1"], confidence_level="high",
        )
        assert out.title == "Report"

    def test_mona_defaults(self):
        out = MonaResearchOutput(
            title="R", executive_summary="S", key_findings=["F"],
        )
        assert out.confidence_level == "medium"
        assert out.data_sources == []
        assert out.recommendations == []

    # --- DanContentOutput ---

    def test_dan_valid(self):
        draft = ContentDraft(
            platform="twitter", content="Test tweet",
            engagement_prediction="high",
        )
        out = DanContentOutput(topic="AI", drafts=[draft])
        assert len(out.drafts) == 1

    def test_content_draft_defaults(self):
        draft = ContentDraft(platform="blog", content="Test")
        assert draft.hashtags == []
        assert draft.engagement_prediction == "medium"

    # --- TonnyCommsOutput ---

    def test_tonny_valid(self):
        item = CommItem(type="reply", to="user@test.com", subject="Test", body="Reply")
        out = TonnyCommsOutput(processed=[item], summary="Done")
        assert len(out.processed) == 1
        assert out.escalations == []

    # --- BobHealthOutput ---

    def test_bob_valid(self):
        out = BobHealthOutput(diagnosis="All clear", system_status="healthy")
        assert out.agents_online == 0
        assert out.agents_error == 0
        assert out.actions_taken == []

    # --- ArianiKBOutput ---

    def test_ariani_valid(self):
        out = ArianiKBOutput(
            entries_organized=2,
            entries=[KBEntry(document_title="Doc", category="research")],
            summary="Done",
        )
        assert out.entries_organized == 2

    def test_kb_entry_defaults(self):
        entry = KBEntry(document_title="Test", category="general")
        assert entry.tags == []
        assert entry.linked_agents == []

    # --- PeterDesignOutput ---

    def test_peter_valid(self):
        out = PeterDesignOutput(
            type="mockup", description="Dashboard", design_notes="Notes",
        )
        assert out.iterations == 1
        assert out.approval_status == "draft"


# ──────────────────────────────────────────────────────────────────────
# BaseAgent Tests
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestBaseAgent:
    async def test_cannot_instantiate_directly(self):
        with pytest.raises(TypeError):
            BaseAgent()

    async def test_lazy_llm_not_called_at_init(self):
        """Verify LLM is NOT resolved during __init__."""
        from agents.marco.agent import MarcoAgent
        agent = MarcoAgent()
        # _llm should be the sentinel, not a real LLM
        assert agent._llm is BaseAgent._UNSET

    async def test_chain_is_lazy(self):
        """Chain should only be built when accessed."""
        from agents.mona.agent import MonaAgent
        agent = MonaAgent()
        assert agent._chain is None

    async def test_parser_returns_correct_schema(self):
        from agents.dan.agent import DanAgent
        agent = DanAgent()
        parser = agent.parser
        assert parser.pydantic_object == DanContentOutput

    async def test_process_calls_execute(self, mock_context, base_state):
        """Verify process() runs the full lifecycle."""
        from agents.jimmy.agent import JimmyAgent
        from tests.conftest import make_mock_chain
        from core.schemas import JimmyCrawlOutput

        agent = JimmyAgent(context=mock_context)
        agent._chain = make_mock_chain(JimmyCrawlOutput(findings=[]))

        result = await agent.process(base_state)
        assert isinstance(result, dict)
        assert len(mock_context.updates) >= 2  # Working + Idle
