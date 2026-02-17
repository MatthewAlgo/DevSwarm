"""Jimmy - MCP Tools for web crawling and content extraction."""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Jimmy_ContentCrawler")


@mcp.tool()
async def search_web(query: str, max_results: int = 5) -> str:
    """Search the web for a given query and return summarized results."""
    import asyncio

    await asyncio.sleep(1)  # Simulate network latency
    results = [
        f"Result {i + 1}: '{query}' - Key finding about {query} from source {i + 1}"
        for i in range(min(max_results, 5))
    ]
    return "\n".join(results)


@mcp.tool()
async def scrape_url(url: str) -> str:
    """Scrape content from a given URL and extract key text."""
    import asyncio

    await asyncio.sleep(1.5)
    return f"Scraped content from {url}: [Simulated article text with key insights about the topic]"


@mcp.tool()
async def summarize_text(text: str, max_length: int = 200) -> str:
    """Summarize a long text into a concise format."""
    import asyncio

    await asyncio.sleep(0.5)
    summary = text[:max_length] + "..." if len(text) > max_length else text
    return f"Summary: {summary}"
