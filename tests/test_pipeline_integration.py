# ============================================================================
# Tests — Full Pipeline Integration
# ============================================================================

import pytest
from unittest.mock import AsyncMock, patch


class TestFullPipelineIntegration:
    """Test the complete LangGraph DAG execution end-to-end."""

    @patch("backend.agents.verifier.extract_fields_from_pdf", new_callable=AsyncMock)
    @patch("backend.agents.verifier.lookup_mca21_by_name", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.monitor_agent.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.orchestrator.call_llm_json", new_callable=AsyncMock)
    @patch("backend.agents.collector.call_llm", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.call_llm_json", new_callable=AsyncMock)
    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_happy_path_completes(
        self, mock_audit_llm, mock_risk_llm, mock_collector_llm,
        mock_orch_llm, mock_monitor_sanctions, mock_risk_sanctions,
        mock_mca, mock_pdf
    ):
        """Full pipeline from orchestrator to audit agent completes successfully."""
        # Mock LLM responses
        mock_orch_llm.return_value = {
            "checklist": [
                {"category": "Legal", "document_name": "Certificate of Incorporation", "description": "MCA21", "required": True},
            ]
        }
        mock_collector_llm.return_value = "Reminder sent."
        mock_risk_llm.return_value = {
            "risk_score": "Low",
            "rationale": "Clean vendor.",
            "risk_factors": [],
            "recommended_actions": [],
        }
        mock_audit_llm.return_value = "Audit complete."
        mock_risk_sanctions.return_value = {"is_sanctioned": False, "matches": [], "total_matches": 0}
        mock_monitor_sanctions.return_value = {"is_sanctioned": False, "matches": [], "total_matches": 0}
        
        mock_pdf.return_value = {"status": "success", "extracted_fields": {}}
        mock_mca.return_value = {"api_status": "success", "response": {"registration_status": "Active"}}

        from backend.graph.nexus_graph import compile_nexus_graph

        workflow = compile_nexus_graph()

        initial_state = {
            "vendor_id": "pipeline-test-001",
            "vendor_name": "PipelineCorp",
            "industry": "IT",
            "contact_email": "test@pipeline.com",
            "checklist": [],
            "documents_submitted": {
                "Certificate of Incorporation": {"file_path": "path.pdf"}
            },
            "documents_pending": [],
            "verification_results": {},
            "fraud_flags": [],
            "risk_score": None,
            "risk_rationale": "",
            "audit_log": [],
            "workflow_status": "pending",
            "exceptions": [],
            "current_step": 1,
            "escalation_level": 0,
        }

        result = await workflow.ainvoke(initial_state)

        # Pipeline should reach completion
        assert result["workflow_status"] == "complete"
        assert result["risk_score"] in ("Low", "Medium", "High")
        assert len(result["audit_log"]) >= 4  # At least 4 agents logged
        assert result["current_step"] == 13  # Audit agent step

    @patch("backend.agents.verifier.extract_fields_from_pdf", new_callable=AsyncMock)
    @patch("backend.agents.verifier.lookup_mca21_by_name", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.check_sanctions", new_callable=AsyncMock)
    @patch("backend.agents.orchestrator.call_llm_json", new_callable=AsyncMock)
    @patch("backend.agents.collector.call_llm", new_callable=AsyncMock)
    @patch("backend.agents.risk_scorer.call_llm_json", new_callable=AsyncMock)
    @patch("backend.agents.audit_agent.call_llm", new_callable=AsyncMock)
    async def test_sanction_hit_halts_pipeline(
        self, mock_audit_llm, mock_risk_llm, mock_collector_llm,
        mock_orch_llm, mock_sanctions, mock_mca, mock_pdf
    ):
        """Sanctioned entity causes pipeline to halt at risk scorer."""
        mock_orch_llm.return_value = {
            "checklist": [
                {"category": "Legal", "document_name": "Certificate of Incorporation", "description": "MCA21", "required": True},
            ]
        }
        mock_collector_llm.return_value = "Reminder."
        mock_risk_llm.return_value = {
            "risk_score": "High",
            "rationale": "Sanctioned.",
            "risk_factors": ["sanction"],
            "recommended_actions": ["Reject"],
        }
        mock_audit_llm.return_value = "Halted."
        mock_sanctions.return_value = {
            "is_sanctioned": True,
            "matches": [{"entity_name": "Bad Co", "reason": "OFAC", "source_list": "OFAC"}],
            "total_matches": 1,
        }
        
        mock_pdf.return_value = {"status": "success", "extracted_fields": {}}
        mock_mca.return_value = {"api_status": "success", "response": {"registration_status": "Active"}}

        from backend.graph.nexus_graph import compile_nexus_graph

        workflow = compile_nexus_graph()

        initial_state = {
            "vendor_id": "sanction-test-001",
            "vendor_name": "BadCorp",
            "industry": "IT",
            "contact_email": "bad@corp.com",
            "checklist": [],
            "documents_submitted": {
                "Certificate of Incorporation": {"file_path": "path.pdf"}
            },
            "documents_pending": [],
            "verification_results": {},
            "fraud_flags": [],
            "risk_score": None,
            "risk_rationale": "",
            "audit_log": [],
            "workflow_status": "pending",
            "exceptions": [],
            "current_step": 1,
            "escalation_level": 0,
        }

        result = await workflow.ainvoke(initial_state)

        # Pipeline should halt
        assert result["workflow_status"] == "halted"
        assert result["escalation_level"] == 3
        assert any(f.get("flag_type") == "sanctioned_entity" for f in result.get("fraud_flags", []))
