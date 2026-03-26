# ============================================================================
# Tests — Orchestrator Agent (The Brain)
# ============================================================================

import pytest
from unittest.mock import AsyncMock, patch

from backend.agents.orchestrator import (
    run_orchestrator,
    check_stall,
    _get_fallback_checklist,
)


class TestRunOrchestrator:
    """Test the main orchestrator LangGraph node function."""

    async def test_happy_path_generates_checklist(self, sample_orchestrator_input, mock_call_llm_json):
        """Orchestrator generates a checklist and initializes state."""
        result = await run_orchestrator(sample_orchestrator_input)

        assert result["workflow_status"] == "active"
        assert result["current_step"] == 2
        assert len(result["checklist"]) > 0
        assert len(result["documents_pending"]) > 0
        assert len(result["audit_log"]) >= 1
        assert result["audit_log"][-1]["agent"] == "Orchestrator"

    async def test_checklist_items_have_required_fields(self, sample_orchestrator_input, mock_call_llm_json):
        """Each checklist item has category, document_name, required, status."""
        result = await run_orchestrator(sample_orchestrator_input)

        for item in result["checklist"]:
            assert "category" in item
            assert "document_name" in item
            assert "required" in item
            assert "status" in item

    async def test_documents_pending_matches_required(self, sample_orchestrator_input, mock_call_llm_json):
        """documents_pending only includes required checklist items."""
        result = await run_orchestrator(sample_orchestrator_input)

        required_names = [
            item["document_name"]
            for item in result["checklist"]
            if item.get("required", True)
        ]
        assert set(result["documents_pending"]) == set(required_names)

    async def test_llm_failure_uses_fallback(self, sample_orchestrator_input):
        """When LLM fails, fallback checklist is used instead."""
        with patch("backend.agents.orchestrator.call_llm_json", new_callable=AsyncMock) as mock:
            mock.side_effect = Exception("LLM is down")
            result = await run_orchestrator(sample_orchestrator_input)

            # Should still have a checklist (fallback)
            assert len(result["checklist"]) > 0
            assert result["workflow_status"] == "active"

    async def test_audit_log_appended(self, sample_orchestrator_input, mock_call_llm_json):
        """Audit log entry is appended with correct agent name."""
        result = await run_orchestrator(sample_orchestrator_input)

        audit = result["audit_log"]
        assert len(audit) >= 1
        orchestrator_entries = [e for e in audit if e["agent"] == "Orchestrator"]
        assert len(orchestrator_entries) >= 1


class TestFallbackChecklist:
    """Test the hardcoded fallback checklists."""

    def test_base_items(self):
        """All industries get basic Legal + Financial items."""
        items = _get_fallback_checklist("Unknown")
        categories = [item.category for item in items]
        assert "Legal" in categories
        assert "Financial" in categories
        assert len(items) >= 6  # 6 base items

    def test_medtech_adds_cdsco(self):
        """MedTech adds CDSCO and ISO 13485 items."""
        items = _get_fallback_checklist("MedTech")
        doc_names = [item.document_name for item in items]
        assert "CDSCO Manufacturing Licence" in doc_names
        assert "ISO 13485 Certificate" in doc_names
        assert len(items) >= 9  # 6 base + 3 medtech

    def test_pharma_adds_cdsco(self):
        """Pharma also gets CDSCO items."""
        items = _get_fallback_checklist("Pharma")
        doc_names = [item.document_name for item in items]
        assert "CDSCO Manufacturing Licence" in doc_names

    def test_it_adds_iso27001(self):
        """IT industry adds ISO 27001."""
        items = _get_fallback_checklist("IT")
        doc_names = [item.document_name for item in items]
        assert "ISO 27001 Certificate" in doc_names

    def test_all_items_are_checklist_items(self):
        """All fallback items are proper ChecklistItem instances."""
        from backend.models.vendor import ChecklistItem
        items = _get_fallback_checklist("MedTech")
        for item in items:
            assert isinstance(item, ChecklistItem)


class TestCheckStall:
    """Test stall detection logic."""

    async def test_no_stall_recent_activity(self):
        """Recent activity (< 24h) → no stall."""
        from datetime import datetime
        state = {
            "vendor_id": "v1",
            "workflow_status": "active",
            "audit_log": [
                {"timestamp": datetime.utcnow().isoformat(), "agent": "Test", "action": "x"}
            ],
            "escalation_level": 0,
        }
        result = await check_stall(state)
        assert result["workflow_status"] == "active"

    async def test_completed_workflow_no_stall(self):
        """Completed workflows are not checked for stalls."""
        state = {
            "vendor_id": "v1",
            "workflow_status": "complete",
            "audit_log": [],
        }
        result = await check_stall(state)
        assert result["workflow_status"] == "complete"

    async def test_halted_workflow_no_stall(self):
        """Halted workflows are not checked for stalls."""
        state = {
            "vendor_id": "v1",
            "workflow_status": "halted",
            "audit_log": [],
        }
        result = await check_stall(state)
        assert result["workflow_status"] == "halted"

    async def test_stall_detected_after_24h(self):
        """Activity older than 24h → stall detected."""
        from datetime import datetime, timedelta
        old_time = (datetime.utcnow() - timedelta(hours=25)).isoformat()
        state = {
            "vendor_id": "v1",
            "workflow_status": "active",
            "audit_log": [
                {"timestamp": old_time, "agent": "Test", "action": "x"}
            ],
            "escalation_level": 0,
        }
        result = await check_stall(state)
        assert result["workflow_status"] == "stalled"
        assert result["escalation_level"] == 1
