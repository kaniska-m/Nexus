# ============================================================================
# Tests — Supplier Portal API Routes
# ============================================================================

import pytest
from httpx import AsyncClient, ASGITransport

from backend.api.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestSupplierForm:
    """Test /api/supplier/{id}/form endpoint."""

    async def test_form_404(self, client):
        """Unknown vendor returns 404."""
        response = await client.get("/api/supplier/nonexistent-id/form")
        assert response.status_code == 404


class TestSupplierStatus:
    """Test /api/supplier/{id}/status endpoint."""

    async def test_status_404(self, client):
        """Unknown vendor returns 404."""
        response = await client.get("/api/supplier/nonexistent-id/status")
        assert response.status_code == 404


class TestSubmitDocument:
    """Test /api/supplier/{id}/submit-document endpoint."""

    async def test_submit_404(self, client):
        """Unknown vendor returns 404."""
        response = await client.post(
            "/api/supplier/nonexistent-id/submit-document",
            data={"document_name": "Test Doc"},
            files={"document": ("test.pdf", b"fake pdf content", "application/pdf")},
        )
        assert response.status_code == 404
