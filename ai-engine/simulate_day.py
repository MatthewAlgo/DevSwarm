"""
DevSwarm AI Engine - Temporal Day Simulation
Daemon that controls clock-in/clock-out cycles and periodic agent triggers.
"""

import asyncio
import datetime
import logging
import os

import httpx

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("devswarm.simulate_day")

API_ENDPOINT = os.getenv("AI_ENGINE_URL", "http://localhost:8000")


async def mutate_global_state(status: str, room: str, message: str = "") -> None:
    """Push a global state override to the FastAPI endpoint."""
    payload = {
        "global_status": status,
        "default_room": room,
        "message": message or f"Global system broadcast: {status} protocol initiated.",
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{API_ENDPOINT}/api/state/override", json=payload)
            if response.status_code == 200:
                logger.info(f"Successfully broadcasted global state: {status}")
            else:
                logger.warning(f"State override response: {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to mutate state: {e}")


async def trigger_agent_task(agent_id: str, task: str) -> None:
    """Trigger a specific agent to perform a task."""
    payload = {"goal": task, "assigned_to": [agent_id]}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{API_ENDPOINT}/api/trigger", json=payload)
            if response.status_code == 200:
                logger.info(f"Triggered {agent_id}: {task}")
        except Exception as e:
            logger.error(f"Failed to trigger {agent_id}: {e}")


async def simulate_agent_activity() -> None:
    """Simulate realistic agent activity throughout the day."""
    import random

    activities = [
        ("marco", "Review daily priorities and delegate morning tasks"),
        ("jimmy", "Perform scheduled content crawl cycle"),
        ("bob", "Run system health check"),
        ("tonny", "Process incoming communications"),
        ("mona", "Continue ongoing research tasks"),
        ("dan", "Draft new social media content"),
        ("ariani", "Organize today's knowledge base entries"),
        ("peter", "Review and iterate on current design tasks"),
    ]

    # Pick 2-3 random activities to simulate
    selected = random.sample(activities, min(3, len(activities)))

    for agent_id, task in selected:
        await trigger_agent_task(agent_id, task)
        await asyncio.sleep(random.uniform(2, 5))


async def temporal_loop() -> None:
    """
    Main temporal loop that manages the office day cycle.
    - 09:00 AM: Clock In — all agents move to Desks, set to Idle
    - Periodic: Trigger autonomous agent activities
    - 17:00 PM: Clock Out — all agents move to Lounge, set to Clocked Out
    """
    clocked_in = False
    last_activity_hour = -1

    logger.info("DevSwarm Temporal Daemon started")

    while True:
        now = datetime.datetime.now()
        current_hour = now.hour
        current_minute = now.minute

        # 09:00 AM - Clock In Protocol
        if current_hour == 9 and current_minute == 0 and not clocked_in:
            logger.info("=== 9 AM Clock In Sequence ===")
            await mutate_global_state(
                status="Idle",
                room="Desks",
                message="Good morning! All agents clocking in for the day.",
            )
            clocked_in = True
            last_activity_hour = 9

        # 17:00 PM - Clock Out Protocol
        elif current_hour == 17 and current_minute == 0 and clocked_in:
            logger.info("=== 5 PM Clock Out Sequence ===")
            await mutate_global_state(
                status="Clocked Out",
                room="Lounge",
                message="End of day. All agents clocking out. Active tasks paused.",
            )
            clocked_in = False

        # During work hours: periodic activity simulation (every hour)
        elif clocked_in and 9 < current_hour < 17 and current_hour != last_activity_hour:
            logger.info(f"=== Hourly Activity Cycle ({current_hour}:00) ===")
            await simulate_agent_activity()
            last_activity_hour = current_hour

        # Jimmy's 15-minute autonomous crawl cycle
        elif clocked_in and current_minute % 15 == 0:
            await trigger_agent_task("jimmy", "Scheduled 15-minute content crawl")

        await asyncio.sleep(60)  # Check every minute


async def run_demo_cycle() -> None:
    """
    Runs a condensed demo cycle for testing without waiting for real time.
    Simulates a full day in ~30 seconds.
    """
    logger.info("=== Starting Demo Day Cycle ===")

    # Clock in
    logger.info("[Demo] Clocking in all agents...")
    await mutate_global_state("Idle", "Desks", "Demo: Morning clock-in")
    await asyncio.sleep(3)

    # Simulate morning activities
    logger.info("[Demo] Morning activities...")
    await trigger_agent_task("marco", "Plan today's deliverables and assign work")
    await asyncio.sleep(5)

    # Midday research
    logger.info("[Demo] Midday research cycle...")
    await trigger_agent_task("jimmy", "Crawl trending AI news")
    await asyncio.sleep(3)
    await trigger_agent_task("mona", "Deep research on multi-agent architectures")
    await asyncio.sleep(5)

    # Afternoon content and comms
    logger.info("[Demo] Afternoon content creation...")
    await trigger_agent_task("dan", "Create social media content from today's research")
    await asyncio.sleep(3)
    await trigger_agent_task("tonny", "Process afternoon communications")
    await asyncio.sleep(3)

    # Health check
    logger.info("[Demo] End-of-day health check...")
    await trigger_agent_task("bob", "Run comprehensive health diagnostics")
    await asyncio.sleep(3)

    # KB update
    await trigger_agent_task("ariani", "Organize all today's outputs into knowledge base")
    await asyncio.sleep(3)

    # Clock out
    logger.info("[Demo] Clocking out all agents...")
    await mutate_global_state("Clocked Out", "Lounge", "Demo: Evening clock-out")

    logger.info("=== Demo Day Complete ===")


if __name__ == "__main__":
    import sys

    if "--demo" in sys.argv:
        asyncio.run(run_demo_cycle())
    else:
        asyncio.run(temporal_loop())
