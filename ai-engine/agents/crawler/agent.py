"""
Crawler — Content Crawler Agent
Autonomous temporal loop agent. Searches the web, scrapes URLs, and
summarizes content to populate the shared knowledge base.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from urllib.request import Request, urlopen

from langchain_core.prompts import ChatPromptTemplate

from core.base_agent import BaseAgent
from core.context import AgentContext
from core.schemas import CrawlerCrawlOutput, CrawlFinding
from core.state import OfficeState
from agents.crawler.prompts import PROMPT

logger = logging.getLogger("devswarm.agents.crawler")

UTC_ENDPOINTS = (
    ("worldtimeapi", "https://worldtimeapi.org/api/timezone/Etc/UTC"),
    ("timeapi", "https://timeapi.io/api/Time/current/zone?timeZone=UTC"),
)


class CrawlerAgent(BaseAgent[CrawlerCrawlOutput]):
    """Content crawler that searches the web for trending topics."""

    agent_id = "crawler"
    name = "Crawler"
    role = "Content Crawler"
    default_room = "Desks"
    output_schema = CrawlerCrawlOutput

    def build_prompt(self) -> ChatPromptTemplate:
        return PROMPT

    @staticmethod
    def _is_connectivity_goal(goal: str) -> bool:
        goal_l = goal.lower()
        return (
            ("connectivity" in goal_l and "utc" in goal_l)
            or "external network access" in goal_l
            or "network reachability" in goal_l
        )

    @staticmethod
    def _extract_utc_timestamp(payload: dict) -> str | None:
        for key in (
            "utc_datetime",
            "datetime",
            "dateTime",
            "currentDateTime",
            "utcDateTime",
        ):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    @staticmethod
    def _check_utc_endpoint(source: str, url: str, timeout_seconds: float = 4.0) -> tuple[str, str]:
        req = Request(url, headers={"User-Agent": "DevSwarm/1.0"})
        with urlopen(req, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8", errors="replace")

        payload = json.loads(raw)
        timestamp = CrawlerAgent._extract_utc_timestamp(payload)
        if not timestamp:
            raise ValueError(f"{source} response missing UTC datetime field")

        return timestamp, url

    async def _build_connectivity_finding(self) -> CrawlFinding:
        local_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        errors: list[str] = []

        for source, url in UTC_ENDPOINTS:
            try:
                endpoint_time, endpoint_url = await asyncio.to_thread(
                    self._check_utc_endpoint, source, url
                )
                return CrawlFinding(
                    topic="UTC Connectivity Verification",
                    summary=(
                        f"External reachability confirmed via {source}. "
                        f"Endpoint UTC: {endpoint_time}. Local UTC at runtime: {local_utc}."
                    ),
                    sources=[endpoint_url],
                    relevance_score=10,
                    tags=["connectivity", "utc", "network"],
                )
            except Exception as exc:
                errors.append(f"{source}: {exc}")

        error_summary = "; ".join(errors[:2]) if errors else "unknown error"
        return CrawlFinding(
            topic="UTC Connectivity Verification",
            summary=(
                "External reachability could not be confirmed from the crawler runtime. "
                f"Local UTC at runtime: {local_utc}. Endpoint checks failed: {error_summary}."
            ),
            sources=[url for _, url in UTC_ENDPOINTS],
            relevance_score=9,
            tags=["connectivity", "utc", "network", "verification_failed"],
        )

    async def execute(
        self,
        state: OfficeState,
        parsed: CrawlerCrawlOutput,
        context: AgentContext,
    ) -> OfficeState:
        """Report crawl findings to Archivist for KB archival."""
        findings = parsed.findings
        if self._is_connectivity_goal(state.get("current_goal", "")):
            findings = [await self._build_connectivity_finding()]

        await context.update_agent(
            self.agent_id,
            current_task="Crawling web for trending content",
            thought_chain=f"Found {len(findings)} trending topics. Summarizing findings.",
        )

        # Share findings with Archivist
        for finding in findings:
            await context.create_message(
                from_agent=self.agent_id,
                to_agent="archivist",
                content=f"New finding: {finding.topic} - {finding.summary}",
                message_type="knowledge",
            )

        await context.update_agent(
            self.agent_id,
            thought_chain=f"Crawl cycle complete. Found {len(findings)} items.",
        )

        state["crawl_results"] = [f.model_dump() for f in findings]
        return state


agent = CrawlerAgent()
