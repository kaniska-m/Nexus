# ============================================================================
# Nexus — CDSCO Mock API Tool
# Serves: Verifier Agent
# Simulates India's Central Drugs Standard Control Organisation (CDSCO)
# medical device and drug licence database.
# Returns realistic licence data for MedTech/Pharma verification.
# ============================================================================

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Mock CDSCO Licence Records ────────────────────────────────────────────

_MOCK_LICENCES: dict[str, dict[str, Any]] = {
    "MD-2021-MH-004567": {
        "licence_number": "MD-2021-MH-004567",
        "licence_type": "Medical Device",
        "device_class": "Class B",
        "product_category": "Surgical Gloves — Sterile, Powder Free",
        "manufacturer_name": "MedEquip Solutions Pvt Ltd",
        "manufacturer_address": "Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093",
        "valid_from": "2021-06-01",
        "valid_until": "2026-05-31",
        "issuing_authority": "CDSCO Mumbai Zone",
        "status": "Valid",
        "risk_classification": "Moderate Risk",
    },
    "MD-2019-KA-001234": {
        "licence_number": "MD-2019-KA-001234",
        "licence_type": "Medical Device",
        "device_class": "Class C",
        "product_category": "Surgical Sutures — Absorbable",
        "manufacturer_name": "SurgiCare India Pvt Ltd",
        "manufacturer_address": "No. 156, Peenya Industrial Estate, Bangalore 560058",
        "valid_from": "2019-09-15",
        "valid_until": "2024-09-14",  # EXPIRED — test scenario
        "issuing_authority": "CDSCO Bangalore Zone",
        "status": "Expired",
        "risk_classification": "High Risk",
    },
    "DL-2022-GJ-009876": {
        "licence_number": "DL-2022-GJ-009876",
        "licence_type": "Drug Manufacturing",
        "device_class": "N/A",
        "product_category": "Bulk Drugs — Paracetamol API",
        "manufacturer_name": "PharmaChem Gujarat Pvt Ltd",
        "manufacturer_address": "Survey No. 78, GIDC Ankleshwar, Gujarat 393002",
        "valid_from": "2022-01-01",
        "valid_until": "2027-12-31",
        "issuing_authority": "CDSCO Ahmedabad Zone",
        "status": "Valid",
        "risk_classification": "High Risk",
    },
}

_DEFAULT_LICENCE: dict[str, Any] = {
    "licence_number": "",
    "licence_type": "Unknown",
    "product_category": "Unknown",
    "manufacturer_name": "Unknown",
    "valid_until": "",
    "status": "Not Found",
}


async def lookup_cdsco(licence_number: str) -> dict[str, Any]:
    """
    Query the (simulated) CDSCO database by licence number.

    In production, this would hit the real CDSCO online portal API.
    Returns: licence_number, licence_type, valid_until, product_category, etc.
    """
    logger.info(f"CDSCO lookup for licence: {licence_number}")

    result = _MOCK_LICENCES.get(
        licence_number,
        {**_DEFAULT_LICENCE, "licence_number": licence_number},
    )

    return {
        "source": "CDSCO",
        "query": {"licence_number": licence_number},
        "response": result,
        "api_status": "success" if licence_number in _MOCK_LICENCES else "not_found",
    }


async def lookup_cdsco_by_manufacturer(manufacturer_name: str) -> dict[str, Any]:
    """Search CDSCO by manufacturer name (fuzzy match)."""
    logger.info(f"CDSCO manufacturer search: {manufacturer_name}")

    results = []
    for lic_num, record in _MOCK_LICENCES.items():
        if manufacturer_name.lower() in record["manufacturer_name"].lower():
            results.append(record)

    return {
        "source": "CDSCO",
        "query": {"manufacturer_name": manufacturer_name},
        "response": results if results else [_DEFAULT_LICENCE],
        "api_status": "success" if results else "not_found",
        "total_results": len(results),
    }
