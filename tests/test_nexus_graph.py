# ============================================================================
# Tests — LangGraph DAG Structure & Conditional Edges
# ============================================================================

import pytest
from backend.graph.nexus_graph import (
    build_nexus_graph,
    compile_nexus_graph,
    should_proceed_to_verification,
    should_proceed_after_verification,
    should_proceed_after_risk,
    escalate_node,
    halt_node,
)


class TestBuildNexusGraph:
    """Test graph construction."""

    def test_graph_has_7_nodes(self):
        """Graph should have 7 nodes: 5 agents + escalate + halt."""
        graph = build_nexus_graph()
        node_names = set(graph.nodes.keys())
        expected = {"orchestrator", "collector", "verifier", "risk_scorer", "audit_agent", "escalate", "halt"}
        assert expected == node_names

    def test_graph_entry_point_is_orchestrator(self):
        """Entry point is the orchestrator."""
        compiled = compile_nexus_graph()
        assert "orchestrator" in compiled.builder.nodes

    def test_graph_compiles(self):
        """Graph compiles without error."""
        compiled = compile_nexus_graph()
        assert compiled is not None


class TestConditionalEdgeToVerification:
    """Test should_proceed_to_verification conditional edge."""

    def test_all_docs_submitted_goes_to_verifier(self):
        """All docs submitted → verifier."""
        state = {
            "checklist": [
                {"document_name": "Doc A", "required": True},
            ],
            "documents_submitted": {"Doc A": "path.pdf"},
            "documents_pending": [],
        }
        assert should_proceed_to_verification(state) == "verifier"

    def test_partial_docs_still_goes_to_verifier(self):
        """Some docs submitted (for demo) → verifier."""
        state = {
            "checklist": [
                {"document_name": "Doc A", "required": True},
                {"document_name": "Doc B", "required": True},
            ],
            "documents_submitted": {"Doc A": "path.pdf"},
            "documents_pending": ["Doc B"],
        }
        assert should_proceed_to_verification(state) == "verifier"

    def test_no_docs_retries_available_goes_to_retry(self):
        """No docs + retries available → collector_retry."""
        state = {
            "checklist": [
                {"document_name": "Doc A", "required": True, "retry_count": 0, "max_retries": 2},
            ],
            "documents_submitted": {},
            "documents_pending": ["Doc A"],
        }
        assert should_proceed_to_verification(state) == "collector_retry"

    def test_max_retries_exceeded_escalates(self):
        """No docs + max retries exceeded → escalate."""
        state = {
            "checklist": [
                {"document_name": "Doc A", "required": True, "retry_count": 2, "max_retries": 2},
            ],
            "documents_submitted": {},
            "documents_pending": ["Doc A"],
        }
        assert should_proceed_to_verification(state) == "escalate"


class TestConditionalEdgeAfterVerification:
    """Test should_proceed_after_verification conditional edge."""

    def test_no_fraud_goes_to_risk_scorer(self):
        """No fraud → risk_scorer."""
        state = {
            "fraud_flags": [],
            "workflow_status": "active",
            "verification_results": {},
            "escalation_level": 0,
        }
        assert should_proceed_after_verification(state) == "risk_scorer"

    def test_critical_fraud_halts(self):
        """Critical fraud → halt."""
        state = {
            "fraud_flags": [{"severity": "critical"}],
            "workflow_status": "active",
            "verification_results": {},
            "escalation_level": 0,
        }
        assert should_proceed_after_verification(state) == "halt"

    def test_halted_workflow_halts(self):
        """Already halted workflow → halt."""
        state = {
            "fraud_flags": [],
            "workflow_status": "halted",
            "verification_results": {},
            "escalation_level": 0,
        }
        assert should_proceed_after_verification(state) == "halt"

    def test_failed_docs_resubmit(self):
        """Failed docs with escalation < 2 → collector_resubmit."""
        state = {
            "fraud_flags": [],
            "workflow_status": "active",
            "verification_results": {
                "Doc A": {"status": "failed"},
            },
            "escalation_level": 0,
        }
        assert should_proceed_after_verification(state) == "collector_resubmit"


class TestConditionalEdgeAfterRisk:
    """Test should_proceed_after_risk conditional edge."""

    def test_not_halted_goes_to_audit(self):
        """Non-halted → audit_agent."""
        state = {"workflow_status": "active"}
        assert should_proceed_after_risk(state) == "audit_agent"

    def test_halted_goes_to_halt(self):
        """Halted → halt."""
        state = {"workflow_status": "halted"}
        assert should_proceed_after_risk(state) == "halt"


class TestEscalateNode:
    """Test the escalation node function."""

    async def test_escalate_sets_status(self):
        """Escalation sets workflow_status and escalation_level."""
        state = {
            "vendor_name": "TestCorp",
            "fraud_flags": [],
            "documents_pending": [],
            "audit_log": [],
        }
        result = await escalate_node(state)
        assert result["workflow_status"] == "escalated"
        assert result["escalation_level"] == 3
        assert len(result["audit_log"]) >= 1


class TestHaltNode:
    """Test the halt node function."""

    async def test_halt_sets_status(self):
        """Halt sets workflow_status and escalation_level."""
        state = {
            "vendor_name": "TestCorp",
            "fraud_flags": [{"severity": "critical"}],
            "risk_score": "High",
            "audit_log": [],
        }
        result = await halt_node(state)
        assert result["workflow_status"] == "halted"
        assert result["escalation_level"] == 3
        assert len(result["audit_log"]) >= 1
