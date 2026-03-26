# ============================================================================
# Tests — Monitor Agent (Post-Approval Health)
# ============================================================================

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

from backend.agents.monitor_agent import run_monitor, _health_priority
from backend.models.vendor import HealthStatus


def _base_state(**overrides):
    state = {
        "vendor_id": "v1",
        "vendor_name": "TestCorp",
        "risk_score": "Low",
        "verification_results": {},
        "audit_log": [],
    }
    state.update(overrides)
    return state


class TestRunMonitor:
    """Test the monitor agent LangGraph node function."""

    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.call_llm", new_callable=AsyncMock)
    async def test_green_healthy_vendor(self, mock_llm, mock_sanctions):
        """No issues → Green health status."""
        mock_sanctions.return_value = {"is_sanctioned": False}
        mock_llm.return_value = "All clear."
        result = await run_monitor(_base_state())
        assert result["health_status"] == "Green"
        assert result["last_monitored"]

    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.call_llm", new_callable=AsyncMock)
    async def test_amber_expiring_30_days(self, mock_llm, mock_sanctions):
        """Document expiring within 30 days → Amber."""
        mock_sanctions.return_value = {"is_sanctioned": False}
        mock_llm.return_value = "Expiring soon."
        expiry_date = (datetime.utcnow() + timedelta(days=20)).strftime("%Y-%m-%d")
        result = await run_monitor(_base_state(
            verification_results={
                "CDSCO Licence": {"expiry_date": expiry_date, "status": "verified"},
            },
        ))
        assert result["health_status"] == "Amber"

    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.call_llm", new_callable=AsyncMock)
    async def test_red_expiring_7_days(self, mock_llm, mock_sanctions):
        """Document expiring within 7 days → Red."""
        mock_sanctions.return_value = {"is_sanctioned": False}
        mock_llm.return_value = "Critical expiry."
        expiry_date = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d")
        result = await run_monitor(_base_state(
            verification_results={
                "CDSCO Licence": {"expiry_date": expiry_date, "status": "verified"},
            },
        ))
        assert result["health_status"] == "Red"

    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.call_llm", new_callable=AsyncMock)
    async def test_red_expired_document(self, mock_llm, mock_sanctions):
        """Expired document → Red."""
        mock_sanctions.return_value = {"is_sanctioned": False}
        mock_llm.return_value = "Expired."
        expiry_date = (datetime.utcnow() - timedelta(days=10)).strftime("%Y-%m-%d")
        result = await run_monitor(_base_state(
            verification_results={
                "ISO Certificate": {"expiry_date": expiry_date, "status": "verified"},
            },
        ))
        assert result["health_status"] == "Red"

    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.call_llm", new_callable=AsyncMock)
    async def test_sanction_recheck_flags_red(self, mock_llm, mock_sanctions):
        """New sanction match on re-check → Red."""
        mock_sanctions.return_value = {"is_sanctioned": True}
        mock_llm.return_value = "Sanctioned!"
        result = await run_monitor(_base_state())
        assert result["health_status"] == "Red"

    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.call_llm", new_callable=AsyncMock)
    async def test_high_risk_minimum_amber(self, mock_llm, mock_sanctions):
        """High-risk vendor → minimum Amber health."""
        mock_sanctions.return_value = {"is_sanctioned": False}
        mock_llm.return_value = "Enhanced monitoring."
        result = await run_monitor(_base_state(risk_score="High"))
        assert result["health_status"] in ("Amber", "Red")

    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.call_llm", new_callable=AsyncMock)
    async def test_llm_failure_fallback(self, mock_llm, mock_sanctions):
        """LLM failure → monitoring_notes still generated."""
        mock_sanctions.return_value = {"is_sanctioned": False}
        mock_llm.side_effect = Exception("LLM down")
        result = await run_monitor(_base_state())
        assert result["monitoring_notes"]  # Non-empty fallback

    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.call_llm", new_callable=AsyncMock)
    async def test_audit_log_appended(self, mock_llm, mock_sanctions):
        """Monitor appends audit log entry."""
        mock_sanctions.return_value = {"is_sanctioned": False}
        mock_llm.return_value = "ok"
        result = await run_monitor(_base_state())
        assert len(result["audit_log"]) >= 1
        assert result["audit_log"][-1]["agent"] == "Monitor"

    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.call_llm", new_callable=AsyncMock)
    async def test_multiple_expiry_dates_worst_wins(self, mock_llm, mock_sanctions):
        """Multiple docs: one expiring in 5 days, one in 25 days → Red wins."""
        mock_sanctions.return_value = {"is_sanctioned": False}
        mock_llm.return_value = "Multiple concerns."
        soon = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d")
        later = (datetime.utcnow() + timedelta(days=25)).strftime("%Y-%m-%d")
        result = await run_monitor(_base_state(
            verification_results={
                "Licence A": {"expiry_date": soon, "status": "verified"},
                "Licence B": {"expiry_date": later, "status": "verified"},
            },
        ))
        assert result["health_status"] == "Red"


class TestHealthPriority:
    """Test the health priority helper function."""

    def test_green_lowest(self):
        assert _health_priority(HealthStatus.GREEN) == 0

    def test_amber_middle(self):
        assert _health_priority(HealthStatus.AMBER) == 1

    def test_red_highest(self):
        assert _health_priority(HealthStatus.RED) == 2

    def test_ordering(self):
        assert _health_priority(HealthStatus.GREEN) < _health_priority(HealthStatus.AMBER)
        assert _health_priority(HealthStatus.AMBER) < _health_priority(HealthStatus.RED)
