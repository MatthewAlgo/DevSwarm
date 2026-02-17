"""Bob - MCP Tools for system monitoring and service management."""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Bob_DevOpsMonitor")


@mcp.tool()
async def check_uptime(service_name: str = "all") -> str:
    """Check the uptime status of specified or all services."""
    import asyncio

    await asyncio.sleep(0.5)
    return f"Uptime check for {service_name}: All services operational. Uptime: 99.97%"


@mcp.tool()
async def view_logs(service_name: str, lines: int = 50) -> str:
    """View recent log entries for a specified service."""
    import asyncio

    await asyncio.sleep(0.5)
    return f"Last {lines} log entries for {service_name}:\n[INFO] All operations normal\n[WARN] Minor latency spike at 10:42:03"


@mcp.tool()
async def restart_service(service_name: str, reason: str = "") -> str:
    """Restart a specified service with optional reason."""
    import asyncio

    await asyncio.sleep(2)
    return f"Service {service_name} restarted successfully. Reason: {reason or 'Manual restart'}"
