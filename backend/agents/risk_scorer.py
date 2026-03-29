# ============================================================================
# Nexus — Risk Scoring Agent
# Serves: Risk intelligence and reasoning.
# Scores suppliers Low/Medium/High, checks sanction lists, produces
# written rationale paragraph using LLM — not just a number.
# ============================================================================

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from backend.models.vendor import DocumentStatus, RiskLevel
from backend.tools.sanction_checker import check_sanctions
from backend.utils.llm_wrapper import call_llm, call_llm_json
from backend.utils.state_manager import state_manager
from backend.utils.supabase_client import upsert_vendor_risk

logger = logging.getLogger(__name__)

RISK_SYSTEM_PROMPT = """You are a risk assessment AI for vendor due diligence in Indian industries.
You must produce a clear, evidence-based risk assessment with a written rationale.
Your output must be actionable for a compliance officer."""

RISK_PROMPT_TEMPLATE = """Analyze the following vendor verification data and produce a risk assessment.

Vendor: {vendor_name}
Industry: {industry}

Verification Results:
{verification_summary}

Fraud Flags:
{fraud_summary}

Sanction Check:
{sanction_summary}

Based on this evidence, provide:
1. Risk score: "Low", "Medium", or "High"
2. A detailed rationale paragraph (3-5 sentences) explaining your reasoning
3. Key risk factors identified
4. Recommended actions

Respond in JSON:
{{
  "risk_score": "Low|Medium|High",
  "rationale": "Your detailed reasoning paragraph...",
  "risk_factors": ["factor1", "factor2"],
  "recommended_actions": ["action1", "action2"]
}}
"""


