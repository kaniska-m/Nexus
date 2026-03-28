# ============================================================================
# Tests — Risk Scoring Agent
# ============================================================================

import pytest
from unittest.mock import AsyncMock, patch

from backend.agents.risk_scorer import run_risk_scorer


def _base_state(**overrides):
    """Create a base state dict for risk scorer tests."""
    state = {
        "vendor_id": "v1",
        "vendor_name": "TestCorp",
        "industry": "IT",
        "verification_results": {},
        "fraud_flags": [],
        "audit_log": [],
        "workflow_status": "active",
    }
    state.update(overrides)
    return state


class TestRunRiskScorer:
    """Test the risk scorer LangGraph node function."""

    @patch("backend.agents.risk_scorer.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.call_llm_json", new_callable=AsyncMock)
    async def test_clean_vendor_low_risk(self, mock_llm, mock_sanctions):
        """Clean vendor with no issues → Low risk."""
        mock_sanctions.return_value = {
            "is_sanctioned": False, "matches": [], "total_matches": 0,
        }
        mock_llm.return_value = {
            "risk_score": "Low",
            "rationale": "All clear.",
            "risk_factors": [],
            "recommended_actions": [],
        }
        result = await run_risk_scorer(_base_state(
            verification_results={
                "Doc A": {"status": "verified", "reason": "ok"},
            },
        ))
        assert result["risk_score"] == "Low"
        assert result["current_step"] == 10

    @patch("backend.agents.risk_scorer.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.call_llm_json", new_callable=AsyncMock)
    async def test_fraud_flags_high_risk(self, mock_llm, mock_sanctions):
        """Vendor with fraud signals → High risk (50+ points)."""
        mock_sanctions.return_value = {
            "is_sanctioned": False, "matches": [], "total_matches": 0,
        }
        mock_llm.return_value = {
            "risk_score": "High",
            "rationale": "Fraud detected.",
            "risk_factors": ["fraud"],
            "recommended_actions": ["Investigate"],
        }
        result = await run_risk_scorer(_base_state(
            verification_results={
                "Doc A": {"status": "fraud_suspect", "reason": "mismatch"},
            },
            fraud_flags=[
                {"doc_name": "Doc A", "flag_type": "mismatch", "description": "Numbers don't match", "severity": "critical"},
            ],
        ))
        assert result["risk_score"] == "High"

    @patch("backend.agents.risk_scorer.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.call_llm_json", new_callable=AsyncMock)
    async def test_verification_failures_medium_risk(self, mock_llm, mock_sanctions):
        """2 verification failures → 30 points → Medium risk."""
        mock_sanctions.return_value = {
            "is_sanctioned": False, "matches": [], "total_matches": 0,
        }
        mock_llm.return_value = {
            "risk_score": "Medium",
            "rationale": "Some docs failed.",
            "risk_factors": ["failures"],
            "recommended_actions": [],
        }
        result = await run_risk_scorer(_base_state(
            verification_results={
                "Doc A": {"status": "failed", "reason": "not found"},
                "Doc B": {"status": "failed", "reason": "expired"},
            },
        ))
        assert result["risk_score"] == "Medium"

    @patch("backend.agents.risk_scorer.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.call_llm_json", new_callable=AsyncMock)
    async def test_sanction_hit_halts_workflow(self, mock_llm, mock_sanctions):
        """Sanctioned entity → High risk + workflow halted."""
        mock_sanctions.return_value = {
            "is_sanctioned": True,
            "matches": [{"entity_name": "Bad Co", "reason": "OFAC", "source_list": "OFAC"}],
            "total_matches": 1,
        }
        mock_llm.return_value = {
            "risk_score": "High",
            "rationale": "Sanctioned.",
            "risk_factors": ["sanction"],
            "recommended_actions": ["Reject"],
        }
        result = await run_risk_scorer(_base_state())
        assert result["risk_score"] == "High"
        assert result["workflow_status"] == "halted"
        assert result["escalation_level"] == 3
        # Sanction match adds a fraud flag
        assert any(f["flag_type"] == "sanctioned_entity" for f in result["fraud_flags"])

    @patch("backend.agents.risk_scorer.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.call_llm_json", new_callable=AsyncMock)
    async def test_llm_risk_higher_than_rule(self, mock_llm, mock_sanctions):
        """LLM risk higher than rule-based → use LLM risk."""
        mock_sanctions.return_value = {
            "is_sanctioned": False, "matches": [], "total_matches": 0,
        }
        # Rule-based would compute Low (0 points), but LLM says Medium
        mock_llm.return_value = {
            "risk_score": "Medium",
            "rationale": "Concerns detected by LLM.",
            "risk_factors": ["industry risk"],
            "recommended_actions": [],
        }
        result = await run_risk_scorer(_base_state(
            verification_results={
                "Doc A": {"status": "verified", "reason": "ok"},
            },
        ))
        assert result["risk_score"] == "Medium"  # LLM overrides Low → Medium

    @patch("backend.agents.risk_scorer.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.call_llm_json", new_callable=AsyncMock)
    async def test_llm_failure_still_produces_rationale(self, mock_llm, mock_sanctions):
        """LLM failure → fallback rationale is generated."""
        mock_sanctions.return_value = {
            "is_sanctioned": False, "matches": [], "total_matches": 0,
        }
        mock_llm.side_effect = Exception("LLM down")
        result = await run_risk_scorer(_base_state())
        assert result["risk_rationale"]  # Non-empty fallback
        assert result["risk_score"] == "Low"

    @patch("backend.agents.risk_scorer.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.call_llm_json", new_callable=AsyncMock)
    async def test_audit_log_appended(self, mock_llm, mock_sanctions):
        """Risk scorer appends audit log entry."""
        mock_sanctions.return_value = {
            "is_sanctioned": False, "matches": [], "total_matches": 0,
        }
        mock_llm.return_value = {
            "risk_score": "Low",
            "rationale": "ok",
            "risk_factors": [],
            "recommended_actions": [],
        }
        result = await run_risk_scorer(_base_state())
        assert len(result["audit_log"]) >= 1
        assert result["audit_log"][-1]["agent"] == "Risk Scorer"
