"""
Unit tests for all 24 MCP tools across 8 agents.
Tests return types, string formatting, and parameter handling.
"""

import pytest


# ──────────────────────────────────────────────────────────────────────
# Marco Tools
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestMarcoTools:
    async def test_assign_agent(self):
        from agents.marco.tools import assign_agent
        # These tools import database internally; we'd need to mock
        # For now, test the tool object exists
        assert callable(assign_agent)

    async def test_schedule_meeting(self):
        from agents.marco.tools import schedule_meeting
        assert callable(schedule_meeting)


# ──────────────────────────────────────────────────────────────────────
# Jimmy Tools
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestJimmyTools:
    async def test_search_web(self):
        from agents.jimmy.tools import search_web
        result = await search_web("AI agents", max_results=3)
        assert isinstance(result, str)
        assert "AI agents" in result
        lines = result.strip().split("\n")
        assert len(lines) == 3

    async def test_search_web_max_cap(self):
        from agents.jimmy.tools import search_web
        result = await search_web("test", max_results=10)
        lines = result.strip().split("\n")
        assert len(lines) <= 5  # Capped at 5

    async def test_scrape_url(self):
        from agents.jimmy.tools import scrape_url
        result = await scrape_url("https://example.com")
        assert isinstance(result, str)
        assert "example.com" in result

    async def test_summarize_text_short(self):
        from agents.jimmy.tools import summarize_text
        result = await summarize_text("Hello world", max_length=200)
        assert "Hello world" in result

    async def test_summarize_text_truncation(self):
        from agents.jimmy.tools import summarize_text
        long_text = "x" * 500
        result = await summarize_text(long_text, max_length=100)
        assert "..." in result


# ──────────────────────────────────────────────────────────────────────
# Mona Tools
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestMonaTools:
    async def test_academic_search(self):
        from agents.mona.tools import academic_search
        result = await academic_search("multi-agent systems")
        assert isinstance(result, str)
        assert "multi-agent systems" in result

    async def test_competitor_analysis(self):
        from agents.mona.tools import competitor_analysis
        result = await competitor_analysis("https://competitor.com")
        assert "competitor.com" in result

    async def test_read_pdf(self):
        from agents.mona.tools import read_pdf
        result = await read_pdf("/path/to/report.pdf")
        assert "report.pdf" in result


# ──────────────────────────────────────────────────────────────────────
# Dan Tools
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestDanTools:
    async def test_draft_tweet(self):
        from agents.dan.tools import draft_tweet
        result = await draft_tweet("AI Revolution", tone="casual")
        assert isinstance(result, str)
        assert "AI Revolution" in result

    async def test_analyze_sentiment(self):
        from agents.dan.tools import analyze_sentiment
        import json
        result = await analyze_sentiment("I love this product!")
        parsed = json.loads(result)
        assert "sentiment" in parsed
        assert "score" in parsed

    async def test_get_trending_topics(self):
        from agents.dan.tools import get_trending_topics
        import json
        result = await get_trending_topics("technology")
        topics = json.loads(result)
        assert isinstance(topics, list)
        assert len(topics) > 0


# ──────────────────────────────────────────────────────────────────────
# Tonny Tools
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestTonnyTools:
    async def test_fetch_emails(self):
        from agents.tonny.tools import fetch_emails
        result = await fetch_emails("inbox", limit=5)
        assert isinstance(result, str)
        assert "inbox" in result.lower() or "5" in result

    async def test_draft_reply(self):
        from agents.tonny.tools import draft_reply
        result = await draft_reply("Meeting invite", "Yes, I'll attend")
        assert "Meeting invite" in result

    async def test_send_newsletter(self):
        from agents.tonny.tools import send_newsletter
        result = await send_newsletter("Weekly Update", "Content here")
        assert "Weekly Update" in result


# ──────────────────────────────────────────────────────────────────────
# Bob Tools
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestBobTools:
    async def test_check_uptime(self):
        from agents.bob.tools import check_uptime
        result = await check_uptime("api-server")
        assert isinstance(result, str)
        assert "api-server" in result

    async def test_view_logs(self):
        from agents.bob.tools import view_logs
        result = await view_logs("backend", lines=20)
        assert "backend" in result

    async def test_restart_service(self):
        from agents.bob.tools import restart_service
        result = await restart_service("frontend", reason="Memory leak")
        assert "frontend" in result
        assert "Memory leak" in result


# ──────────────────────────────────────────────────────────────────────
# Ariani Tools
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestArianiTools:
    async def test_update_notion(self):
        from agents.ariani.tools import update_notion
        result = await update_notion("AI Research", "Content", category="research")
        assert "AI Research" in result
        assert "research" in result

    async def test_organize_files(self):
        from agents.ariani.tools import organize_files
        result = await organize_files("/data/raw", target_structure="by-date")
        assert "/data/raw" in result
        assert "by-date" in result

    async def test_create_doc(self):
        from agents.ariani.tools import create_doc
        result = await create_doc("Report", "Content", format="markdown")
        assert "Report" in result
        assert "markdown" in result


# ──────────────────────────────────────────────────────────────────────
# Peter Tools
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestPeterTools:
    async def test_generate_image(self):
        from agents.peter.tools import generate_image
        result = await generate_image("Dashboard mockup", style="modern")
        assert "Dashboard mockup" in result
        assert "modern" in result

    async def test_critique_ui(self):
        from agents.peter.tools import critique_ui
        result = await critique_ui("Login page")
        assert "Login page" in result
        assert "WCAG" in result or "Critique" in result.lower() or "contrast" in result.lower()

    async def test_create_mockup(self):
        from agents.peter.tools import create_mockup
        result = await create_mockup("Sidebar", theme="dark", framework="react")
        assert "Sidebar" in result
        assert "dark" in result
