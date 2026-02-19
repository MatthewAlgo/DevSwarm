import pytest
from langchain_core.runnables import RunnableLambda
from langchain_core.messages import AIMessage

from core.state import create_initial_state
from core.schemas import (
    OrchestratorRoutingOutput,
    SubtaskAssignment,
    DevOpsHealthOutput,
    ViralContentOutput,
    CrawlerCrawlOutput,
    ContentDraft,
    CrawlFinding,
)
from agents import AgentRegistry
import graph

# Define test cases: (goal, target_agent, response_model, response_data, agent_default_room)
TEST_CASES = [
    (
        "Check system health",
        "devops",
        DevOpsHealthOutput(
            diagnosis="Systems nominal.",
            agents_online=8,
            agents_error=0,
            agents_recovered=0,
            system_status="healthy",
            actions_taken=[],
        ),
        "Server Room",
    ),
    (
        "Create viral content about AI",
        "viral_engineer",
        ViralContentOutput(
            topic="AI",
            drafts=[
                ContentDraft(
                    platform="twitter",
                    content="AI is cool!",
                    hashtags=[],
                    engagement_prediction="High",
                )
            ],
            sentiment_analysis="Positive",
        ),
        "Lounge",
    ),
    (
        "Research recent AI news",
        "crawler",
        CrawlerCrawlOutput(
            findings=[
                CrawlFinding(
                    topic="AI News",
                    summary="Big news",
                    sources=[],
                    relevance_score=10,
                    tags=[],
                )
            ],
            next_crawl_focus="More news",
        ),
        "Desks",
    ),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("goal,target_agent,mock_output,default_room", TEST_CASES)
async def test_orchestration_flows(
    mock_context, goal, target_agent, mock_output, default_room
):
    """
    Parametrized System Test: Verifies flow from Orchestrator -> Target Agent.
    - Mocks LLM responses for Orchestrator and the target agent.
    - Verifies proper delegation.
    - Verifies target agent's execution and state update.
    - Verifies target agent returns to their specific default room after work.
    """

    # 1. Setup Mock Registry
    test_registry = AgentRegistry(context=mock_context)

    # Inject into graph module
    original_registry = graph.registry
    graph.registry = test_registry

    # 2. Setup Mock LLMs

    # Orchestrator's Mock Response (Dynamic based on target)
    orchestrator_response = OrchestratorRoutingOutput(
        analysis=f"Delegating to {target_agent}",
        subtasks=[SubtaskAssignment(agent=target_agent, task=goal, priority=5)],
        meeting_required=False,
        meeting_agents=[],
    )

    test_registry["orchestrator"]._llm = RunnableLambda(
        lambda x: AIMessage(content=orchestrator_response.model_dump_json())
    )

    # Target Agent's Mock Response
    test_registry[target_agent]._llm = RunnableLambda(
        lambda x: AIMessage(content=mock_output.model_dump_json())
    )

    try:
        # 3. Prepare Initial State
        state = create_initial_state(goal)

        # 4. PRE-CONDITION: Set target agent to "War Room" to test location consistency return
        await mock_context.update_agent(
            target_agent, current_room="War Room", status="Idle"
        )

        # Verify pre-condition
        agent_pre = await mock_context.get_agent(target_agent)
        assert agent_pre["current_room"] == "War Room"

        # 5. Run the Graph
        result = await graph.graph.ainvoke(state)

        # 6. Assertions

        # Verify Orchestrator delegation
        assert result["delegated_agents"] == [target_agent]

        # Verify Target Agent Execution (via logs)
        logs = await mock_context.get_activity_log(target_agent)
        assert any(log["action"] == f"{target_agent}_complete" for log in logs)

        # 7. LOCATION CONSISTENCY CHECK
        # Verify agent returned to their specific default room
        agent_post = await mock_context.get_agent(target_agent)
        assert agent_post["current_room"] == default_room, (
            f"{target_agent} should have returned to {default_room}, but is in {agent_post['current_room']}"
        )

        assert agent_post["status"] == "Idle"

    finally:
        # Restore original registry
        graph.registry = original_registry
