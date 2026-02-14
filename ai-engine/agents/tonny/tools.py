"""Tonny - MCP Tools for email and communication management."""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Tonny_CommsInterface")


@mcp.tool()
async def fetch_emails(folder: str = "inbox", limit: int = 10) -> str:
    """Fetch recent emails from the specified folder."""
    import asyncio
    await asyncio.sleep(1)
    return f"Fetched {limit} emails from {folder}. 3 unread, 1 flagged as high priority."


@mcp.tool()
async def draft_reply(original_subject: str, reply_body: str) -> str:
    """Draft a professional reply to an email."""
    import asyncio
    await asyncio.sleep(0.5)
    return f"Draft reply created for: Re: {original_subject}"


@mcp.tool()
async def send_newsletter(subject: str, content: str, recipients: str = "all") -> str:
    """Send a newsletter to specified recipients."""
    import asyncio
    await asyncio.sleep(1)
    return f"Newsletter '{subject}' queued for delivery to {recipients}."
