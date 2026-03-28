# ============================================================================
# Tests — PDF Reader Tool
# ============================================================================

import os
import pytest
from unittest.mock import patch, MagicMock

from backend.tools.pdf_reader import extract_text_from_pdf, extract_fields_from_pdf


class TestExtractTextFromPDF:
    """Test raw text extraction from PDF files."""

    async def test_missing_file_returns_error(self):
        """Non-existent file returns error status."""
        result = await extract_text_from_pdf("/nonexistent/path/doc.pdf")
        assert result["status"] == "error"
        error_msg = result["error"].lower()
        assert "not found" in error_msg or "not installed" in error_msg

    async def test_returns_correct_keys(self):
        """Error response has expected keys."""
        result = await extract_text_from_pdf("/fake/path.pdf")
        assert "status" in result
        assert "full_text" in result


class TestExtractFieldsFromPDF:
    """Test structured field extraction (cert numbers, dates, etc.)."""

    async def test_fields_from_missing_file(self):
        """Missing file passes through error from text extraction."""
        result = await extract_fields_from_pdf("/nonexistent/path.pdf")
        assert result["status"] == "error"

    async def test_cert_number_regex_cin(self):
        """CIN pattern is recognized."""
        mock_text = "CIN: U33112MH2020PTC345678\nSome other text"
        with patch("backend.tools.pdf_reader.extract_text_from_pdf") as mock_extract:
            mock_extract.return_value = {
                "status": "success",
                "full_text": mock_text,
                "page_count": 1,
                "file_name": "test.pdf",
            }
            result = await extract_fields_from_pdf("test.pdf")
            assert result["status"] == "success"
            fields = result["extracted_fields"]
            assert "cert_number" in fields
            assert "U33112MH2020PTC345678" in fields["cert_number"]

    async def test_expiry_date_regex(self):
        """Expiry date pattern is recognized."""
        mock_text = "Valid Until: 31/12/2026\nIssued by CDSCO"
        with patch("backend.tools.pdf_reader.extract_text_from_pdf") as mock_extract:
            mock_extract.return_value = {
                "status": "success",
                "full_text": mock_text,
                "page_count": 1,
                "file_name": "test.pdf",
            }
            result = await extract_fields_from_pdf("test.pdf")
            assert result["status"] == "success"
            fields = result["extracted_fields"]
            assert "expiry_date" in fields
            assert "31/12/2026" in fields["expiry_date"]

    async def test_company_name_regex(self):
        """Company name pattern 'Issued to: X' is recognized."""
        mock_text = "Certificate\nIssued to: MedEquip Solutions Pvt Ltd\nCertificate No: 12345"
        with patch("backend.tools.pdf_reader.extract_text_from_pdf") as mock_extract:
            mock_extract.return_value = {
                "status": "success",
                "full_text": mock_text,
                "page_count": 1,
                "file_name": "test.pdf",
            }
            result = await extract_fields_from_pdf("test.pdf")
            assert result["status"] == "success"
            fields = result["extracted_fields"]
            assert "company_name" in fields
            assert "MedEquip" in fields["company_name"]

    async def test_full_text_preview_truncated(self):
        """Full text preview is truncated to 500 chars."""
        mock_text = "A" * 1000
        with patch("backend.tools.pdf_reader.extract_text_from_pdf") as mock_extract:
            mock_extract.return_value = {
                "status": "success",
                "full_text": mock_text,
                "page_count": 1,
                "file_name": "test.pdf",
            }
            result = await extract_fields_from_pdf("test.pdf")
            assert len(result["full_text_preview"]) == 500
