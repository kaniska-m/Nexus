# ============================================================================
# Tests — Sanction Checker Tool
# ============================================================================

import os
import pytest
from unittest.mock import patch

from backend.tools.sanction_checker import check_sanctions, _mock_check_sanctions


class TestMockSanctionChecker:
    """Test the mock/fallback sanction checker (no API key)."""

    async def test_clean_entity(self):
        """Clean entity is not flagged."""
        result = await _mock_check_sanctions("Totally Clean Corp Inc")
        assert result["is_sanctioned"] is False
        assert result["total_matches"] == 0
        assert result["scan_status"] == "clear"

    async def test_sanctioned_company_exact(self):
        """Known sanctioned company is flagged."""
        result = await _mock_check_sanctions("Global Pharma Exports Ltd")
        assert result["is_sanctioned"] is True
        assert result["total_matches"] >= 1
        assert result["scan_status"] == "flagged"
        assert any("CDSCO" in m.get("source_list", "") for m in result["matches"])

    async def test_sanctioned_company_partial(self):
        """Partial name match triggers sanction flag."""
        result = await _mock_check_sanctions("Global Pharma Exports")
        assert result["is_sanctioned"] is True

    async def test_sanctioned_director(self):
        """Known sanctioned individual is flagged when passed as director."""
        result = await _mock_check_sanctions(
            "Some Clean Company",
            directors=["Vikram Patel"],
        )
        assert result["is_sanctioned"] is True
        assert any(m.get("match_type") == "director" for m in result["matches"])

    async def test_clean_directors(self):
        """Clean directors are not flagged."""
        result = await _mock_check_sanctions(
            "Clean Corp",
            directors=["John Smith", "Jane Doe"],
        )
        assert result["is_sanctioned"] is False

    async def test_mixed_directors(self):
        """Mix of clean and sanctioned directors produces correct results."""
        result = await _mock_check_sanctions(
            "Clean Corp",
            directors=["John Smith", "Anwar Sheikh", "Jane Doe"],
        )
        assert result["is_sanctioned"] is True
        sanctioned_names = [m["entity_name"] for m in result["matches"]]
        assert "Anwar Sheikh" in sanctioned_names

    async def test_result_has_lists_scanned(self):
        """Result includes list of scanned sanction databases."""
        result = await _mock_check_sanctions("Any Entity")
        assert "lists_scanned" in result
        assert len(result["lists_scanned"]) > 0


class TestCheckSanctionsEntryPoint:
    """Test the main check_sanctions function routing."""

    @patch.dict(os.environ, {"OPENSANCTIONS_API_KEY": ""}, clear=False)
    async def test_falls_back_to_mock_without_api_key(self):
        """Without API key, falls back to mock checker."""
        result = await check_sanctions("Clean Corp")
        assert result["source"] == "Nexus Sanction Scanner (Mock)"
        assert result["is_sanctioned"] is False

    @patch.dict(os.environ, {}, clear=False)
    async def test_falls_back_when_key_missing(self):
        """When env var is completely missing, uses mock."""
        # Remove the key if it exists
        os.environ.pop("OPENSANCTIONS_API_KEY", None)
        result = await check_sanctions("Clean Corp")
        assert result["source"] == "Nexus Sanction Scanner (Mock)"

    @patch.dict(os.environ, {"OPENSANCTIONS_API_KEY": ""}, clear=False)
    async def test_sanctioned_entity_via_main_function(self):
        """Main function still flags sanctioned entities via mock."""
        result = await check_sanctions("QuickMed Devices International")
        assert result["is_sanctioned"] is True
