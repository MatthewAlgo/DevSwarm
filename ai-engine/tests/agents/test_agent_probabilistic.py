"""
Probabilistic agent tests — Tests each agent across multiple trials with
varied mock LLM outputs to validate statistical reliability.

Uses the @probabilistic decorator pattern:
- 5 trials per test, 80% threshold (4/5 must pass)
- Mock LLM returns randomly varied outputs each trial
- Tests: schema validity, state mutations, delegation correctness
"""

import random
import pytest

from langchain_core.runnables import RunnableLambda

from core.context import MockContext
from core.state import create_initial_state
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

from agents.marco.agent import MarcoAgent
from agents.jimmy.agent import JimmyAgent
from agents.mona.agent import MonaAgent
from agents.dan.agent import DanAgent
from agents.tonny.agent import TonnyAgent
from agents.bob.agent import BobAgent
from agents.ariani.agent import ArianiAgent
from agents.peter.agent import PeterAgent

from tests.utils import probabilistic


# --- Varied output generators (simulate LLM nondeterminism) ---

def random_marco_output() -> MarcoRoutingOutput:
    agents = ["mona", "jimmy", "dan", "tonny", "bob", "ariani", "peter"]
    n_subtasks = random.randint(0, 4)
    return MarcoRoutingOutput(
        analysis=random.choice([
            "Goal requires deep analysis",
            "Simple delegation task",
            "Multi-step project needing collaboration",
        ]),
        subtasks=[
            SubtaskAssignment(
                agent=random.choice(agents),
                task=f"Subtask {i+1}: {random.choice(['Research', 'Create', 'Monitor', 'Organize'])}",
                priority=random.randint(1, 5),
            )
            for i in range(n_subtasks)
        ],
        meeting_required=random.choice([True, False]),
        meeting_agents=random.sample(agents, k=random.randint(0, 3)),
    )


def random_jimmy_output() -> JimmyCrawlOutput:
    n = random.randint(0, 5)
    return JimmyCrawlOutput(
        findings=[
            CrawlFinding(
                topic=random.choice(["AI News", "Tech Trends", "Open Source", "Cloud"]),
                summary=f"Finding {i+1}: {random.choice(['Breakthrough', 'Update', 'Report'])}",
                relevance_score=random.randint(1, 10),
            )
            for i in range(n)
        ],
        next_crawl_focus=random.choice(["AI", "Cloud", "Security", ""]),
    )


def random_mona_output() -> MonaResearchOutput:
    return MonaResearchOutput(
        title=random.choice(["AI Architecture Study", "Market Analysis", "Tech Report"]),
        executive_summary="Multi-agent systems are evolving rapidly",
        key_findings=[f"Finding {i}" for i in range(random.randint(1, 5))],
        data_sources=["arxiv.org", "github.com"][:random.randint(0, 2)],
        recommendations=[f"Rec {i}" for i in range(random.randint(0, 3))],
        confidence_level=random.choice(["high", "medium", "low"]),
    )


def random_dan_output() -> DanContentOutput:
    return DanContentOutput(
        topic=random.choice(["AI Agents", "DevSwarm Update", "Tech Innovation"]),
        drafts=[
            ContentDraft(
                platform=random.choice(["twitter", "linkedin", "blog"]),
                content=f"Content draft {i+1}",
                engagement_prediction=random.choice(["high", "medium", "low"]),
            )
            for i in range(random.randint(0, 3))
        ],
        sentiment_analysis=random.choice(["positive", "neutral", "mixed"]),
    )


def random_tonny_output() -> TonnyCommsOutput:
    return TonnyCommsOutput(
        processed=[
            CommItem(type="reply", to=f"user{i}@test.com", subject=f"Re: Topic {i}", body="Reply body")
            for i in range(random.randint(0, 3))
        ],
        escalations=[f"Escalation {i}" for i in range(random.randint(0, 2))],
        summary="Communications processed",
    )


def random_bob_output() -> BobHealthOutput:
    return BobHealthOutput(
        diagnosis=random.choice(["All systems nominal", "Minor latency detected", "Agent recovery needed"]),
        agents_online=random.randint(5, 8),
        agents_error=random.randint(0, 2),
        system_status=random.choice(["healthy", "recovering", "critical"]),
        actions_taken=[f"Action {i}" for i in range(random.randint(0, 3))],
    )


