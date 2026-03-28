# ============================================================================
# Tests — Verifier Agent
# ============================================================================

import pytest
from unittest.mock import AsyncMock, patch

from backend.agents.verifier import run_verifier


class TestRunVerifier:
    """Test the verifier LangGraph node function."""

    async def test_no_docs_empty_results(self):
        """No submitted docs → empty verification results."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "TestCorp",
            "documents_submitted": {},
            "checklist": [],
            "verification_results": {},
            "fraud_flags": [],
            "audit_log": [],
        }
        result = await run_verifier(state)
        assert result["verification_results"] == {}
        assert result["current_step"] == 8

    async def test_mca21_active_company(self):
        """Certificate of Incorporation → MCA21 cross-ref, active company passes."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "MedEquip Solutions Pvt Ltd",
            "documents_submitted": {
                "Certificate of Incorporation": {"file_path": "dummy.txt", "filename": "cert.txt"},
            },
            "checklist": [],
            "verification_results": {},
            "fraud_flags": [],
            "audit_log": [],
        }
        result = await run_verifier(state)
        vr = result["verification_results"]["Certificate of Incorporation"]
        assert vr["api_source"] == "MCA21"
        assert vr["cross_reference_match"] is True
        assert vr["status"] == "verified"

    async def test_mca21_struck_off_raises_fraud(self):
        """Struck-off company → fraud_suspect + critical fraud flag."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "PharmaChem Gujarat",
            "documents_submitted": {
                "Certificate of Incorporation": {"file_path": "dummy.txt"},
            },
            "checklist": [],
            "verification_results": {},
            "fraud_flags": [],
            "audit_log": [],
        }
        result = await run_verifier(state)
        vr = result["verification_results"]["Certificate of Incorporation"]
        assert vr["status"] == "fraud_suspect"
        assert len(result["fraud_flags"]) >= 1
        assert result["fraud_flags"][0]["severity"] == "critical"
        # Critical fraud should halt workflow
        assert result["workflow_status"] == "halted"

    async def test_gstn_active(self):
        """GST doc with known active GST number passes."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "TestCorp",
            "documents_submitted": {
                "GST Registration Certificate": {"file_path": "dummy.txt"},
            },
            "checklist": [],
            "verification_results": {},
            "fraud_flags": [],
            "audit_log": [],
        }
        result = await run_verifier(state)
        vr = result["verification_results"]["GST Registration Certificate"]
        assert vr["api_source"] == "GSTN"

    async def test_cdsco_licence_check(self):
        """CDSCO licence doc triggers CDSCO API check."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "TestCorp",
            "documents_submitted": {
                "CDSCO Manufacturing Licence": {"file_path": "dummy.txt"},
            },
            "checklist": [],
            "verification_results": {},
            "fraud_flags": [],
            "audit_log": [],
        }
        result = await run_verifier(state)
        vr = result["verification_results"]["CDSCO Manufacturing Licence"]
        assert vr["api_source"] == "CDSCO"

    async def test_audit_log_appended(self):
        """Verifier appends audit log entry."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "TestCorp",
            "documents_submitted": {},
            "checklist": [],
            "verification_results": {},
            "fraud_flags": [],
            "audit_log": [],
        }
        result = await run_verifier(state)
        assert len(result["audit_log"]) >= 1
        assert result["audit_log"][-1]["agent"] == "Verifier"

    async def test_multiple_docs_verified(self):
        """Multiple documents are each individually verified."""
        state = {
            "vendor_id": "v1",
            "vendor_name": "MedEquip Solutions Pvt Ltd",
            "documents_submitted": {
                "Certificate of Incorporation": {"file_path": "dummy.txt"},
                "GST Registration Certificate": {"file_path": "dummy.txt"},
            },
            "checklist": [],
            "verification_results": {},
            "fraud_flags": [],
            "audit_log": [],
        }
        result = await run_verifier(state)
        assert len(result["verification_results"]) == 2
        assert "Certificate of Incorporation" in result["verification_results"]
        assert "GST Registration Certificate" in result["verification_results"]
