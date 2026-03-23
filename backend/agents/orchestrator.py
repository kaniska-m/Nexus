# ============================================================================
# Nexus — Orchestrator Agent (THE BRAIN)
# Serves: Core workflow orchestration
# Reads industry input, calls LLM to generate dynamic compliance checklist,
# initializes vendor state, assigns tasks to specialist agents,
# monitors progress, detects stalls, escalates failures.
# ============================================================================

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from backend.models.vendor import (
    ChecklistItem,
    DocumentStatus,
    EscalationLevel,
    VendorRequest,
    VendorState,
    WorkflowStatus,
)
from backend.utils.llm_wrapper import call_llm_json
from backend.utils.state_manager import state_manager

logger = logging.getLogger(__name__)

# ── System Prompt for Compliance Checklist Generation ──────────────────────

CHECKLIST_SYSTEM_PROMPT = """You are Nexus, an expert regulatory compliance AI for Indian industries.
Your job is to generate a comprehensive vendor compliance checklist based on the industry type.

You have deep knowledge of:
- MCA21 (Ministry of Corporate Affairs) requirements
- GSTN (Goods & Services Tax Network) compliance
- CDSCO (Central Drugs Standard Control Organisation) for MedTech/Pharma
- ISO certification requirements
- Industry-specific regulatory frameworks

Generate a checklist that a buyer company would need to verify before onboarding a new supplier.
Each item must be specific, actionable, and mapped to the correct regulatory category."""

CHECKLIST_PROMPT_TEMPLATE = """Generate a compliance verification checklist for onboarding a new vendor in the **{industry}** industry in India.

Vendor Name: {vendor_name}

Requirements:
1. Include items across these categories: Legal, Financial, Regulatory, Quality, Operational
2. Each item must specify the exact document or verification needed
3. Mark each item as required (true/false)
4. Include a brief description of what the document proves
5. Generate 10-16 items that are realistic for this industry

Respond with a JSON object in this exact format:
{{
  "checklist": [
    {{
      "category": "Legal",
      "document_name": "Certificate of Incorporation",
      "description": "Proves the company is legally registered under MCA21",
      "required": true
    }},
    {{
      "category": "Financial",
      "document_name": "GST Registration Certificate",
      "description": "Confirms active GST registration and filing compliance",
      "required": true
    }}
  ]
}}
"""


async def run_orchestrator(state: dict[str, Any]) -> dict[str, Any]:
    """
    Orchestrator Agent — LangGraph node function.

    This is the BRAIN of Nexus. It:
    1. Reads the vendor request (industry, name)
    2. Calls LLM to generate a dynamic compliance checklist
    3. Initializes the full vendor state
    4. Assigns first task to Collector Agent
    5. Logs everything to audit trail

    Args:
        state: LangGraph shared state dict

    Returns:
        Updated state dict with checklist and workflow initialized
    """
    vendor_id = state.get("vendor_id", "")
    vendor_name = state.get("vendor_name", "")
    industry = state.get("industry", "")

    logger.info(f"Orchestrator starting for: {vendor_name} ({industry})")

    # ── Step 1: Generate Dynamic Compliance Checklist via LLM ──────────

    prompt = CHECKLIST_PROMPT_TEMPLATE.format(
        industry=industry,
        vendor_name=vendor_name,
    )

    try:
        llm_response = await call_llm_json(
            prompt=prompt,
            task_type="heavy",  # Checklist generation = high-stakes reasoning
            system_prompt=CHECKLIST_SYSTEM_PROMPT,
        )

        raw_checklist = llm_response.get("checklist", [])

        # Convert to ChecklistItem models
        checklist_items: list[ChecklistItem] = []
        for item in raw_checklist:
            checklist_items.append(ChecklistItem(
                category=item.get("category", "General"),
                document_name=item.get("document_name", "Unknown Document"),
                description=item.get("description", ""),
                required=item.get("required", True),
                status=DocumentStatus.PENDING,
            ))

        logger.info(f"Generated {len(checklist_items)} checklist items for {industry}")

    except Exception as e:
        logger.error(f"Checklist generation failed: {e}")
        # Fallback: generate a minimal default checklist
        checklist_items = _get_fallback_checklist(industry)

    # ── Step 2: Initialize Documents Pending List ─────────────────────

    documents_pending = [
        item.document_name for item in checklist_items if item.required
    ]

    # ── Step 3: Update State ──────────────────────────────────────────

    updated_state = {
        **state,
        "checklist": [item.model_dump() for item in checklist_items],
        "documents_pending": documents_pending,
        "documents_submitted": {},
        "verification_results": {},
        "fraud_flags": [],
        "risk_score": None,
        "risk_rationale": "",
        "audit_log": state.get("audit_log", []),
        "workflow_status": WorkflowStatus.ACTIVE.value,
        "exceptions": [],
        "current_step": 2,  # Step 1 was trigger, Step 2 is checklist generation
        "escalation_level": EscalationLevel.NONE.value,
    }

    # ── Step 4: Audit Log Entry ───────────────────────────────────────
    # RULE: Every agent must append to audit_log before returning

    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent": "Orchestrator",
        "action": f"Generated {len(checklist_items)}-item compliance checklist for {industry} industry",
        "reason": f"Vendor onboarding initiated for {vendor_name}",
        "details": {
            "industry": industry,
            "total_items": len(checklist_items),
            "required_items": len(documents_pending),
            "categories": list(set(item.category for item in checklist_items)),
        },
    }
    updated_state["audit_log"].append(audit_entry)

    # Also persist to state manager
    await state_manager.append_audit_log(
        vendor_id=vendor_id,
        agent="Orchestrator",
        action=f"Generated {len(checklist_items)}-item compliance checklist",
        reason=f"Vendor onboarding initiated for {vendor_name} ({industry})",
        details=audit_entry["details"],
    )

    logger.info(f"Orchestrator complete — workflow status: ACTIVE, step: 2")
    return updated_state