def random_ariani_output() -> ArianiKBOutput:
    n = random.randint(0, 5)
    return ArianiKBOutput(
        entries_organized=n,
        entries=[
            KBEntry(
                document_title=f"Doc {i}",
                category=random.choice(["research", "content", "devops", "general"]),
            )
            for i in range(n)
        ],
        summary=f"Organized {n} entries",
    )


def random_peter_output() -> PeterDesignOutput:
    return PeterDesignOutput(
        type=random.choice(["mockup", "asset", "critique"]),
        description=f"{random.choice(['Dashboard', 'Profile', 'Settings'])} UI design",
        design_notes="Glassmorphism with dark background",
        iterations=random.randint(1, 4),
        approval_status=random.choice(["draft", "review", "approved"]),
    )


def make_varied_chain(generator):
    """Create a mock chain that returns a new random output each invocation."""
    async def _invoke(input_dict, **kwargs):
        return generator()
    return RunnableLambda(_invoke)


# ========================================================================
# Probabilistic Agent Tests
# ========================================================================

@pytest.mark.asyncio
class TestMarcoAgentProbabilistic:
    """Probabilistic tests for Marco — 5 trials, 80% threshold."""

    @probabilistic(trials=5, threshold=0.8)
    async def test_delegation_produces_valid_state(self):
        ctx = MockContext()
        agent = MarcoAgent(context=ctx)
        agent._chain = make_varied_chain(random_marco_output)
        state = create_initial_state("Build a marketing campaign")
        result = await agent.process(state)
        assert "delegated_agents" in result
        assert isinstance(result["delegated_agents"], list)
        assert "routing_decisions" in result

    @probabilistic(trials=5, threshold=0.8)
    async def test_task_count_matches_delegation(self):
        ctx = MockContext()
        agent = MarcoAgent(context=ctx)
        agent._chain = make_varied_chain(random_marco_output)
        state = create_initial_state("Analyze competitor landscape")
        await agent.process(state)
        assert len(ctx.tasks_created) == len(
            [m for m in ctx.messages if m["message_type"] == "delegation"]
        )

    @probabilistic(trials=5, threshold=0.8)
    async def test_status_ends_idle(self):
        ctx = MockContext()
        agent = MarcoAgent(context=ctx)
        agent._chain = make_varied_chain(random_marco_output)
        state = create_initial_state("Deploy new feature")
        await agent.process(state)
        final_statuses = [u["status"] for u in ctx.updates if u["agent_id"] == "marco" and u["status"]]
        assert final_statuses[-1] == "Idle"


@pytest.mark.asyncio
class TestJimmyAgentProbabilistic:

    @probabilistic(trials=5, threshold=0.8)
    async def test_crawl_results_are_list(self):
        ctx = MockContext()
        agent = JimmyAgent(context=ctx)
        agent._chain = make_varied_chain(random_jimmy_output)
        result = await agent.process(create_initial_state("Crawl AI news"))
        assert isinstance(result["crawl_results"], list)

    @probabilistic(trials=5, threshold=0.8)
    async def test_messages_match_findings(self):
        ctx = MockContext()
        agent = JimmyAgent(context=ctx)
        agent._chain = make_varied_chain(random_jimmy_output)
        result = await agent.process(create_initial_state("Crawl tech"))
        ariani_msgs = [m for m in ctx.messages if m["to_agent"] == "ariani"]
        assert len(ariani_msgs) == len(result["crawl_results"])


@pytest.mark.asyncio
class TestMonaAgentProbabilistic:

    @probabilistic(trials=5, threshold=0.8)
    async def test_research_findings_populated(self):
        ctx = MockContext()
        agent = MonaAgent(context=ctx)
        agent._chain = make_varied_chain(random_mona_output)
        result = await agent.process(create_initial_state("Research multi-agent systems"))
        assert "title" in result["research_findings"]
        assert "confidence_level" in result["research_findings"]

    @probabilistic(trials=5, threshold=0.8)
    async def test_notifies_dan_and_ariani(self):
        ctx = MockContext()
        agent = MonaAgent(context=ctx)
        agent._chain = make_varied_chain(random_mona_output)
        await agent.process(create_initial_state("Research AI"))
        recipients = {m["to_agent"] for m in ctx.messages}
        assert "dan" in recipients
        assert "ariani" in recipients


