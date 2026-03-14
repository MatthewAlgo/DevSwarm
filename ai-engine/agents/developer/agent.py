"""
Developer Agent — Implements coding and implementation logic.
"""

from __future__ import annotations

import logging
from langchain_core.prompts import ChatPromptTemplate



from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import DeveloperOutput
from core.state import OfficeState
from core.workspace import workspace_manager
from agents.developer.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.developer")

class DeveloperAgent(BaseAgent[DeveloperOutput]):
    """Software Developer agent that writes code."""

    agent_id = "developer"
    name = "Developer"
    role = "Software Engineer"
    default_room = "Desks"
    output_schema = DeveloperOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    async def execute(
        self,
        state: OfficeState,
        parsed: DeveloperOutput,
        context: AgentContext,
    ) -> dict:
        """Write code to workspace, run tests in sandbox, and notify Reviewer."""
        updates = {}
        
        # 1. Write the code to the workspace using the new WorkspaceManager
        for change in parsed.changes:
            if change.action in ["create", "modify"]:
                workspace_manager.write_file(change.file_path, change.code_snippet)
            elif change.action == "delete":
                workspace_manager.delete_file(change.file_path)

        # 2. Run the test command in the sandbox if provided
        test_results = {}
        if parsed.test_command:
            test_results = await workspace_manager.execute_command(parsed.test_command)
            updates["test_results"] = test_results

        await self.update_status(
            current_task=f"Implementing: {parsed.implementation_plan[:50]}...",
            thought_chain=parsed.thought_process,
        )

        if parsed.ready_for_review:
            content_msg = f"Code ready for review: {parsed.implementation_plan}"
            if test_results:
                content_msg += f"\nTest Exit Code: {test_results.get('exit_code', 'N/A')}"

            # Share draft with Reviewer
            await self.broadcast_message(
            to_agent="reviewer",
                content=content_msg,
                message_type="delegation",
            )
            
            # Store in content drafts for reviewer to see
            updates["content_drafts"] = state.get("content_drafts", []) + [{
                "developer": self.agent_id,
                "plan": parsed.implementation_plan,
                "changes": [c.model_dump() for c in parsed.changes],
                "test_command": parsed.test_command,
                "test_results": test_results
            }]

        return updates


agent = DeveloperAgent()
