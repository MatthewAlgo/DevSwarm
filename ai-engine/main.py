"""
DevSwarm AI Engine - FastAPI Application
REST API for state mutations, agent triggers, MCP server exposure, and health checks.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import database as db
from models import (
    AgentState,
    AgentUpdateRequest,
    StateOverrideRequest,
    TriggerTaskRequest,
    TaskModel,
    MessageModel,
)
from core.state import create_initial_state, OfficeState
from graph import graph, registry as agent_registry
from mcp_server import list_all_tools
from services.agent_dispatcher import AgentTaskDispatcher
from services.graph_execution import GraphExecutionService
from services.task_queue_worker import TaskQueueWorker

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("devswarm.main")

_dispatcher: AgentTaskDispatcher | None = None
_graph_service: GraphExecutionService | None = None
_queue_worker: TaskQueueWorker | None = None


# --- Lifespan ---


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    global _dispatcher, _graph_service, _queue_worker

    logger.info("=== DevSwarm AI Engine Starting ===")
    await db.get_pool()
    logger.info("Database pool initialized")

    _dispatcher = AgentTaskDispatcher(db=db, agent_registry=agent_registry)
    _graph_service = GraphExecutionService(
        graph=graph,
        dispatcher=_dispatcher,
        db=db,
    )

    # Initialize Redis
    worker_task = None
    try:
        import redis_client

        await redis_client.get_redis()
        await redis_client.ensure_consumer_group()
        logger.info("Redis initialized with consumer group")

        _queue_worker = TaskQueueWorker(
            redis_queue=redis_client,
            graph_runner=_graph_service,
            db=db,
        )
        worker_task = asyncio.create_task(_task_queue_worker())
    except Exception as e:
        logger.warning(f"Redis initialization failed (non-fatal): {e}")

    dispatcher_task = asyncio.create_task(_dispatcher.run_forever())

    yield

    # Shutdown
    for task in (worker_task, dispatcher_task):
        if not task:
            continue
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    _queue_worker = None
    _graph_service = None
    _dispatcher = None

    try:
        import redis_client

        await redis_client.close_redis()
    except Exception:
        pass

    await db.close_pool()
    logger.info("=== DevSwarm AI Engine Shutting Down ===")


async def _task_queue_worker():
    """Proxy entrypoint for the Redis queue worker service."""
    if _queue_worker is None:
        return
    await _queue_worker.run()


# Strong references to background tasks to prevent GC from dropping them
_background_tasks: set[asyncio.Task] = set()

# --- App ---

app = FastAPI(
    title="DevSwarm AI Engine",
    description="Cognitive orchestration engine for the DevSwarm multi-agent virtual office",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def auth_middleware(request, call_next):
    """Enforce Bearer token authentication."""
    # Skip auth for health check and docs
    if request.url.path in ["/health", "/docs", "/openapi.json"]:
        return await call_next(request)

    # Simple static token for now (MVP)
    expected_token = "Bearer devswarm-secret-key"
    auth_header = request.headers.get("Authorization")

    if auth_header != expected_token:
        # Return 401 Unauthorized
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    response = await call_next(request)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health ---


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "devswarm-ai-engine"}


# --- Agent Endpoints ---


@app.get("/api/agents", response_model=List[AgentState])
async def list_agents():
    """List all agents and their current states."""
    agents = await db.get_all_agents()
    return agents


@app.get("/api/agents/{agent_id}", response_model=AgentState)
async def get_agent(agent_id: str):
    """Get a specific agent's state."""
    agent = await db.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@app.patch("/api/agents/{agent_id}")
async def update_agent(agent_id: str, req: AgentUpdateRequest):
    """Update an agent's state."""
    agent = await db.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await db.update_agent(
        agent_id,
        current_room=req.current_room,
        status=req.status,
        current_task=req.current_task,
        thought_chain=req.thought_chain,
    )

    await db.log_activity(
        agent_id,
        "agent_updated",
        {
            "room": req.current_room,
            "status": req.status,
        },
    )

    return {"status": "updated"}


# --- Task Endpoints ---


@app.get("/api/tasks", response_model=List[TaskModel])
async def list_tasks(agent_id: Optional[str] = Query(None)):
    """List tasks, optionally filtered by agent."""
    if agent_id:
        return await db.get_tasks_by_agent(agent_id)
    return await db.get_all_tasks()


