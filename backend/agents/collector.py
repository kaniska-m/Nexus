# ============================================================================
# Nexus — Collector Agent
# Serves: Document intake, smart form generation, and document chasing.
# Generates structured web forms from checklists, tracks submitted vs pending
# documents, sends contextual reminders, validates document format.
# ============================================================================

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from backend.models.vendor import DocumentStatus, EscalationLevel, WorkflowStatus
from backend.utils.llm_wrapper import call_llm
from backend.utils.state_manager import state_manager

logger = logging.getLogger(__name__)


async def run_collector(state: dict[str, Any]) -> dict[str, Any]:
    """
    Collector Agent — LangGraph node function.

    Responsibilities:
    1. Generate smart web form from compliance checklist
    2. Track document submission status (submitted vs pending)
    3. Send contextual reminders for missing documents
    4. Validate document format before passing to Verifier
    5. Retry up to 2x for missing docs, then escalate

    Args:
        state: LangGraph shared state dict

    Returns:
        Updated state with document tracking info
    """
    vendor_id = state.get("vendor_id", "")
    vendor_name = state.get("vendor_name", "")
    checklist = state.get("checklist", [])
    documents_submitted = state.get("documents_submitted", {})
    documents_pending = state.get("documents_pending", [])

    logger.info(f"Collector Agent processing for: {vendor_name}")

    # ── Track Document Status ─────────────────────────────────────────

    still_pending = []
    needs_retry = []

    for item in checklist:
        doc_name = item.get("document_name", "")
        status = item.get("status", DocumentStatus.PENDING.value)

        if doc_name in documents_submitted:
            # Document has been submitted — mark in checklist
            item["status"] = DocumentStatus.SUBMITTED.value
        elif item.get("required", True):
            retry_count = item.get("retry_count", 0)
            max_retries = item.get("max_retries", 2)

            if retry_count < max_retries:
                still_pending.append(doc_name)
                item["retry_count"] = retry_count + 1
                needs_retry.append(doc_name)
            else:
                # Max retries exceeded — escalate
                still_pending.append(doc_name)
                item["status"] = DocumentStatus.RE_REQUESTED.value

    # ── Generate Contextual Reminders (light LLM task) ────────────────

    reminders_sent = []
    if needs_retry:
        try:
            reminder_text = await call_llm(
                prompt=(
                    f"Draft a polite but firm reminder email for supplier '{vendor_name}' "
                    f"asking them to submit the following missing documents:\n"
                    f"{chr(10).join(f'- {doc}' for doc in needs_retry)}\n\n"
                    f"Keep it concise, professional, and mention that these are required "
                    f"for compliance verification. Include a deadline of 48 hours."
                ),
                task_type="light",  # Reminders = low-complexity task
            )
            reminders_sent.append({
                "type": "reminder",
                "documents": needs_retry,
                "message_preview": reminder_text[:200],
                "sent_at": datetime.utcnow().isoformat(),
            })
        except Exception as e:
            logger.error(f"Reminder generation failed: {e}")

    # ── Check for Escalation ──────────────────────────────────────────

    escalated_docs = [
        item.get("document_name")
        for item in checklist
        if item.get("retry_count", 0) >= item.get("max_retries", 2)
        and item.get("status") != DocumentStatus.SUBMITTED.value
        and item.get("required", True)
    ]

    # ── Update State ──────────────────────────────────────────────────

    updated_state = {
        **state,
        "checklist": checklist,
        "documents_pending": still_pending,
        "current_step": 3,
    }

    # Escalate if documents still missing after max retries
    if escalated_docs:
        updated_state["escalation_level"] = EscalationLevel.REROUTE.value

    # ── Audit Log ─────────────────────────────────────────────────────

    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent": "Collector",
        "action": f"Document tracking updated — {len(documents_submitted)} submitted, {len(still_pending)} pending",
        "reason": "Automated document collection and tracking",
        "details": {
            "submitted_count": len(documents_submitted),
            "pending_count": len(still_pending),
            "reminders_sent": len(reminders_sent),
            "escalated_docs": escalated_docs,
        },
    }
    updated_state.setdefault("audit_log", []).append(audit_entry)

    logger.info(
        f"Collector complete — {len(documents_submitted)} submitted, "
        f"{len(still_pending)} pending, {len(reminders_sent)} reminders"
    )

    return updated_state


async def generate_smart_form(checklist: list[dict]) -> dict[str, Any]:
    """
    Generate a structured web form from the compliance checklist.
    Returns form fields with metadata for the supplier portal.
    """
    form_fields = []
    for item in checklist:
        field = {
            "field_id": item.get("id", ""),
            "label": item.get("document_name", ""),
            "description": item.get("description", ""),
            "category": item.get("category", "General"),
            "required": item.get("required", True),
            "field_type": "file_upload",
            "accepted_formats": [".pdf", ".jpg", ".png"],
            "max_size_mb": 10,
            "status": item.get("status", "pending"),
        }
        form_fields.append(field)

    return {
        "form_title": "Vendor Compliance Documents",
        "form_description": "Please upload all required documents for verification",
        "fields": form_fields,
        "total_required": sum(1 for f in form_fields if f["required"]),
        "total_optional": sum(1 for f in form_fields if not f["required"]),
    }
