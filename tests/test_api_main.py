# ============================================================================
# Tests — FastAPI Main Endpoints
# ============================================================================

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from backend.api.main import app


@pytest.fixture
async def client():
    """Create an async test client for the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealthEndpoint:
    """Test /health endpoint."""

    async def test_health_check(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "agents" in data["data"]
        assert len(data["data"]["agents"]) == 6


class TestVendorOnboard:
    """Test /api/vendor/onboard endpoint."""

    @patch("backend.agents.orchestrator.call_llm_json", new_callable=AsyncMock)
    async def test_onboard_vendor(self, mock_llm, client):
        """POST /api/vendor/onboard creates vendor."""
        mock_llm.return_value = {
            "checklist": [
                {"category": "Legal", "document_name": "Certificate of Incorporation", "description": "MCA21", "required": True},
            ]
        }
        response = await client.post("/api/vendor/onboard", json={
            "vendor_name": "API Test Corp",
            "industry": "IT",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "vendor_id" in data["data"]
        assert data["data"]["vendor_name"] == "API Test Corp"
        assert len(data["data"]["checklist"]) > 0


class TestVendorStatus:
    """Test /api/vendor/{id}/status endpoint."""

    async def test_vendor_status_404(self, client):
        """Unknown vendor returns 404."""
        response = await client.get("/api/vendor/nonexistent-id/status")
        assert response.status_code == 404


class TestListVendors:
    """Test /api/vendors endpoint."""

    async def test_list_vendors(self, client):
        """GET /api/vendors returns vendor list."""
        response = await client.get("/api/vendors")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "vendors" in data["data"]
        assert "total" in data["data"]


class TestMonitorEndpoint:
    """Test /api/vendor/{id}/monitor endpoint."""

    async def test_monitor_404(self, client):
        """Monitor check on unknown vendor returns 404."""
        response = await client.post("/api/vendor/nonexistent-id/monitor")
        assert response.status_code == 404
