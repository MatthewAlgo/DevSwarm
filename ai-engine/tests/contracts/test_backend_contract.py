import pytest
import os
import requests
from tests.contracts.api_schema import AgentBase, Task, HealthCheckResponse

# Base URL from env or default to localhost
BACKEND_URL = os.getenv("BACKEND_TEST_URL", "http://localhost:8080")
AUTH_HEADERS = {"Authorization": "Bearer devswarm-secret-key"}


@pytest.mark.contract
class TestBackendContract:
    def test_health_check_contract(self):
        """Verify health check endpoint schema."""
        try:
            resp = requests.get(f"{BACKEND_URL}/health", timeout=2)
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend not running at " + BACKEND_URL)

        assert resp.status_code == 200
        # Validate against schema
        HealthCheckResponse(**resp.json())

    def test_list_agents_contract(self):
        """Verify list agents endpoint schema."""
        try:
            resp = requests.get(
                f"{BACKEND_URL}/api/agents", headers=AUTH_HEADERS, timeout=2
            )
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend not running at " + BACKEND_URL)

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

        # Validate each item
        for item in data:
            # Pydantic validation
            AgentBase(**item)

    def test_list_tasks_contract(self):
        """Verify list tasks endpoint schema."""
        try:
            resp = requests.get(
                f"{BACKEND_URL}/api/tasks", headers=AUTH_HEADERS, timeout=2
            )
        except requests.exceptions.ConnectionError:
            pytest.skip("Backend not running at " + BACKEND_URL)

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

        for item in data:
            Task(**item)
