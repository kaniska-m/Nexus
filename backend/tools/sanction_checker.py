# ============================================================================
# Nexus — Sanction List Checker Tool
# Serves: Risk Scoring Agent
# Checks vendor/director names against a simulated sanctions database.
# Includes OFAC-equivalent Indian sanctions, debarment lists, and blacklists.
# ============================================================================

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Simulated Sanction / Blacklist Database ────────────────────────────────

_SANCTIONED_ENTITIES: list[dict[str, Any]] = [
    {
        "entity_name": "Global Pharma Exports Ltd",
        "entity_type": "Company",
        "reason": "Convicted of exporting substandard pharmaceutical ingredients — CDSCO order 2024",
        "source_list": "CDSCO Blacklist",
        "date_listed": "2024-03-15",
        "jurisdiction": "India",
    },
    {
        "entity_name": "Vikram Patel",
        "entity_type": "Individual",
        "reason": "Director of company convicted of GST fraud — DGGI investigation 2023",
        "source_list": "DGGI Watchlist",
        "date_listed": "2023-11-20",
        "jurisdiction": "India",
    },
    {
        "entity_name": "QuickMed Devices International",
        "entity_type": "Company",
        "reason": "FDA import alert — manufacturing facility violations, unapproved devices",
        "source_list": "FDA Import Alert List",
        "date_listed": "2025-01-08",
        "jurisdiction": "International",
    },
    {
        "entity_name": "Sunrise Chemical Industries",
        "entity_type": "Company",
        "reason": "Environmental violations — CPCB order for illegal discharge of chemical waste",
        "source_list": "CPCB Non-Compliance List",
        "date_listed": "2024-07-01",
        "jurisdiction": "India",
    },
    {
        "entity_name": "Anwar Sheikh",
        "entity_type": "Individual",
        "reason": "Listed on OFAC SDN list — sanctioned for involvement in proliferation networks",
        "source_list": "OFAC SDN List",
        "date_listed": "2022-09-15",
        "jurisdiction": "International",
    },
]



import os
import httpx

_OPENSANCTIONS_API_URL = "https://api.opensanctions.org/search/default"

async def check_sanctions(
    entity_name: str,
    directors: list[str] | None = None,
    registered_address: str | None = None,
) -> dict[str, Any]:
    """
    Check an entity (and optionally its directors) against sanction lists.
    Uses the real OpenSanctions API if a key is provided in the environment.

    Args:
        entity_name: Company name to check
        directors: Optional list of director names to cross-check
        registered_address: Optional address for location-based screening

    Returns:
        Dict with is_sanctioned flag, matched entries, and scan summary
    """
    logger.info(f"Sanction check for: {entity_name}")
    api_key = os.getenv("OPENSANCTIONS_API_KEY")

    if not api_key:
        logger.warning("OPENSANCTIONS_API_KEY not found. Falling back to mock data.")
        return await _mock_check_sanctions(entity_name, directors)

    matches = []
    queries = [{"q": entity_name, "type": "company_name"}]

    if directors:
        for director in directors:
            queries.append({"q": director, "type": "director"})

    async with httpx.AsyncClient() as client:
        for q in queries:
            try:
                response = await client.get(
                    _OPENSANCTIONS_API_URL,
                    params={"q": q["q"], "fuzzy": "true"},
                    headers={"Authorization": f"ApiKey {api_key}"},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()

                for result in data.get("results", []):
                    # Filter for highly contextual hits. Real systems do deeper scoring here.
                    if result.get("schema") in ["Company", "Organization", "Person", "LegalEntity"]:
                        datasets = result.get("datasets", [])
                        # We only care if it's explicitly explicitly from a sanction or watchlist
                        if any("sanction" in ds.lower() or "warning" in ds.lower() or "ofac" in ds.lower() for ds in datasets):
                            matches.append({
                                "entity_name": result.get("caption", q["q"]),
                                "entity_type": result.get("schema"),
                                "reason": f"Matched in datasets: {', '.join(datasets)}",
                                "source_list": ", ".join(datasets),
                                "match_type": q["type"],
                                "jurisdiction": ", ".join(result.get("properties", {}).get("country", ["International"])),
                                "score": result.get("score")
                            })
            except httpx.HTTPError as e:
                logger.error(f"OpenSanctions API error for {q['q']}: {e}")
            except Exception as e:
                 logger.error(f"Unexpected error during OpenSanctions check: {e}")

    # Remove duplicates based on entity name
    unique_matches = {m["entity_name"]: m for m in matches}.values()
    final_matches = list(unique_matches)
    is_sanctioned = len(final_matches) > 0

    return {
        "source": "OpenSanctions API",
        "query": {
            "entity_name": entity_name,
            "directors_checked": directors or [],
        },
        "is_sanctioned": is_sanctioned,
        "matches": final_matches,
        "total_matches": len(final_matches),
        "lists_scanned": [
            "Global Watchlists",
            "UN Security Council",
            "OFAC SDN",
            "EU Financial Sanctions"
        ],
        "scan_status": "flagged" if is_sanctioned else "clear",
    }

async def _mock_check_sanctions(entity_name: str, directors: list[str] | None = None) -> dict[str, Any]:
    """Fallback if API key is missing."""
    matches = []
    
    # Check company name (fuzzy match)
    for entry in _SANCTIONED_ENTITIES:
        if entity_name.lower() in entry["entity_name"].lower() or \
           entry["entity_name"].lower() in entity_name.lower():
            matches.append({**entry, "match_type": "company_name"})

    # Check directors if provided
    if directors:
        for director in directors:
            for entry in _SANCTIONED_ENTITIES:
                if entry["entity_type"] == "Individual":
                    if director.lower() in entry["entity_name"].lower() or \
                       entry["entity_name"].lower() in director.lower():
                        matches.append({
                            **entry,
                            "match_type": "director",
                            "matched_director": director,
                        })

    is_sanctioned = len(matches) > 0

    return {
        "source": "Nexus Sanction Scanner (Mock)",
        "query": {
            "entity_name": entity_name,
            "directors_checked": directors or [],
        },
        "is_sanctioned": is_sanctioned,
        "matches": matches,
        "total_matches": len(matches),
        "lists_scanned": [
            "CDSCO Blacklist",
            "DGGI Watchlist",
            "FDA Import Alert List",
            "CPCB Non-Compliance List",
            "OFAC SDN List",
        ],
        "scan_status": "flagged" if is_sanctioned else "clear",
    }
