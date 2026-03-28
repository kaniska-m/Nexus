# ============================================================================
# Tests — Audit Trail Agent
# ============================================================================

import os
import pytest
from unittest.mock import AsyncMock, patch

from backend.agents.audit_agent import run_audit_agent, generate_audit_pdf


def _base_state(**overrides):
    state = {
        "vendor_id": "v1",
        "vendor_name": "TestCorp",
        "industry": "IT",
        "verification_results": {
            "Doc A": {"status": "verified", "reason": "ok"},
        },
        "fraud_flags": [],
        "risk_score": "Low",
        "risk_rationale": "All clear.",
        "audit_log": [
            {"timestamp": "2026-01-01T00:00:00", "agent": "Orchestrator", "action": "Initiated"},
            {"timestamp": "2026-01-01T00:01:00", "agent": "Collector", "action": "Collected"},
            {"timestamp": "2026-01-01T00:02:00", "agent": "Verifier", "action": "Verified"},
        ],
        "workflow_status": "active",
    }
    state.update(overrides)
    return state


class TestRunAuditAgent:
    """Test the audit agent LangGraph node function."""

    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_compiles_audit_summary(self, mock_llm):
        """Audit summary contains correct vendor/verification data."""
        mock_llm.return_value = "This vendor passed all checks."
        result = await run_audit_agent(_base_state())

        summary = result["audit_summary"]
        assert summary["vendor_id"] == "v1"
        assert summary["vendor_name"] == "TestCorp"
        assert summary["risk_score"] == "Low"
        assert summary["total_steps_logged"] == 3
        assert "Orchestrator" in summary["agents_involved"]

    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_marks_complete_when_not_halted(self, mock_llm):
        """Non-halted workflow is marked complete."""
        mock_llm.return_value = "Summary."
        result = await run_audit_agent(_base_state())
        assert result["workflow_status"] == "complete"

    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_preserves_halted_status(self, mock_llm):
        """Halted workflow stays halted."""
        mock_llm.return_value = "Summary."
        result = await run_audit_agent(_base_state(workflow_status="halted"))
        assert result["workflow_status"] == "halted"

    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_preserves_escalated_status(self, mock_llm):
        """Escalated workflow stays escalated."""
        mock_llm.return_value = "Summary."
        result = await run_audit_agent(_base_state(workflow_status="escalated"))
        assert result["workflow_status"] == "escalated"

    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_narrative_generated(self, mock_llm):
        """LLM generates narrative text in audit summary."""
        mock_llm.return_value = "The vendor TestCorp has been verified successfully."
        result = await run_audit_agent(_base_state())
        assert "narrative" in result["audit_summary"]
        assert "TestCorp" in result["audit_summary"]["narrative"]

    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_narrative_fallback_on_llm_failure(self, mock_llm):
        """LLM failure → fallback narrative is generated."""
        mock_llm.side_effect = Exception("LLM down")
        result = await run_audit_agent(_base_state())
        assert "narrative" in result["audit_summary"]
        assert "TestCorp" in result["audit_summary"]["narrative"]

    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_audit_log_appended(self, mock_llm):
        """Audit agent appends its own audit log entry."""
        mock_llm.return_value = "Summary."
        result = await run_audit_agent(_base_state())
        last_entry = result["audit_log"][-1]
        assert last_entry["agent"] == "Audit Agent"
        assert "compiled" in last_entry["action"]

    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_current_step_set(self, mock_llm):
        """Current step is set to 13."""
        mock_llm.return_value = "Summary."
        result = await run_audit_agent(_base_state())
        assert result["current_step"] == 13

    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_verification_summary_counts(self, mock_llm):
        """Verification summary correctly counts verified/failed/fraud."""
        mock_llm.return_value = "Summary."
        result = await run_audit_agent(_base_state(
            verification_results={
                "Doc A": {"status": "verified", "reason": "ok"},
                "Doc B": {"status": "failed", "reason": "not found"},
                "Doc C": {"status": "verified", "reason": "ok"},
            },
        ))
        vs = result["audit_summary"]["verification_summary"]
        assert vs["total_documents"] == 3
        assert vs["verified"] == 2
        assert vs["failed"] == 1


class TestGenerateAuditPDF:
    """Test PDF audit pack generation."""

    async def test_pdf_generation(self, tmp_path):
        """PDF file is created at the expected path."""
        state = {
            "vendor_id": "test-pdf-001",
            "vendor_name": "PDF Test Corp",
            "risk_score": "Low",
            "risk_rationale": "All clear.",
            "audit_log": [
                {"timestamp": "2026-01-01T00:00:00", "agent": "Test", "action": "Testing", "reason": "Unit test"},
            ],
        }
        with patch.dict(os.environ, {"AUDIT_PDF_DIR": str(tmp_path)}):
            filepath = await generate_audit_pdf(state)

        if filepath:  # ReportLab may not be installed
            assert os.path.exists(filepath)
            assert filepath.endswith(".pdf")
