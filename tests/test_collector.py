# ============================================================================
# Tests — Collector Agent
# ============================================================================

import pytest
from unittest.mock import AsyncMock, patch

from backend.agents.collector import run_collector, generate_smart_form


class TestRunCollector:
    """Test the collector LangGraph node function."""

    async def test_all_docs_submitted(self):
        """When all docs are submitted, nothing remains pending."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "TestCorp",
            "checklist": [
                {"document_name": "Doc A", "required": True, "status": "pending", "retry_count": 0, "max_retries": 2},
                {"document_name": "Doc B", "required": True, "status": "pending", "retry_count": 0, "max_retries": 2},
            ],
            "documents_submitted": {"Doc A": "path/a.pdf", "Doc B": "path/b.pdf"},
            "documents_pending": ["Doc A", "Doc B"],
            "audit_log": [],
        }
        with patch("backend.agents.collector.call_llm", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = "Reminder sent"
            result = await run_collector(state)

        # Both docs status should be updated to submitted
        for item in result["checklist"]:
            assert item["status"] == "submitted"
        assert result["current_step"] == 3

    async def test_partial_submission_tracks_pending(self):
        """Partial docs → correct pending list and retry increment."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "TestCorp",
            "checklist": [
                {"document_name": "Doc A", "required": True, "status": "pending", "retry_count": 0, "max_retries": 2},
                {"document_name": "Doc B", "required": True, "status": "pending", "retry_count": 0, "max_retries": 2},
            ],
            "documents_submitted": {"Doc A": "path/a.pdf"},
            "documents_pending": ["Doc A", "Doc B"],
            "audit_log": [],
        }
        with patch("backend.agents.collector.call_llm", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = "Please submit Doc B"
            result = await run_collector(state)

        assert "Doc B" in result["documents_pending"]
        # Doc B retry_count should have been incremented
        doc_b = [c for c in result["checklist"] if c["document_name"] == "Doc B"][0]
        assert doc_b["retry_count"] == 1

    async def test_max_retries_escalates(self):
        """Exceeding max retries triggers REROUTE escalation."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "TestCorp",
            "checklist": [
                {"document_name": "Doc A", "required": True, "status": "pending", "retry_count": 2, "max_retries": 2},
            ],
            "documents_submitted": {},
            "documents_pending": ["Doc A"],
            "audit_log": [],
        }
        with patch("backend.agents.collector.call_llm", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = "Final reminder"
            result = await run_collector(state)

        # Document should be RE_REQUESTED
        doc_a = result["checklist"][0]
        assert doc_a["status"] == "re_requested"

    async def test_optional_docs_not_tracked(self):
        """Optional documents are not tracked as pending."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "TestCorp",
            "checklist": [
                {"document_name": "Required Doc", "required": True, "status": "pending", "retry_count": 0, "max_retries": 2},
                {"document_name": "Optional Doc", "required": False, "status": "pending", "retry_count": 0, "max_retries": 2},
            ],
            "documents_submitted": {"Required Doc": "path/r.pdf"},
            "documents_pending": ["Required Doc"],
            "audit_log": [],
        }
        with patch("backend.agents.collector.call_llm", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = ""
            result = await run_collector(state)

        # Optional doc should not appear in pending
        assert "Optional Doc" not in result["documents_pending"]

    async def test_audit_log_appended(self):
        """Collector appends an audit log entry."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "TestCorp",
            "checklist": [],
            "documents_submitted": {},
            "documents_pending": [],
            "audit_log": [],
        }
        with patch("backend.agents.collector.call_llm", new_callable=AsyncMock):
            result = await run_collector(state)

        assert len(result["audit_log"]) >= 1
        assert result["audit_log"][-1]["agent"] == "Collector"


class TestGenerateSmartForm:
    """Test smart form generation from checklist."""

    async def test_form_fields_match_checklist(self):
        checklist = [
            {"id": "1", "document_name": "Doc A", "description": "Desc A", "category": "Legal", "required": True, "status": "pending"},
            {"id": "2", "document_name": "Doc B", "description": "Desc B", "category": "Financial", "required": False, "status": "pending"},
        ]
        form = await generate_smart_form(checklist)
        assert form["form_title"] == "Vendor Compliance Documents"
        assert len(form["fields"]) == 2
        assert form["total_required"] == 1
        assert form["total_optional"] == 1

    async def test_form_field_type_is_file_upload(self):
        checklist = [
            {"id": "1", "document_name": "Doc", "description": "", "category": "Legal", "required": True, "status": "pending"},
        ]
        form = await generate_smart_form(checklist)
        assert form["fields"][0]["field_type"] == "file_upload"
        assert ".pdf" in form["fields"][0]["accepted_formats"]
