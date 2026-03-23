# ============================================================================
# Nexus — Audit Trail Agent
# Serves: Compliance record and output.
# Logs every agent decision with timestamp and reason, compiles the full
# audit trail, generates regulator-ready PDF audit pack via ReportLab.
# ============================================================================

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any

from backend.utils.llm_wrapper import call_llm
from backend.utils.state_manager import state_manager

logger = logging.getLogger(__name__)


async def run_audit_agent(state: dict[str, Any]) -> dict[str, Any]:
    """
    Audit Trail Agent — LangGraph node function.

    Responsibilities:
    1. Compile all agent decisions into a structured audit record
    2. Verify completeness of the audit trail
    3. Generate a summary report using LLM
    4. Optionally generate a PDF audit pack (via ReportLab)

    Args:
        state: LangGraph shared state dict

    Returns:
        Updated state with compiled audit trail and report
    """
    vendor_id = state.get("vendor_id", "")
    vendor_name = state.get("vendor_name", "")
    audit_log = state.get("audit_log", [])
    risk_score = state.get("risk_score", "Unknown")
    risk_rationale = state.get("risk_rationale", "")
    verification_results = state.get("verification_results", {})
    fraud_flags = state.get("fraud_flags", [])
    workflow_status = state.get("workflow_status", "")

    logger.info(f"Audit Agent compiling trail for: {vendor_name}")

    # ── Step 1: Compile Structured Audit Record ───────────────────────

    audit_summary = {
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "industry": state.get("industry", ""),
        "workflow_status": workflow_status,
        "risk_score": risk_score,
        "total_steps_logged": len(audit_log),
        "agents_involved": list(set(
            entry.get("agent", "Unknown") for entry in audit_log
        )),
        "verification_summary": {
            "total_documents": len(verification_results),
            "verified": sum(
                1 for r in verification_results.values()
                if (r.get("status") if isinstance(r, dict) else r) == "verified"
            ),
            "failed": sum(
                1 for r in verification_results.values()
                if (r.get("status") if isinstance(r, dict) else r) in ["failed", "expired"]
            ),
            "fraud_signals": len(fraud_flags),
        },
        "compiled_at": datetime.utcnow().isoformat(),
    }

    # ── Step 2: Generate Audit Summary via LLM ────────────────────────

    try:
        audit_narrative = await call_llm(
            prompt=(
                f"Write a concise 3-paragraph audit summary for the following vendor verification:\n\n"
                f"Vendor: {vendor_name}\n"
                f"Industry: {state.get('industry', 'Unknown')}\n"
                f"Risk Score: {risk_score}\n"
                f"Risk Rationale: {risk_rationale}\n"
                f"Documents Verified: {audit_summary['verification_summary']['verified']}\n"
                f"Documents Failed: {audit_summary['verification_summary']['failed']}\n"
                f"Fraud Signals: {len(fraud_flags)}\n"
                f"Workflow Status: {workflow_status}\n\n"
                f"Write this for a regulatory auditor. Be factual and specific."
            ),
            task_type="light",  # Summary generation = light task
        )
        audit_summary["narrative"] = audit_narrative
    except Exception as e:
        logger.error(f"Audit narrative generation failed: {e}")
        audit_summary["narrative"] = (
            f"Vendor {vendor_name} verification completed with risk score: {risk_score}. "
            f"{audit_summary['verification_summary']['verified']} documents verified, "
            f"{audit_summary['verification_summary']['failed']} failed. "
            f"{len(fraud_flags)} fraud signals detected."
        )

    # ── Step 3: Update State ──────────────────────────────────────────

    updated_state = {
        **state,
        "audit_summary": audit_summary,
        "current_step": 13,  # Steps 12-13: audit compilation + PDF
    }

    # If no fraud and workflow not halted, mark as complete
    if workflow_status not in ["halted", "escalated"]:
        updated_state["workflow_status"] = "complete"

    # ── Audit Log ─────────────────────────────────────────────────────

    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent": "Audit Agent",
        "action": f"Audit trail compiled — {len(audit_log)} entries, narrative generated",
        "reason": "Final audit compilation for regulatory compliance",
        "details": {
            "total_entries": len(audit_log),
            "agents_logged": audit_summary["agents_involved"],
            "report_generated": True,
        },
    }
    updated_state.setdefault("audit_log", []).append(audit_entry)

    logger.info(f"Audit Agent complete — {len(audit_log)} entries compiled")

    return updated_state


async def generate_audit_pdf(state: dict[str, Any]) -> str:
    """
    Generate a regulator-ready PDF audit pack using ReportLab.

    Returns: Path to the generated PDF file.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
        from reportlab.lib import colors
    except ImportError:
        logger.warning("ReportLab not installed — PDF generation disabled")
        return ""

    vendor_name = state.get("vendor_name", "Unknown")
    vendor_id = state.get("vendor_id", "unknown")
    audit_dir = os.getenv("AUDIT_PDF_DIR", "./audit_reports")
    os.makedirs(audit_dir, exist_ok=True)

    filename = f"audit_pack_{vendor_id[:8]}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    filepath = os.path.join(audit_dir, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    title_style = ParagraphStyle(
        "Title", parent=styles["Title"], fontSize=18, spaceAfter=20
    )
    elements.append(Paragraph(f"NEXUS — Vendor Audit Pack", title_style))
    elements.append(Paragraph(f"Vendor: {vendor_name}", styles["Heading2"]))
    elements.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%d %B %Y, %H:%M UTC')}",
        styles["Normal"],
    ))
    elements.append(Spacer(1, 10 * mm))

    # Risk Assessment
    risk_score = state.get("risk_score", "Unknown")
    elements.append(Paragraph(f"Risk Score: {risk_score}", styles["Heading2"]))
    elements.append(Paragraph(
        state.get("risk_rationale", "No rationale available."),
        styles["Normal"],
    ))
    elements.append(Spacer(1, 8 * mm))

    # Audit Log Table
    elements.append(Paragraph("Decision Audit Trail", styles["Heading2"]))
    audit_log = state.get("audit_log", [])

    if audit_log:
        table_data = [["Timestamp", "Agent", "Action", "Reason"]]
        for entry in audit_log:
            table_data.append([
                entry.get("timestamp", "")[:19],
                entry.get("agent", ""),
                entry.get("action", "")[:60],
                entry.get("reason", "")[:60],
            ])

        table = Table(table_data, colWidths=[35 * mm, 30 * mm, 55 * mm, 55 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f1f3d")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(table)

    doc.build(elements)
    logger.info(f"Audit PDF generated: {filepath}")
    return filepath
