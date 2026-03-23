# ============================================================================
# Nexus — GSTN Mock API Tool
# Serves: Verifier Agent
# Simulates India's Goods & Services Tax Network (GSTN) API.
# Returns realistic GST registration and filing data.
# ============================================================================

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Mock GST Records ──────────────────────────────────────────────────────

_MOCK_GST: dict[str, dict[str, Any]] = {
    "27AABCM1234F1Z5": {
        "gst_number": "27AABCM1234F1Z5",
        "business_name": "MedEquip Solutions Pvt Ltd",
        "trade_name": "MedEquip Solutions",
        "registration_date": "2020-04-01",
        "state_code": "27",
        "state_name": "Maharashtra",
        "constitution": "Private Limited Company",
        "taxpayer_type": "Regular",
        "filing_status": "Active",
        "last_filed_date": "2026-01-15",
        "last_filed_period": "December 2025",
        "return_type": "GSTR-3B",
        "business_address": "Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093",
    },
    "29AABCS5678G1Z3": {
        "gst_number": "29AABCS5678G1Z3",
        "business_name": "SurgiCare India Pvt Ltd",
        "trade_name": "SurgiCare India",
        "registration_date": "2018-08-01",
        "state_code": "29",
        "state_name": "Karnataka",
        "constitution": "Private Limited Company",
        "taxpayer_type": "Regular",
        "filing_status": "Active",
        "last_filed_date": "2026-02-10",
        "last_filed_period": "January 2026",
        "return_type": "GSTR-3B",
        "business_address": "No. 156, Peenya Industrial Estate, Bangalore 560058",
    },
    "24AABCP9012H1Z1": {
        "gst_number": "24AABCP9012H1Z1",
        "business_name": "PharmaChem Gujarat Pvt Ltd",
        "trade_name": "PharmaChem",
        "registration_date": "2017-07-01",
        "state_code": "24",
        "state_name": "Gujarat",
        "constitution": "Private Limited Company",
        "taxpayer_type": "Regular",
        "filing_status": "Inactive — Returns not filed for 6+ months",
        "last_filed_date": "2025-06-20",
        "last_filed_period": "May 2025",
        "return_type": "GSTR-3B",
        "business_address": "Survey No. 78, GIDC Ankleshwar, Gujarat 393002",
    },
}

_DEFAULT_GST: dict[str, Any] = {
    "gst_number": "",
    "business_name": "Unknown",
    "filing_status": "Not Found",
    "last_filed_date": "",
    "registration_date": "",
    "state_code": "",
    "state_name": "",
}


async def lookup_gstn(gst_number: str) -> dict[str, Any]:
    """
    Query the (simulated) GSTN API by GST Number.

    In production, this would hit the real GSTN Search API.
    Returns: gst_number, filing_status, last_filed_date, business_name, etc.
    """
    logger.info(f"GSTN lookup for: {gst_number}")

    result = _MOCK_GST.get(gst_number, {**_DEFAULT_GST, "gst_number": gst_number})

    return {
        "source": "GSTN",
        "query": {"gst_number": gst_number},
        "response": result,
        "api_status": "success" if gst_number in _MOCK_GST else "not_found",
    }


async def lookup_gstn_by_name(business_name: str) -> dict[str, Any]:
    """Search GSTN by business name (fuzzy match)."""
    logger.info(f"GSTN name search: {business_name}")

    for gstn, record in _MOCK_GST.items():
        if business_name.lower() in record["business_name"].lower():
            return {
                "source": "GSTN",
                "query": {"business_name": business_name},
                "response": record,
                "api_status": "success",
            }

    return {
        "source": "GSTN",
        "query": {"business_name": business_name},
        "response": {**_DEFAULT_GST, "business_name": business_name},
        "api_status": "not_found",
    }
