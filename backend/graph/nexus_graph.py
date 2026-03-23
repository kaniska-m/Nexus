# ============================================================================
# Nexus — LangGraph DAG (Directed Acyclic Graph)
# Serves: Core workflow engine — the complete multi-agent pipeline.
# Defines the stateful DAG with all 6 agent nodes, conditional edges,
# error recovery branches, and fraud halt logic.
#
# DAG Flow:
#   Orchestrator → Collector → Verifier → Risk Scorer → Audit Agent → Output
#
# Conditional Branches:
#   - Missing document → Collector retries 2x → Orchestrator escalates
#   - Failed verification → Verifier flags → Collector re-requests
#   - Fraud signal → Immediate halt → Escalate to compliance officer
#   - Supplier stall 24hrs → Auto-escalate to senior contact
# ============================================================================

from __future__ import annotations

import logging
from typing import Any, Literal

from langgraph.graph import END, StateGraph

from backend.agents.audit_agent import run_audit_agent
from backend.agents.collector import run_collector
from backend.agents.monitor_agent import run_monitor
from backend.agents.orchestrator import run_orchestrator
from backend.agents.risk_scorer import run_risk_scorer
from backend.agents.verifier import run_verifier

logger = logging.getLogger(__name__)


# ── State Type Definition for LangGraph ────────────────────────────────────
# LangGraph uses TypedDict / dict for state. We use a plain dict that
# mirrors VendorState fields for maximum compatibility.

NexusState = dict[str, Any]


# ── Conditional Edge Functions ─────────────────────────────────────────────

def should_proceed_to_verification(state: NexusState) -> Literal["verifier", "collector_retry", "escalate"]:
    """
    After Collector: decide whether to proceed to verification,
    retry collection, or escalate.
    """
    documents_pending = state.get("documents_pending", [])
    documents_submitted = state.get("documents_submitted", {})
    checklist = state.get("checklist", [])

    # If all required docs are submitted → proceed to verification
    required_docs = [
        item.get("document_name")
        for item in checklist
        if item.get("required", True)
    ]
    submitted_names = set(documents_submitted.keys())
    all_submitted = all(doc in submitted_names for doc in required_docs)

    if all_submitted or len(documents_submitted) > 0:
        # Proceed with what we have (for demo purposes, accept partial)
        return "verifier"

    # Check retry count
    max_retry_exceeded = any(
        item.get("retry_count", 0) >= item.get("max_retries", 2)
        for item in checklist
        if item.get("required", True) and item.get("document_name") not in submitted_names
    )

    if max_retry_exceeded:
        return "escalate"

    # Still have retries left
    return "collector_retry"


def should_proceed_after_verification(state: NexusState) -> Literal["risk_scorer", "collector_resubmit", "halt"]:
    """
    After Verifier: decide whether to proceed to risk scoring,
    request re-submission, or halt on fraud.
    """
    fraud_flags = state.get("fraud_flags", [])
    workflow_status = state.get("workflow_status", "")

    # Fraud signal → immediate halt
    if workflow_status == "halted":
        return "halt"

    critical_fraud = any(
        f.get("severity") == "critical" for f in fraud_flags
    )
    if critical_fraud:
        return "halt"

    # Check for failed verifications that need re-submission
    verification_results = state.get("verification_results", {})
    failed_docs = [
        name for name, result in verification_results.items()
        if isinstance(result, dict) and result.get("status") in ["failed", "expired"]
    ]

    if failed_docs and state.get("escalation_level", 0) < 2:
        return "collector_resubmit"

    # All clear → proceed to risk scoring
    return "risk_scorer"


def should_proceed_after_risk(state: NexusState) -> Literal["audit_agent", "halt"]:
    """
    After Risk Scorer: proceed to audit or halt if sanction match found.
    """
    workflow_status = state.get("workflow_status", "")

    if workflow_status == "halted":
        return "halt"

    return "audit_agent"


# ── Escalation Node ───────────────────────────────────────────────────────

