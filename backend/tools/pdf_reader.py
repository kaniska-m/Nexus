# ============================================================================
# Nexus — PDF Reader Tool
# Serves: Verifier Agent, Collector Agent
# Reads PDFs using PyMuPDF (fitz) for text extraction.
# Extracts structured fields: cert numbers, expiry dates, company names.
# No paid Vision API — uses free open-source extraction only.
# ============================================================================

from __future__ import annotations

import logging
import os
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Attempt to import fitz (PyMuPDF)
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    logger.warning("PyMuPDF not installed — PDF reading disabled. Install with: pip install PyMuPDF")


# ── PDF Text Extraction ───────────────────────────────────────────────────

async def extract_text_from_pdf(file_path: str) -> dict[str, Any]:
    """
    Extract all text content from a PDF file using PyMuPDF.

    Args:
        file_path: Absolute path to the PDF file

    Returns:
        Dict with full_text, page_count, and extraction status
    """
    if not HAS_PYMUPDF:
        return {
            "status": "error",
            "error": "PyMuPDF not installed",
            "full_text": "",
        }

    if not os.path.exists(file_path):
        return {
            "status": "error",
            "error": f"File not found: {file_path}",
            "full_text": "",
        }

    try:
        doc = fitz.open(file_path)
        pages_text = []

        for page_num in range(doc.page_count):
            page = doc[page_num]
            text = page.get_text()
            pages_text.append(text)

        full_text = "\n--- PAGE BREAK ---\n".join(pages_text)
        doc.close()

        return {
            "status": "success",
            "full_text": full_text,
            "page_count": len(pages_text),
            "file_path": file_path,
            "file_name": os.path.basename(file_path),
        }

    except Exception as e:
        logger.error(f"PDF extraction failed for {file_path}: {e}")
        return {
            "status": "error",
            "error": str(e),
            "full_text": "",
        }


# ── Structured Field Extraction ───────────────────────────────────────────

async def extract_fields_from_pdf(file_path: str) -> dict[str, Any]:
    """
    Extract structured fields from a PDF document.
    Uses regex patterns to find common compliance document fields.

    Returns dict with extracted fields: cert_number, expiry_date,
    company_name, issue_date, issuing_authority, etc.
    """
    extraction = await extract_text_from_pdf(file_path)

    if extraction["status"] != "success":
        return extraction

    text = extraction["full_text"]
    fields: dict[str, Optional[str]] = {}

    # Certificate / Licence number patterns
    cert_patterns = [
        r"(?:Certificate|Licence|License|Registration)\s*(?:No|Number|#)[.:]\s*([A-Z0-9\-\/]+)",
        r"(?:CIN|GSTIN|GST No|PAN)[.:]\s*([A-Z0-9]+)",
        r"(?:MD|DL|ISO)\-\d{4}\-[A-Z]{2}\-\d{4,6}",
    ]
    for pattern in cert_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields["cert_number"] = match.group(1) if match.lastindex else match.group(0)
            break

    # Date patterns (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
    date_patterns = [
        (r"(?:Valid\s*(?:Until|Till|Upto|Up to)|Expiry\s*Date|Expires?\s*on)[.:]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})", "expiry_date"),
        (r"(?:Date\s*of\s*Issue|Issued?\s*(?:Date|On))[.:]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})", "issue_date"),
        (r"(?:Valid\s*(?:Until|Till|Upto|Up to)|Expiry)[.:]\s*(\d{4}\-\d{2}\-\d{2})", "expiry_date"),
    ]
    for pattern, field_name in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields[field_name] = match.group(1)

    # Company name (usually near the top or after "Issued to")
    name_patterns = [
        r"(?:Issued\s*to|Granted\s*to|Company\s*Name|Name\s*of\s*(?:Company|Firm|Manufacturer))[.:]\s*(.+?)(?:\n|$)",
        r"(?:M/s\.?|Messrs\.?)\s+(.+?)(?:\n|$)",
    ]
    for pattern in name_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields["company_name"] = match.group(1).strip()
            break

    # Issuing authority
    auth_patterns = [
        r"(?:Issued\s*by|Issuing\s*Authority|Certifying\s*Body)[.:]\s*(.+?)(?:\n|$)",
    ]
    for pattern in auth_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields["issuing_authority"] = match.group(1).strip()
            break

    return {
        "status": "success",
        "file_name": extraction["file_name"],
        "page_count": extraction["page_count"],
        "extracted_fields": fields,
        "full_text_preview": text[:500],  # First 500 chars for context
    }
