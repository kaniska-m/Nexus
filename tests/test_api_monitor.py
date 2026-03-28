# ============================================================================
# Tests — Monitor Routes API
# ============================================================================

import pytest
from httpx import AsyncClient, ASGITransport

from backend.api.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestMonitorDashboard:
    """Test /api/monitor/health-dashboard endpoint."""

    async def test_health_dashboard(self, client):
        response = await client.get("/api/monitor/health-dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        summary = data["data"]["summary"]
        assert "green" in summary
        assert "amber" in summary
        assert "red" in summary
        assert "total" in summary


class TestRunHealthCheck:
    """Test /api/monitor/{id}/run-check endpoint."""

    async def test_health_check_404(self, client):
        """Unknown vendor returns 404."""
        response = await client.post("/api/monitor/nonexistent-id/run-check")
        assert response.status_code == 404
