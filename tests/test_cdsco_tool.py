# ============================================================================
# Tests — CDSCO Mock API Tool
# ============================================================================

import pytest
from backend.tools.cdsco_tool import lookup_cdsco, lookup_cdsco_by_manufacturer


class TestLookupCDSCO:
    """Test licence number-based lookups."""

    async def test_lookup_valid_licence(self):
        """Valid CDSCO licence returns manufacturer data."""
        result = await lookup_cdsco("MD-2021-MH-004567")
        assert result["api_status"] == "success"
        assert result["source"] == "CDSCO"
        resp = result["response"]
        assert resp["status"] == "Valid"
        assert resp["manufacturer_name"] == "MedEquip Solutions Pvt Ltd"
        assert resp["device_class"] == "Class B"

    async def test_lookup_expired_licence(self):
        """Expired CDSCO licence returns Expired status."""
        result = await lookup_cdsco("MD-2019-KA-001234")
        assert result["api_status"] == "success"
        resp = result["response"]
        assert resp["status"] == "Expired"
        assert resp["valid_until"] == "2024-09-14"

    async def test_lookup_drug_manufacturing_licence(self):
        """Drug manufacturing licence returns correct data."""
        result = await lookup_cdsco("DL-2022-GJ-009876")
        assert result["api_status"] == "success"
        resp = result["response"]
        assert resp["licence_type"] == "Drug Manufacturing"
        assert resp["status"] == "Valid"

    async def test_lookup_unknown_licence(self):
        """Unknown licence returns Not Found."""
        result = await lookup_cdsco("XX-0000-XX-000000")
        assert result["api_status"] == "not_found"
        assert result["response"]["status"] == "Not Found"


class TestLookupCDSCOByManufacturer:
    """Test manufacturer name-based lookups."""

    async def test_lookup_by_manufacturer_match(self):
        """Name search finds matching licences."""
        result = await lookup_cdsco_by_manufacturer("MedEquip")
        assert result["api_status"] == "success"
        assert result["total_results"] >= 1
        assert any(
            "MedEquip" in r["manufacturer_name"]
            for r in result["response"]
        )

    async def test_lookup_by_manufacturer_no_match(self):
        """Unknown manufacturer returns not_found."""
        result = await lookup_cdsco_by_manufacturer("Nonexistent Mfg")
        assert result["api_status"] == "not_found"
        assert result["total_results"] == 0
