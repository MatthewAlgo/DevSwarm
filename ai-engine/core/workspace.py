import os
import docker
import asyncio
import logging

logger = logging.getLogger("devswarm.core.workspace")

class WorkspaceManager:
    """
    Unified Workspace Manager for DevSwarm Agents.
    Provides isolated file I/O within a Docker volume and ephemeral container execution.
    """

    def __init__(self, workspace_path: str = "/workspace"):
        """
        Initialize the WorkspaceManager.
        :param workspace_path: The absolute path inside the ai-engine container where the volume is mounted.
        """
        self.workspace_path = workspace_path
        try:
            os.makedirs(self.workspace_path, exist_ok=True)
        except OSError:
            # Fallback for local testing
            self.workspace_path = os.path.abspath("./agent_workspace")
            os.makedirs(self.workspace_path, exist_ok=True)
        # We assume docker-compose passes HOST_WORKSPACE_VOLUME so we can mount the named volume 
        # to spawned ephemeral containers
        self.host_workspace_volume = os.environ.get("HOST_WORKSPACE_VOLUME", "agent_workspace")

    def _sanitize_path(self, relative_path: str) -> str:
        """Prevent directory traversal attacks."""
        if ".." in relative_path:
            relative_path = os.path.basename(relative_path)
        return relative_path.lstrip("/")

    def get_absolute_path(self, relative_path: str) -> str:
        """Get the absolute path within the workspace volume."""
        sanitized = self._sanitize_path(relative_path)
        return os.path.join(self.workspace_path, sanitized)

    def write_file(self, relative_path: str, content: str) -> None:
        """Write content to a file in the workspace."""
        abs_path = self.get_absolute_path(relative_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "w") as f:
            f.write(content)

    def read_file(self, relative_path: str) -> str:
        """Read content from a file in the workspace."""
        abs_path = self.get_absolute_path(relative_path)
        if os.path.exists(abs_path):
            with open(abs_path, "r") as f:
                return f.read()
        return ""

    def delete_file(self, relative_path: str) -> bool:
        """Delete a file from the workspace."""
        abs_path = self.get_absolute_path(relative_path)
        if os.path.exists(abs_path):
            os.remove(abs_path)
            return True
        return False

    def file_exists(self, relative_path: str) -> bool:
        """Check if a file exists in the workspace."""
        return os.path.exists(self.get_absolute_path(relative_path))

    def list_files(self, relative_dir: str = "") -> list[str]:
        """List all files in a workspace directory recursively."""
        abs_dir = self.get_absolute_path(relative_dir)
        if not os.path.exists(abs_dir) or not os.path.isdir(abs_dir):
            return []
        
        files = []
        for root, _, filenames in os.walk(abs_dir):
            for filename in filenames:
                full_path = os.path.join(root, filename)
                # Convert back to relative path
                rel_path = os.path.relpath(full_path, self.workspace_path)
                files.append(rel_path)
        return files

    async def execute_command(self, command: str, image: str = "python:3.12-slim", timeout_seconds: int = 60) -> dict:
        """
        Run a bash command inside an ephemeral Docker container with the workspace mounted.
        """
        try:
            client = docker.from_env()
        except Exception as e:
            logger.error(f"Failed to connect to Docker daemon: {e}")
            return {"command": command, "exit_code": -1, "output": f"Docker not available: {e}"}

        def _run_and_wait():
            container = None
            try:
                container = client.containers.run(
                    image=image,
                    command=f"sh -c '{command}'",
                    # Mount the named volume directly to the ephemeral container
                    volumes={self.host_workspace_volume: {'bind': '/workspace', 'mode': 'rw'}},
                    working_dir="/workspace",
                    detach=True,
                )
                
                # Wait for the container to finish, with a timeout
                result = container.wait(timeout=timeout_seconds)
                logs = container.logs().decode("utf-8")
                return result.get("StatusCode", -1), logs
                
            except docker.errors.ContainerError as ce:
                # Command returned non-zero
                logs = ce.container.logs().decode("utf-8") if hasattr(ce, "container") and ce.container else str(ce)
                return ce.exit_status, logs
            except docker.errors.DockerException as inner_e:
                return -1, f"Execution error: {str(inner_e)}"
            finally:
                if container:
                    try:
                        container.remove(force=True)
                    except docker.errors.APIError as e:
                        logger.warning(f"Failed to cleanup container {container.id}: {e}")

        try:
            exit_code, logs = await asyncio.to_thread(_run_and_wait)
        except asyncio.CancelledError:
            raise
        except RuntimeError as e:
            exit_code, logs = -1, f"Task failed: {e}"
        
        return {
            "command": command,
            "exit_code": exit_code,
            "output": logs
        }

# Global workspace manager instance
workspace_manager = WorkspaceManager()