async def escalate_node(state: NexusState) -> NexusState:
    """Handle escalation — surface to human review."""
    from datetime import datetime

    state["workflow_status"] = "escalated"
    state["escalation_level"] = 3  # HUMAN level

    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent": "Orchestrator",
        "action": "Workflow escalated to human compliance officer",
        "reason": "Automatic escalation due to unresolved issues",
        "details": {
            "fraud_flags": len(state.get("fraud_flags", [])),
            "pending_docs": len(state.get("documents_pending", [])),
        },
    }
    state.setdefault("audit_log", []).append(audit_entry)

    logger.warning(f"ESCALATED: Vendor {state.get('vendor_name', 'unknown')} requires human review")
    return state


async def halt_node(state: NexusState) -> NexusState:
    """Handle workflow halt — fraud or critical issue detected."""
    from datetime import datetime

    state["workflow_status"] = "halted"
    state["escalation_level"] = 3

    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent": "Orchestrator",
        "action": "WORKFLOW HALTED — Critical issue detected",
        "reason": "Fraud signal or sanction match requires immediate human review",
        "details": {
            "fraud_flags": state.get("fraud_flags", []),
            "risk_score": state.get("risk_score", "Unknown"),
        },
    }
    state.setdefault("audit_log", []).append(audit_entry)

    logger.critical(f"HALTED: Vendor {state.get('vendor_name', 'unknown')} — fraud/sanction")
    return state


# ── Build the LangGraph DAG ───────────────────────────────────────────────

def build_nexus_graph() -> StateGraph:
    """
    Constructs the complete Nexus multi-agent workflow graph.

    Nodes:
        1. orchestrator — generates checklist, initializes state
        2. collector — tracks documents, sends reminders
        3. verifier — verifies docs against APIs, detects fraud
        4. risk_scorer — scores risk, checks sanctions
        5. audit_agent — compiles trail, generates report
        6. escalate — surfaces to human (error branch)
        7. halt — stops workflow (fraud branch)

    Edges (with conditional branches):
        orchestrator → collector
        collector → verifier | collector_retry | escalate
        verifier → risk_scorer | collector_resubmit | halt
        risk_scorer → audit_agent | halt
        audit_agent → END
        escalate → END
        halt → END
    """

    graph = StateGraph(dict)

    # ── Add Nodes ─────────────────────────────────────────────────────

    graph.add_node("orchestrator", run_orchestrator)
    graph.add_node("collector", run_collector)
    graph.add_node("verifier", run_verifier)
    graph.add_node("risk_scorer", run_risk_scorer)
    graph.add_node("audit_agent", run_audit_agent)
    graph.add_node("escalate", escalate_node)
    graph.add_node("halt", halt_node)

    # ── Set Entry Point ───────────────────────────────────────────────

    graph.set_entry_point("orchestrator")

    # ── Add Edges ─────────────────────────────────────────────────────

    # Orchestrator always flows to Collector
    graph.add_edge("orchestrator", "collector")

    # Collector → conditional branch
    graph.add_conditional_edges(
        "collector",
        should_proceed_to_verification,
        {
            "verifier": "verifier",
            "collector_retry": "collector",  # retry loop
            "escalate": "escalate",
        },
    )

    # Verifier → conditional branch
    graph.add_conditional_edges(
        "verifier",
        should_proceed_after_verification,
        {
            "risk_scorer": "risk_scorer",
            "collector_resubmit": "collector",  # re-request docs
            "halt": "halt",
        },
    )

    # Risk Scorer → conditional branch
    graph.add_conditional_edges(
        "risk_scorer",
        should_proceed_after_risk,
        {
            "audit_agent": "audit_agent",
            "halt": "halt",
        },
    )

    # Terminal nodes
    graph.add_edge("audit_agent", END)
    graph.add_edge("escalate", END)
    graph.add_edge("halt", END)

    return graph


def compile_nexus_graph():
    """
    Compile the graph into an executable workflow.
    Returns a compiled graph that can be invoked with state.
    """
    graph = build_nexus_graph()
    compiled = graph.compile()
    logger.info("Nexus DAG compiled successfully — 7 nodes, conditional edges active")
    return compiled


# ── Singleton compiled graph ──────────────────────────────────────────────

nexus_workflow = None


def get_workflow():
    """Get or create the compiled workflow (lazy initialization)."""
    global nexus_workflow
    if nexus_workflow is None:
        nexus_workflow = compile_nexus_graph()
    return nexus_workflow