@app.post("/api/tasks")
async def create_task(task: TaskModel):
    """Create a new task."""
    task_id = await db.create_task(
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        created_by=task.created_by,
        assigned_agents=task.assigned_agents,
    )
    return {"id": task_id}


@app.patch("/api/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str = Query(...)):
    """Update a task's kanban status."""
    await db.update_task_status(task_id, status)
    return {"status": "updated"}


# --- Message Endpoints ---


@app.get("/api/messages", response_model=List[MessageModel])
async def list_messages(limit: int = Query(50, ge=1, le=200)):
    """Get recent inter-agent messages."""
    return await db.get_recent_messages(limit)


@app.post("/api/messages")
async def create_message(msg: MessageModel):
    """Create a new inter-agent message."""
    msg_id = await db.create_message(
        from_agent=msg.from_agent,
        to_agent=msg.to_agent,
        content=msg.content,
        message_type=msg.message_type,
    )
    return {"id": msg_id}


# --- State Endpoints ---


@app.get("/api/state")
async def get_state():
    """Get the full current office state."""
    agents = await db.get_all_agents()
    messages = await db.get_recent_messages(20)
    tasks = await db.get_all_tasks()
    return {
        "agents": {a["id"]: a for a in agents},
        "messages": messages,
        "tasks": tasks,
    }


@app.post("/api/state/override")
async def override_state(req: StateOverrideRequest):
    """Global state override (used by temporal daemon for clock in/out)."""
    await db.bulk_update_agents(req.global_status, req.default_room)
    await db.log_activity(
        "system",
        "state_override",
        {
            "status": req.global_status,
            "room": req.default_room,
            "message": req.message,
        },
    )
    return {"status": "overridden"}


# --- Trigger Endpoint ---


@app.post("/api/trigger")
async def trigger_task(req: TriggerTaskRequest):
    """Trigger the LangGraph workflow with a new goal.
    Uses Redis Streams for durable, queued task execution.
    Falls back to asyncio.create_task if Redis is unavailable.
    """
    try:
        # Try Redis-based queuing first
        try:
            import redis_client

            msg_id = await redis_client.enqueue_task(
                goal=req.goal,
                priority=req.priority,
                assigned_to=req.assigned_to,
            )
            return {"status": "queued", "goal": req.goal, "queue_id": msg_id}
        except Exception as redis_err:
            logger.warning(
                f"Redis enqueue failed, falling back to direct execution: {redis_err}"
            )
            # Fallback: direct execution with strong reference to prevent GC
            initial_state = create_initial_state(req.goal)
            task = asyncio.create_task(_run_graph(initial_state, req.goal))
            _background_tasks.add(task)
            task.add_done_callback(_background_tasks.discard)
            return {"status": "triggered", "goal": req.goal}
    except Exception as e:
        logger.error(f"Trigger error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _run_graph(initial_state: OfficeState, goal: str) -> None:
    """Proxy entrypoint for graph execution service (kept for test compatibility)."""
    if _graph_service is not None:
        await _graph_service.run(initial_state, goal)
        return

    # Safety fallback (e.g., invoked outside lifespan in tests/scripts).
    dispatcher = AgentTaskDispatcher(db=db, agent_registry=agent_registry)
    service = GraphExecutionService(graph=graph, dispatcher=dispatcher, db=db)
    await service.run(initial_state, goal)


# --- Cost Endpoints ---


@app.get("/api/costs")
async def get_costs():
    """Get aggregated costs per agent."""
    return await db.get_agent_costs()


# --- Activity Log ---


@app.get("/api/activity")
async def get_activity(limit: int = Query(50, ge=1, le=500)):
    """Get recent activity log entries."""
    return await db.get_activity_log(limit)


# --- MCP Tools Listing ---


@app.get("/api/mcp/tools")
async def get_mcp_tools():
    """List all available MCP tools across all agents."""
    return list_all_tools()


# --- Simulation ---


@app.post("/api/simulate/activity")
async def simulate_activity():
    """Trigger a simulated activity cycle (for demo/testing)."""
    from simulate_day import simulate_agent_activity

    asyncio.create_task(simulate_agent_activity())
    return {"status": "simulation_triggered"}


@app.post("/api/simulate/demo-day")
async def simulate_demo_day():
    """Run a condensed demo day cycle."""
    from simulate_day import run_demo_cycle

    asyncio.create_task(run_demo_cycle())
    return {"status": "demo_day_triggered"}