async def run_risk_scorer(state: dict[str, Any]) -> dict[str, Any]:
    """
    Risk Scoring Agent — LangGraph node function.

    Responsibilities:
    1. Analyze all verification results
    2. Check sanction lists for vendor and directors
    3. Compute risk score with weighted factors
    4. Generate human-readable risk rationale via LLM
    5. Flag recommended actions

    Args:
        state: LangGraph shared state dict

    Returns:
        Updated state with risk_score, risk_rationale, and any new fraud flags
    """
    vendor_id = state.get("vendor_id", "")
    vendor_name = state.get("vendor_name", "")
    industry = state.get("industry", "")
    verification_results = state.get("verification_results", {})
    fraud_flags = state.get("fraud_flags", [])

    logger.info(f"Risk Scorer processing for: {vendor_name}")

    # ── Step 1: Sanction List Check ───────────────────────────────────

    sanction_result = await check_sanctions(entity_name=vendor_name)
    is_sanctioned = sanction_result.get("is_sanctioned", False)

    if is_sanctioned:
        for match in sanction_result.get("matches", []):
            fraud_flags.append({
                "doc_name": "Sanction Check",
                "flag_type": "sanctioned_entity",
                "description": f"Sanction match: {match.get('reason', 'Unknown')} (Source: {match.get('source_list', 'Unknown')})",
                "severity": "critical",
                "detected_at": datetime.utcnow().isoformat(),
            })

    # ── Step 2: Compute Rule-Based Risk Score ─────────────────────────

    risk_points = 0
    risk_factors = []

    # Sanction hit = immediate High
    if is_sanctioned:
        risk_points += 100
        risk_factors.append("Entity found on sanction/blacklist")

    # Count verification failures
    failed_count = sum(
        1 for r in verification_results.values()
        if (r.get("status") if isinstance(r, dict) else str(r))
        in [DocumentStatus.FAILED.value, DocumentStatus.EXPIRED.value]
    )
    fraud_count = sum(
        1 for r in verification_results.values()
        if (r.get("status") if isinstance(r, dict) else str(r)) == DocumentStatus.FRAUD_SUSPECT.value
    )

    if fraud_count > 0:
        risk_points += 50 * fraud_count
        risk_factors.append(f"{fraud_count} fraud signal(s) detected")

    if failed_count > 0:
        risk_points += 15 * failed_count
        risk_factors.append(f"{failed_count} verification failure(s)")

    # Expired documents
    expired_count = sum(
        1 for r in verification_results.values()
        if (r.get("status") if isinstance(r, dict) else str(r)) == DocumentStatus.EXPIRED.value
    )
    if expired_count > 0:
        risk_points += 20 * expired_count
        risk_factors.append(f"{expired_count} expired document(s)")

    # Determine risk level
    if risk_points >= 50:
        computed_risk = RiskLevel.HIGH
    elif risk_points >= 20:
        computed_risk = RiskLevel.MEDIUM
    else:
        computed_risk = RiskLevel.LOW

    # ── Step 3: Generate Written Rationale via LLM ────────────────────

    verification_summary = "\n".join(
        f"- {name}: {r.get('status', 'unknown') if isinstance(r, dict) else r} — {r.get('reason', '') if isinstance(r, dict) else ''}"
        for name, r in verification_results.items()
    ) or "No documents verified yet."

    fraud_summary = "\n".join(
        f"- {f.get('doc_name', '')}: {f.get('flag_type', '')} — {f.get('description', '')}"
        for f in fraud_flags
    ) or "No fraud flags."

    sanction_summary = (
        f"FLAGGED — {sanction_result.get('total_matches', 0)} matches found: "
        + ", ".join(m.get("source_list", "") for m in sanction_result.get("matches", []))
        if is_sanctioned
        else "CLEAR — No matches found across all lists."
    )

    try:
        prompt = RISK_PROMPT_TEMPLATE.format(
            vendor_name=vendor_name,
            industry=industry,
            verification_summary=verification_summary,
            fraud_summary=fraud_summary,
            sanction_summary=sanction_summary,
        )

        llm_response = await call_llm_json(
            prompt=prompt,
            task_type="heavy",  # Risk assessment = high-stakes reasoning
            system_prompt=RISK_SYSTEM_PROMPT,
        )

        risk_rationale = llm_response.get("rationale", f"Risk score: {computed_risk.value}. Based on {len(risk_factors)} factors identified.")
        llm_risk = llm_response.get("risk_score", computed_risk.value)
        recommended_actions = llm_response.get("recommended_actions", [])

        # Use the higher of rule-based vs LLM risk
        risk_hierarchy = {"Low": 0, "Medium": 1, "High": 2}
        if risk_hierarchy.get(llm_risk, 0) > risk_hierarchy.get(computed_risk.value, 0):
            computed_risk = RiskLevel(llm_risk)

    except Exception as e:
        logger.error(f"Risk rationale generation failed: {e}")
        risk_rationale = (
            f"Risk assessment for {vendor_name}: {computed_risk.value} risk. "
            f"Based on {len(risk_factors)} factors: {', '.join(risk_factors) or 'none identified'}."
        )
        recommended_actions = []

    # ── Step 4: Update State ──────────────────────────────────────────

    updated_state = {
        **state,
        "risk_score": computed_risk.value,
        "risk_rationale": risk_rationale,
        "fraud_flags": fraud_flags,
        "current_step": 10,
    }

    # Halt on sanction match
    if is_sanctioned:
        updated_state["workflow_status"] = "halted"
        updated_state["escalation_level"] = 3

    # ── Audit Log ─────────────────────────────────────────────────────

    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent": "Risk Scorer",
        "action": f"Risk assessment complete — Score: {computed_risk.value}",
        "reason": risk_rationale[:200],
        "details": {
            "risk_score": computed_risk.value,
            "risk_points": risk_points,
            "risk_factors": risk_factors,
            "sanction_status": "flagged" if is_sanctioned else "clear",
            "recommended_actions": recommended_actions,
        },
    }
    updated_state.setdefault("audit_log", []).append(audit_entry)

    # ── Persist to Supabase ───────────────────────────────────────────
    vendor_id = updated_state.get("vendor_id", "")
    if vendor_id:
        try:
            await upsert_vendor_risk(
                vendor_id=vendor_id,
                risk_score=computed_risk.value,
                risk_rationale=risk_rationale,
                workflow_status=updated_state.get("workflow_status", ""),
            )
        except Exception as e:
            logger.warning(f"Supabase risk persist failed (non-fatal): {e}")

    logger.info(f"Risk Scorer complete — Score: {computed_risk.value}, Points: {risk_points}")

    return updated_state
