# ============================================================================
# Nexus — PDF Generator Utility
# Serves: Audit Trail Agent
# Generates regulator-ready PDF audit packs using ReportLab.
# ============================================================================

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


async def generate_audit_pack_pdf(state: dict[str, Any]) -> str:
    """
    Generate a comprehensive regulator-ready PDF audit pack.

    Args:
        state: The complete vendor state dict

    Returns:
        Path to the generated PDF file
    """
    try:
        from reportlab.lib import colors
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
    except ImportError:
        logger.warning("ReportLab not installed — install with: pip install reportlab")
        return ""

    vendor_name = state.get("vendor_name", "Unknown")
    vendor_id = state.get("vendor_id", "unknown")

    audit_dir = os.getenv("AUDIT_PDF_DIR", "./audit_reports")
    os.makedirs(audit_dir, exist_ok=True)

    filename = f"nexus_audit_{vendor_id[:8]}_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.pdf"
    filepath = os.path.join(audit_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    elements = []

    # ── Title Block ───────────────────────────────────────────────────

    title_style = ParagraphStyle(
        "NexusTitle", parent=styles["Title"],
        fontSize=20, spaceAfter=6, textColor=colors.HexColor("#0f1f3d"),
    )
    subtitle_style = ParagraphStyle(
        "NexusSub", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#64748b"), spaceAfter=15,
    )

    elements.append(Paragraph("NEXUS — Vendor Verification Audit Pack", title_style))
    elements.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%d %B %Y, %H:%M UTC')} | "
        f"Vendor ID: {vendor_id[:8]}",
        subtitle_style,
    ))
    elements.append(Spacer(1, 5 * mm))

    # ── Vendor Summary ────────────────────────────────────────────────

    elements.append(Paragraph("1. Vendor Information", styles["Heading2"]))
    vendor_data = [
        ["Field", "Value"],
        ["Vendor Name", vendor_name],
        ["Industry", state.get("industry", "N/A")],
        ["Risk Score", state.get("risk_score", "Not Assessed")],
        ["Workflow Status", state.get("workflow_status", "N/A")],
        ["Contact Email", state.get("contact_email", "N/A")],
    ]
    vendor_table = Table(vendor_data, colWidths=[50 * mm, 120 * mm])
    vendor_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f1f3d")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ]))
    elements.append(vendor_table)
    elements.append(Spacer(1, 8 * mm))

    # ── Risk Assessment ───────────────────────────────────────────────

    elements.append(Paragraph("2. Risk Assessment", styles["Heading2"]))
    rationale = state.get("risk_rationale", "No rationale available.")
    elements.append(Paragraph(rationale, styles["Normal"]))
    elements.append(Spacer(1, 8 * mm))

    # ── Verification Results ──────────────────────────────────────────

    elements.append(Paragraph("3. Document Verification Results", styles["Heading2"]))
    verification = state.get("verification_results", {})

    if verification:
        ver_data = [["Document", "Status", "Source", "Reason"]]
        for doc_name, result in verification.items():
            if isinstance(result, dict):
                ver_data.append([
                    doc_name[:30],
                    result.get("status", "N/A"),
                    result.get("api_source", "N/A"),
                    result.get("reason", "")[:40],
                ])
            else:
                ver_data.append([doc_name[:30], str(result), "N/A", ""])

        ver_table = Table(ver_data, colWidths=[40 * mm, 25 * mm, 25 * mm, 80 * mm])
        ver_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f1f3d")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(ver_table)
    else:
        elements.append(Paragraph("No verification results available.", styles["Normal"]))

    elements.append(Spacer(1, 8 * mm))

    # ── Decision Audit Trail ──────────────────────────────────────────

    elements.append(Paragraph("4. Decision Audit Trail", styles["Heading2"]))
    audit_log = state.get("audit_log", [])

    if audit_log:
        log_data = [["Timestamp", "Agent", "Action", "Reason"]]
        for entry in audit_log:
            log_data.append([
                entry.get("timestamp", "")[:19],
                entry.get("agent", ""),
                entry.get("action", "")[:50],
                entry.get("reason", "")[:50],
            ])

        log_table = Table(log_data, colWidths=[35 * mm, 25 * mm, 55 * mm, 55 * mm])
        log_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f1f3d")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(log_table)
    else:
        elements.append(Paragraph("No audit log entries.", styles["Normal"]))

    # ── Footer ────────────────────────────────────────────────────────

    elements.append(Spacer(1, 15 * mm))
    footer_style = ParagraphStyle(
        "Footer", parent=styles["Normal"],
        fontSize=8, textColor=colors.HexColor("#94a3b8"), alignment=1,
    )
    elements.append(Paragraph(
        "This audit pack was generated by Nexus — Multi-Agent Vendor Verification System. "
        "All decisions are timestamped and immutable.",
        footer_style,
    ))

    doc.build(elements)
    logger.info(f"Audit PDF generated: {filepath}")
    return filepath
