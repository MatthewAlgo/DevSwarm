"""
DevSwarm AI Engine - Redis Client
Async Redis operations for pub/sub, task queuing (Streams), and caching.
"""

import asyncio
import json
import logging
import os
import uuid
from typing import Any, Optional

import redis.asyncio as aioredis

logger = logging.getLogger("devswarm.redis")

# Channel / Stream names (must match Go backend)
STATE_CHANGED_CHANNEL = "devswarm:state_changed"
TASK_QUEUE_STREAM = "devswarm:task_queue"
AGENT_EVENT_CHANNEL = "devswarm:agent_events"

# Consumer group for the AI engine workers
CONSUMER_GROUP = "ai_engine_workers"
CONSUMER_NAME = os.getenv("WORKER_NAME", f"worker_{uuid.uuid4().hex[:8]}")

_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Get or create the async Redis connection pool."""
    global _pool
    if _pool is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _pool = aioredis.from_url(url, decode_responses=True)
        # Verify connection
        await _pool.ping()
        logger.info("Redis connection pool created")
    return _pool


async def close_redis():
    """Close the Redis connection pool."""
    global _pool
    if _pool:
        await _pool.aclose()
        _pool = None
        logger.info("Redis connection pool closed")


async def ping() -> bool:
    """Check Redis connectivity."""
    try:
        r = await get_redis()
        return await r.ping()
    except Exception:
        return False


# --- Pub/Sub ---

async def publish(channel: str, message: str) -> int:
    """Publish a message to a Redis channel."""
    r = await get_redis()
    return await r.publish(channel, message)


async def publish_state_changed() -> int:
    """Notify all subscribers that the office state has changed."""
    return await publish(STATE_CHANGED_CHANNEL, "state_updated")


async def publish_agent_event(agent_id: str, event_type: str, data: dict | None = None) -> int:
    """Publish an agent event for real-time tracking."""
    payload = json.dumps({
        "agent_id": agent_id,
        "event": event_type,
        "data": data or {},
    })
    return await publish(AGENT_EVENT_CHANNEL, payload)


# --- Task Queue (Redis Streams) ---

async def ensure_consumer_group():
    """Create the consumer group for the task queue if it doesn't exist."""
    r = await get_redis()
    try:
        await r.xgroup_create(TASK_QUEUE_STREAM, CONSUMER_GROUP, id="0", mkstream=True)
        logger.info(f"Consumer group '{CONSUMER_GROUP}' created for stream '{TASK_QUEUE_STREAM}'")
    except aioredis.ResponseError as e:
        if "BUSYGROUP" in str(e):
            pass  # Group already exists
        else:
            raise


async def enqueue_task(goal: str, priority: int = 0, assigned_to: list[str] | None = None) -> str:
    """Add a task to the Redis Stream for async processing."""
    r = await get_redis()
    task_data = {
        "goal": goal,
        "priority": str(priority),
        "assigned_to": json.dumps(assigned_to or []),
    }
    msg_id = await r.xadd(TASK_QUEUE_STREAM, task_data)
    logger.info(f"Task enqueued: {msg_id} — {goal[:60]}")
    return msg_id


async def dequeue_tasks(count: int = 1, block_ms: int = 5000) -> list[dict]:
    """
    Read tasks from the stream as a consumer in the group.
    Returns a list of {id, goal, priority, assigned_to} dicts.
    """
    r = await get_redis()
    try:
        results = await r.xreadgroup(
            groupname=CONSUMER_GROUP,
            consumername=CONSUMER_NAME,
            streams={TASK_QUEUE_STREAM: ">"},
            count=count,
            block=block_ms,
        )
    except aioredis.ResponseError:
        return []

    tasks = []
    if results:
        for stream_name, messages in results:
            for msg_id, data in messages:
                tasks.append({
                    "id": msg_id,
                    "goal": data.get("goal", ""),
                    "priority": int(data.get("priority", "0")),
                    "assigned_to": json.loads(data.get("assigned_to", "[]")),
                })
    return tasks


async def ack_task(msg_id: str) -> int:
    """Acknowledge a processed task in the consumer group."""
    r = await get_redis()
    return await r.xack(TASK_QUEUE_STREAM, CONSUMER_GROUP, msg_id)


# --- Caching ---

async def cache_set(key: str, value: Any, ttl_seconds: int = 30) -> bool:
    """Store a value in Redis cache with TTL."""
    r = await get_redis()
    serialized = json.dumps(value) if not isinstance(value, str) else value
    return await r.setex(f"cache:{key}", ttl_seconds, serialized)


async def cache_get(key: str) -> Any:
    """Retrieve a value from Redis cache. Returns None if not found."""
    r = await get_redis()
    val = await r.get(f"cache:{key}")
    if val is None:
        return None
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return val


async def cache_delete(*keys: str) -> int:
    """Delete keys from Redis cache."""
    r = await get_redis()
    prefixed = [f"cache:{k}" for k in keys]
    return await r.delete(*prefixed)


async def invalidate_agent_cache() -> int:
    """Clear cached agent and state data."""
    return await cache_delete("agents", "state")
