# ============================================================================
# Tests — GSTN Mock API Tool
# ============================================================================

import pytest
from backend.tools.gstn_tool import lookup_gstn, lookup_gstn_by_name


class TestLookupGSTN:
    """Test GST number-based lookups."""

    async def test_lookup_active_gst(self):
        """Active GST record returns filing status."""
        result = await lookup_gstn("27AABCM1234F1Z5")
        assert result["api_status"] == "success"
        assert result["source"] == "GSTN"
        resp = result["response"]
        assert resp["filing_status"] == "Active"
        assert resp["business_name"] == "MedEquip Solutions Pvt Ltd"
        assert resp["state_name"] == "Maharashtra"

    async def test_lookup_inactive_gst(self):
        """Inactive GST record returns inactive filing status."""
        result = await lookup_gstn("24AABCP9012H1Z1")
        assert result["api_status"] == "success"
        resp = result["response"]
        assert "Inactive" in resp["filing_status"]
        assert resp["business_name"] == "PharmaChem Gujarat Pvt Ltd"

    async def test_lookup_unknown_gst(self):
        """Unknown GST number returns not_found."""
        result = await lookup_gstn("99ZZZZZ9999Z9Z9")
        assert result["api_status"] == "not_found"
        assert result["response"]["filing_status"] == "Not Found"

    async def test_lookup_returns_all_fields(self):
        """Active record has all expected fields."""
        result = await lookup_gstn("29AABCS5678G1Z3")
        resp = result["response"]
        expected_fields = [
            "gst_number", "business_name", "trade_name",
            "registration_date", "state_code", "filing_status",
            "last_filed_date", "return_type",
        ]
        for field in expected_fields:
            assert field in resp, f"Missing field: {field}"


class TestLookupGSTNByName:
    """Test name-based GST lookups."""

    async def test_lookup_by_name_match(self):
        """Name search finds correct GST record."""
        result = await lookup_gstn_by_name("MedEquip")
        assert result["api_status"] == "success"
        assert result["response"]["gst_number"] == "27AABCM1234F1Z5"

    async def test_lookup_by_name_no_match(self):
        """Unknown business name returns not_found."""
        result = await lookup_gstn_by_name("Nonexistent Business")
        assert result["api_status"] == "not_found"