@pytest.mark.asyncio
class TestDanAgentProbabilistic:

    @probabilistic(trials=5, threshold=0.8)
    async def test_content_drafts_stored(self):
        ctx = MockContext()
        agent = DanAgent(context=ctx)
        agent._chain = make_varied_chain(random_dan_output)
        result = await agent.process(create_initial_state("Create viral content"))
        assert isinstance(result["content_drafts"], list)

    @probabilistic(trials=5, threshold=0.8)
    async def test_marco_notified(self):
        ctx = MockContext()
        agent = DanAgent(context=ctx)
        agent._chain = make_varied_chain(random_dan_output)
        await agent.process(create_initial_state("Draft posts"))
        marco_msgs = [m for m in ctx.messages if m["to_agent"] == "marco"]
        assert len(marco_msgs) == 1


@pytest.mark.asyncio
class TestTonnyAgentProbabilistic:

    @probabilistic(trials=5, threshold=0.8)
    async def test_comms_processed_is_int(self):
        ctx = MockContext()
        agent = TonnyAgent(context=ctx)
        agent._chain = make_varied_chain(random_tonny_output)
        result = await agent.process(create_initial_state("Process emails"))
        assert isinstance(result["comms_processed"], int)

    @probabilistic(trials=5, threshold=0.8)
    async def test_escalation_messages_match(self):
        ctx = MockContext()
        agent = TonnyAgent(context=ctx)
        agent._chain = make_varied_chain(random_tonny_output)
        await agent.process(create_initial_state("Handle comms"))
        esc_msgs = [m for m in ctx.messages if m["message_type"] == "escalation"]
        assert all(m["to_agent"] == "marco" for m in esc_msgs)


@pytest.mark.asyncio
class TestBobAgentProbabilistic:

    @probabilistic(trials=5, threshold=0.8)
    async def test_health_report_valid(self):
        ctx = MockContext(mock_agents=[
            {"id": "marco", "status": "Idle"}, {"id": "mona", "status": "Error"},
        ])
        agent = BobAgent(context=ctx)
        agent._chain = make_varied_chain(random_bob_output)
        result = await agent.process(create_initial_state("Health check"))
        assert "system_status" in result["health_report"]
        assert "agents_online" in result["health_report"]

    @probabilistic(trials=5, threshold=0.8)
    async def test_recovers_error_agents(self):
        ctx = MockContext(mock_agents=[
            {"id": "marco", "status": "Idle"}, {"id": "mona", "status": "Error"},
        ])
        agent = BobAgent(context=ctx)
        agent._chain = make_varied_chain(random_bob_output)
        state = create_initial_state("Fix errors")
        state["error"] = "Agent mona crashed"
        await agent.process(state)
        recovery_msgs = [m for m in ctx.messages if m["message_type"] == "recovery"]
        assert len(recovery_msgs) >= 1


@pytest.mark.asyncio
class TestArianiAgentProbabilistic:

    @probabilistic(trials=5, threshold=0.8)
    async def test_kb_entries_tracked(self):
        ctx = MockContext()
        agent = ArianiAgent(context=ctx)
        agent._chain = make_varied_chain(random_ariani_output)
        result = await agent.process(create_initial_state("Organize KB"))
        assert isinstance(result["kb_entries_organized"], int)
        assert result["kb_entries_organized"] >= 0

    @probabilistic(trials=5, threshold=0.8)
    async def test_marco_kb_notification(self):
        ctx = MockContext()
        agent = ArianiAgent(context=ctx)
        agent._chain = make_varied_chain(random_ariani_output)
        await agent.process(create_initial_state("Archive data"))
        marco_msgs = [m for m in ctx.messages if m["to_agent"] == "marco"]
        assert len(marco_msgs) == 1
        assert marco_msgs[0]["message_type"] == "kb_update"


@pytest.mark.asyncio
class TestPeterAgentProbabilistic:

    @probabilistic(trials=5, threshold=0.8)
    async def test_design_output_stored(self):
        ctx = MockContext()
        agent = PeterAgent(context=ctx)
        agent._chain = make_varied_chain(random_peter_output)
        result = await agent.process(create_initial_state("Design dashboard"))
        assert "type" in result["design_output"]
        assert result["design_output"]["type"] in {"mockup", "asset", "critique"}

    @probabilistic(trials=5, threshold=0.8)
    async def test_notifies_dan_and_marco(self):
        ctx = MockContext()
        agent = PeterAgent(context=ctx)
        agent._chain = make_varied_chain(random_peter_output)
        await agent.process(create_initial_state("Create mockup"))
        recipients = {m["to_agent"] for m in ctx.messages}
        assert "dan" in recipients
        assert "marco" in recipients
