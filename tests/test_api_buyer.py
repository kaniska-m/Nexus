# ============================================================================
# Tests — Buyer Dashboard API Routes
# ============================================================================

import pytest
from httpx import AsyncClient, ASGITransport

from backend.api.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestBuyerDashboard:
    """Test /api/buyer/dashboard endpoint."""

    async def test_dashboard_returns_summary(self, client):
        response = await client.get("/api/buyer/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        summary = data["data"]["summary"]
        assert "total_vendors" in summary
        assert "active" in summary
        assert "complete" in summary
        assert "escalated" in summary
        assert "time_saved_hours" in summary

    async def test_dashboard_returns_vendors(self, client):
        response = await client.get("/api/buyer/dashboard")
        data = response.json()
        vendors = data["data"]["vendors"]
        assert isinstance(vendors, list)
        if vendors:
            v = vendors[0]
            assert "vendor_id" in v
            assert "vendor_name" in v
            assert "workflow_status" in v


class TestBuyerExceptions:
    """Test /api/buyer/exceptions endpoint."""

    async def test_exceptions_endpoint(self, client):
        response = await client.get("/api/buyer/exceptions")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "exceptions" in data["data"]
        assert "total" in data["data"]
