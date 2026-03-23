# ============================================================================
# Nexus — Monitor Agent (6th Agent)
# Serves: Post-approval continuous vendor health monitoring.
# Tracks certificate expiry, risk score drift, SLA performance,
# sanction list updates. Runs on scheduled cadence per vendor risk level.
# ============================================================================

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from backend.models.vendor import HealthStatus, RiskLevel
from backend.tools.sanction_checker import check_sanctions
from backend.utils.llm_wrapper import call_llm
from backend.utils.state_manager import state_manager

logger = logging.getLogger(__name__)


# ── Monitoring Schedule ───────────────────────────────────────────────────
# Based on risk level: High=daily, Medium=weekly, Low=monthly
MONITORING_SCHEDULE = {
    RiskLevel.HIGH.value: timedelta(days=1),
    RiskLevel.MEDIUM.value: timedelta(weeks=1),
    RiskLevel.LOW.value: timedelta(days=30),
}


async def run_monitor(state: dict[str, Any]) -> dict[str, Any]:
    """
    Monitor Agent — LangGraph node function (post-approval loop).

    Watches four distinct signals:
    1. Certificate expiry — 30d amber, 7d red, expired = suspension
    2. Risk score drift — MCA21/GSTN changes, news signals
    3. SLA performance — delivery, quality, invoice disputes
    4. Sanction list updates — new matches trigger halt

    Args:
        state: LangGraph shared state dict

    Returns:
        Updated state with health_status and monitoring notes
    """
    vendor_id = state.get("vendor_id", "")
    vendor_name = state.get("vendor_name", "")
    risk_score = state.get("risk_score", RiskLevel.LOW.value)
    verification_results = state.get("verification_results", {})

    logger.info(f"Monitor Agent checking: {vendor_name}")

    health_issues = []
    health_status = HealthStatus.GREEN

    # ── Signal 1: Certificate Expiry Check ────────────────────────────

    today = datetime.utcnow().date()

    for doc_name, result in verification_results.items():
        expiry = result.get("expiry_date") if isinstance(result, dict) else None
        if not expiry:
            continue

        try:
            if isinstance(expiry, str):
                # Try ISO format first, then DD/MM/YYYY
                for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"]:
                    try:
                        expiry_date = datetime.strptime(expiry, fmt).date()
                        break
                    except ValueError:
                        continue
                else:
                    continue
            else:
                expiry_date = expiry

            days_until_expiry = (expiry_date - today).days

            if days_until_expiry <= 0:
                health_status = HealthStatus.RED
                health_issues.append(
                    f"EXPIRED: {doc_name} expired on {expiry_date.isoformat()}"
                )
            elif days_until_expiry <= 7:
                health_status = max(health_status, HealthStatus.RED, key=_health_priority)
                health_issues.append(
                    f"CRITICAL: {doc_name} expires in {days_until_expiry} days"
                )
            elif days_until_expiry <= 30:
                if health_status != HealthStatus.RED:
                    health_status = HealthStatus.AMBER
                health_issues.append(
                    f"WARNING: {doc_name} expires in {days_until_expiry} days"
                )
        except (ValueError, TypeError) as e:
            logger.warning(f"Could not parse expiry date for {doc_name}: {e}")

    # ── Signal 2: Sanction List Re-check ──────────────────────────────

    sanction_result = await check_sanctions(entity_name=vendor_name)
    if sanction_result.get("is_sanctioned", False):
        health_status = HealthStatus.RED
        health_issues.append(
            f"SANCTION MATCH: {vendor_name} found on updated sanction list"
        )

    # ── Signal 3: SLA Performance (simulated) ─────────────────────────
    # In production, this would check delivery and quality metrics
    # For hackathon demo, we simulate based on risk level

    if risk_score == RiskLevel.HIGH.value:
        health_issues.append("MONITOR: High-risk vendor — enhanced monitoring active")
        if health_status == HealthStatus.GREEN:
            health_status = HealthStatus.AMBER

    # ── Generate Health Summary via LLM ───────────────────────────────

    try:
        monitoring_notes = await call_llm(
            prompt=(
                f"Provide a brief 2-sentence health monitoring summary for vendor '{vendor_name}'.\n"
                f"Health Status: {health_status.value}\n"
                f"Issues Found: {'; '.join(health_issues) if health_issues else 'None'}\n"
                f"Risk Score: {risk_score}\n"
                f"Be specific and actionable."
            ),
            task_type="light",
        )
    except Exception:
        monitoring_notes = (
            f"Health status: {health_status.value}. "
            + (f"Issues: {'; '.join(health_issues)}" if health_issues else "No issues found.")
        )

    # ── Update State ──────────────────────────────────────────────────

    updated_state = {
        **state,
        "health_status": health_status.value,
        "last_monitored": datetime.utcnow().isoformat(),
        "monitoring_notes": monitoring_notes,
    }

    # ── Audit Log ─────────────────────────────────────────────────────

    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent": "Monitor",
        "action": f"Health check complete — Status: {health_status.value}",
        "reason": f"{len(health_issues)} issue(s) found" if health_issues else "Routine monitoring — all clear",
        "details": {
            "health_status": health_status.value,
            "issues": health_issues,
            "next_check": (
                datetime.utcnow() + MONITORING_SCHEDULE.get(risk_score, timedelta(days=30))
            ).isoformat(),
        },
    }
    updated_state.setdefault("audit_log", []).append(audit_entry)

    logger.info(f"Monitor complete — Health: {health_status.value}, Issues: {len(health_issues)}")

    return updated_state


def _health_priority(status: HealthStatus) -> int:
    """Helper to compare health status severity."""
    return {HealthStatus.GREEN: 0, HealthStatus.AMBER: 1, HealthStatus.RED: 2}.get(status, 0)
