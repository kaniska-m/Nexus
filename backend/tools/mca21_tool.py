# ============================================================================
# Nexus — MCA21 Mock API Tool
# Serves: Verifier Agent
# Simulates India's Ministry of Corporate Affairs (MCA21) company registry.
# Returns realistic Indian regulatory data for company verification.
# ============================================================================

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# ── Mock Database of Indian Companies ──────────────────────────────────────

_MOCK_COMPANIES: dict[str, dict[str, Any]] = {
    "U33112MH2020PTC345678": {
        "cin": "U33112MH2020PTC345678",
        "company_name": "MedEquip Solutions Pvt Ltd",
        "registration_status": "Active",
        "incorporation_date": "2020-03-15",
        "registered_address": "Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093",
        "directors": [
            {"name": "Rajesh Kumar Sharma", "din": "08765432", "designation": "Managing Director"},
            {"name": "Priya Mehta", "din": "09876543", "designation": "Director"},
        ],
        "authorized_capital": "50,00,000",
        "paid_up_capital": "25,00,000",
        "company_category": "Company limited by Shares",
        "company_class": "Private",
        "roc": "ROC-Mumbai",
    },
    "U85110KA2018PTC112233": {
        "cin": "U85110KA2018PTC112233",
        "company_name": "SurgiCare India Pvt Ltd",
        "registration_status": "Active",
        "incorporation_date": "2018-07-22",
        "registered_address": "No. 156, Peenya Industrial Estate, Bangalore 560058",
        "directors": [
            {"name": "Arun Venkatesh", "din": "07654321", "designation": "Director"},
            {"name": "Deepa Nair", "din": "08543210", "designation": "Director"},
        ],
        "authorized_capital": "1,00,00,000",
        "paid_up_capital": "75,00,000",
        "company_category": "Company limited by Shares",
        "company_class": "Private",
        "roc": "ROC-Bangalore",
    },
    "U24110GJ2015PTC087654": {
        "cin": "U24110GJ2015PTC087654",
        "company_name": "PharmaChem Gujarat Pvt Ltd",
        "registration_status": "Strike Off",  # This is a red flag scenario
        "incorporation_date": "2015-01-10",
        "registered_address": "Survey No. 78, GIDC Ankleshwar, Gujarat 393002",
        "directors": [
            {"name": "Vikram Patel", "din": "06543210", "designation": "Director"},
        ],
        "authorized_capital": "10,00,000",
        "paid_up_capital": "10,00,000",
        "company_category": "Company limited by Shares",
        "company_class": "Private",
        "roc": "ROC-Ahmedabad",
    },
}

# Default response for any CIN not in the mock database
_DEFAULT_COMPANY: dict[str, Any] = {
    "cin": "",
    "company_name": "Unknown Company",
    "registration_status": "Not Found",
    "incorporation_date": "",
    "registered_address": "",
    "directors": [],
    "authorized_capital": "0",
    "paid_up_capital": "0",
    "company_category": "",
    "company_class": "",
    "roc": "",
}


async def lookup_mca21(cin: str) -> dict[str, Any]:
    """
    Query the (simulated) MCA21 registry by Company Identification Number (CIN).

    In production, this would hit the real MCA21 V3 API.
    Returns: company_name, registration_status, directors, incorporation_date, etc.
    """
    logger.info(f"MCA21 lookup for CIN: {cin}")

    result = _MOCK_COMPANIES.get(cin, {**_DEFAULT_COMPANY, "cin": cin})

    return {
        "source": "MCA21",
        "query": {"cin": cin},
        "response": result,
        "api_status": "success" if cin in _MOCK_COMPANIES else "not_found",
    }


async def lookup_mca21_by_name(company_name: str) -> dict[str, Any]:
    """
    Search MCA21 by company name (fuzzy match on mock data).
    """
    logger.info(f"MCA21 name search: {company_name}")

    for cin, company in _MOCK_COMPANIES.items():
        if company_name.lower() in company["company_name"].lower():
            return {
                "source": "MCA21",
                "query": {"company_name": company_name},
                "response": company,
                "api_status": "success",
            }

    return {
        "source": "MCA21",
        "query": {"company_name": company_name},
        "response": {**_DEFAULT_COMPANY, "company_name": company_name},
        "api_status": "not_found",
    }