async def check_stall(state: dict[str, Any]) -> dict[str, Any]:
    """
    Stall detection logic — called by the Orchestrator on schedule.

    Checks if the workflow has been stuck (no progress) for too long.
    Implements the 24-hour auto-escalation rule.
    """
    vendor_id = state.get("vendor_id", "")
    workflow_status = state.get("workflow_status", "")

    if workflow_status in [WorkflowStatus.COMPLETE.value, WorkflowStatus.HALTED.value]:
        return state

    # Check last audit log timestamp
    audit_log = state.get("audit_log", [])
    if not audit_log:
        return state

    last_entry = audit_log[-1]
    last_timestamp = datetime.fromisoformat(last_entry["timestamp"])
    hours_since_last_action = (datetime.utcnow() - last_timestamp).total_seconds() / 3600

    if hours_since_last_action > 24:
        # Auto-escalate: stalled for more than 24 hours
        state["workflow_status"] = WorkflowStatus.STALLED.value
        current_level = state.get("escalation_level", 0)

        if current_level < EscalationLevel.HUMAN.value:
            state["escalation_level"] = current_level + 1

        stall_audit = {
            "timestamp": datetime.utcnow().isoformat(),
            "agent": "Orchestrator",
            "action": f"Stall detected — {hours_since_last_action:.1f} hours since last activity",
            "reason": "Auto-escalation triggered by 24-hour inactivity rule",
            "details": {"hours_stalled": round(hours_since_last_action, 1)},
        }
        state["audit_log"].append(stall_audit)

        logger.warning(f"Stall detected for vendor {vendor_id}: {hours_since_last_action:.1f}h")

    return state


def _get_fallback_checklist(industry: str) -> list[ChecklistItem]:
    """
    Fallback checklist if LLM fails — ensures pipeline never stops.
    Returns a minimal, industry-appropriate checklist.
    """
    base_items = [
        ChecklistItem(
            category="Legal",
            document_name="Certificate of Incorporation",
            description="MCA21 registered company proof",
            required=True,
        ),
        ChecklistItem(
            category="Financial",
            document_name="GST Registration Certificate",
            description="Active GSTN registration",
            required=True,
        ),
        ChecklistItem(
            category="Financial",
            document_name="PAN Card (Company)",
            description="Permanent Account Number — tax identity",
            required=True,
        ),
        ChecklistItem(
            category="Legal",
            document_name="Board Resolution / Authorization Letter",
            description="Authorized signatory confirmation",
            required=True,
        ),
        ChecklistItem(
            category="Quality",
            document_name="ISO 9001:2015 Certificate",
            description="Quality management system certification",
            required=True,
        ),
        ChecklistItem(
            category="Financial",
            document_name="Bank Account Verification Letter",
            description="Bank details confirmation on letterhead",
            required=True,
        ),
    ]

    # Add industry-specific items
    if industry.lower() in ["medtech", "pharma", "pharmaceutical", "healthcare"]:
        base_items.extend([
            ChecklistItem(
                category="Regulatory",
                document_name="CDSCO Manufacturing Licence",
                description="Medical device / drug manufacturing licence",
                required=True,
            ),
            ChecklistItem(
                category="Regulatory",
                document_name="Drug Licence (Form 20/21)",
                description="State drug licence for sale/distribution",
                required=True,
            ),
            ChecklistItem(
                category="Quality",
                document_name="ISO 13485 Certificate",
                description="Medical device quality management system",
                required=True,
            ),
        ])
    elif industry.lower() in ["it", "technology", "software"]:
        base_items.extend([
            ChecklistItem(
                category="Regulatory",
                document_name="STPI / SEZ Registration",
                description="Software Technology Parks registration if applicable",
                required=False,
            ),
            ChecklistItem(
                category="Quality",
                document_name="ISO 27001 Certificate",
                description="Information security management",
                required=True,
            ),
        ])

    return base_items
