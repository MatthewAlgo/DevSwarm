#!/usr/bin/env python3
"""
DevSwarm Live Swarm Monitor
Polls the API for messages and agent state changes to provide a live view of the swarm.
"""

import asyncio
import os
import time
import httpx
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

API_ENDPOINT = os.getenv("AI_ENGINE_URL", "http://localhost:8000")
AUTH_HEADERS = {
    "Authorization": os.getenv("API_AUTH_TOKEN", "Bearer devswarm-secret-key")
}

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

AGENT_COLORS = {
    "orchestrator": Colors.HEADER,
    "crawler": Colors.CYAN,
    "researcher": Colors.BLUE,
    "viral_engineer": Colors.GREEN,
    "comms": Colors.WARNING,
    "devops": Colors.FAIL,
    "archivist": Colors.BOLD,
    "frontend_designer": Colors.UNDERLINE,
    "system": Colors.BOLD,
    "user": Colors.GREEN
}

def get_agent_color(agent_id):
    return AGENT_COLORS.get(agent_id, Colors.ENDC)

async def fetch_state():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_ENDPOINT}/api/state", headers=AUTH_HEADERS)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"{Colors.FAIL}Error fetching state: {e}{Colors.ENDC}")
    return None

async def fetch_messages(limit=10):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_ENDPOINT}/api/messages?limit={limit}", headers=AUTH_HEADERS)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"{Colors.FAIL}Error fetching messages: {e}{Colors.ENDC}")
    return []

async def main_loop():
    print(f"{Colors.BOLD}{Colors.CYAN}=== DevSwarm Live Swarm Monitor ==={Colors.ENDC}")
    print(f"Connecting to {API_ENDPOINT}...")
    
    seen_messages = set()
    last_agent_states = {}
    
    # Initialize seen messages
    initial_messages = await fetch_messages(50)
    for msg in initial_messages:
        seen_messages.add(msg.get("id"))
    
    while True:
        state = await fetch_state()
        if state:
            agents = state.get("agents", {})
            
            # Show agent status changes
            for agent_id, agent_data in agents.items():
                old_state = last_agent_states.get(agent_id)
                new_status = agent_data.get("status")
                new_room = agent_data.get("room")
                new_task = agent_data.get("currentTask")
                
                if not old_state or old_state.get("status") != new_status or old_state.get("room") != new_room:
                    color = get_agent_color(agent_id)
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    
                    status_str = f"[{timestamp}] {color}{agent_data.get('name')}{Colors.ENDC}"
                    status_str += f" moved to {Colors.CYAN}{new_room}{Colors.ENDC}"
                    status_str += f" | Status: {Colors.BOLD}{new_status}{Colors.ENDC}"
                    
                    if new_task:
                        status_str += f" | Task: {new_task}"
                    
                    print(status_str)
                    
                    # If there's a thought chain, show it if it's new
                    thought = agent_data.get("thoughtChain")
                    if thought and (not old_state or old_state.get("thoughtChain") != thought):
                        print(f"  {Colors.BLUE}💭 Thought: {thought}{Colors.ENDC}")
                
                last_agent_states[agent_id] = agent_data
        
        # Show new messages
        messages = await fetch_messages(20)
        for msg in reversed(messages):
            msg_id = msg.get("id")
            if msg_id not in seen_messages:
                seen_messages.add(msg_id)
                from_agent = msg.get("fromAgent")
                to_agent = msg.get("toAgent")
                content = msg.get("content")
                msg_type = msg.get("messageType")
                timestamp = msg.get("createdAt")
                
                from_color = get_agent_color(from_agent)
                to_color = get_agent_color(to_agent)
                
                print(f"{Colors.GREEN}✉️  {from_color}{from_agent}{Colors.ENDC} -> {to_color}{to_agent}{Colors.ENDC} ({msg_type}): {content}")
        
        await asyncio.sleep(2)

if __name__ == "__main__":
    try:
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        print("
Monitor stopped.")
