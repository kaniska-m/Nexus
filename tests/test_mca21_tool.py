# ============================================================================
# Tests — MCA21 Mock API Tool
# ============================================================================

import pytest
from backend.tools.mca21_tool import lookup_mca21, lookup_mca21_by_name


class TestLookupMCA21ByCIN:
    """Test CIN-based lookups against the mock MCA21 database."""

    async def test_lookup_known_cin_active(self):
        """Known active company returns correct data."""
        result = await lookup_mca21("U33112MH2020PTC345678")
        assert result["api_status"] == "success"
        assert result["source"] == "MCA21"
        resp = result["response"]
        assert resp["company_name"] == "MedEquip Solutions Pvt Ltd"
        assert resp["registration_status"] == "Active"
        assert resp["roc"] == "ROC-Mumbai"
        assert len(resp["directors"]) == 2

    async def test_lookup_known_cin_struck_off(self):
        """Struck-off company returns Strike Off status — a fraud signal."""
        result = await lookup_mca21("U24110GJ2015PTC087654")
        assert result["api_status"] == "success"
        resp = result["response"]
        assert resp["registration_status"] == "Strike Off"
        assert resp["company_name"] == "PharmaChem Gujarat Pvt Ltd"

    async def test_lookup_unknown_cin(self):
        """Unknown CIN returns not_found status."""
        result = await lookup_mca21("U99999XX9999PTC000000")
        assert result["api_status"] == "not_found"
        assert result["response"]["registration_status"] == "Not Found"

    async def test_lookup_all_known_cins(self):
        """All 3 mock companies are accessible."""
        cins = [
            "U33112MH2020PTC345678",
            "U85110KA2018PTC112233",
            "U24110GJ2015PTC087654",
        ]
        for cin in cins:
            result = await lookup_mca21(cin)
            assert result["api_status"] == "success"
            assert result["response"]["cin"] == cin


class TestLookupMCA21ByName:
    """Test fuzzy name-based lookups."""

    async def test_lookup_by_name_exact(self):
        """Exact name match returns correct company."""
        result = await lookup_mca21_by_name("MedEquip Solutions Pvt Ltd")
        assert result["api_status"] == "success"
        assert result["response"]["cin"] == "U33112MH2020PTC345678"

    async def test_lookup_by_name_partial(self):
        """Partial name match works (fuzzy)."""
        result = await lookup_mca21_by_name("MedEquip")
        assert result["api_status"] == "success"
        assert "MedEquip" in result["response"]["company_name"]

    async def test_lookup_by_name_case_insensitive(self):
        """Name search is case-insensitive."""
        result = await lookup_mca21_by_name("surgicare")
        assert result["api_status"] == "success"
        assert result["response"]["company_name"] == "SurgiCare India Pvt Ltd"

    async def test_lookup_by_name_no_match(self):
        """Unknown name returns not_found."""
        result = await lookup_mca21_by_name("Totally Nonexistent Corp")
        assert result["api_status"] == "not_found"
        assert result["response"]["registration_status"] == "Not Found"
