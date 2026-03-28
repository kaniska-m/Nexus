# ============================================================================
# Tests — Pydantic V2 Models
# ============================================================================

import uuid
import pytest
from datetime import datetime

from backend.models.vendor import (
    AuditLogEntry,
    ChecklistItem,
    DocumentStatus,
    EscalationLevel,
    ExceptionItem,
    FraudFlag,
    HealthStatus,
    NexusResponse,
    RiskLevel,
    VendorRequest,
    VendorState,
    WorkflowStatus,
    VerificationResult,
)


class TestEnums:
    """Test all enum definitions."""

    def test_workflow_status_values(self):
        assert WorkflowStatus.PENDING.value == "pending"
        assert WorkflowStatus.ACTIVE.value == "active"
        assert WorkflowStatus.STALLED.value == "stalled"
        assert WorkflowStatus.ESCALATED.value == "escalated"
        assert WorkflowStatus.COMPLETE.value == "complete"
        assert WorkflowStatus.HALTED.value == "halted"

    def test_document_status_values(self):
        assert DocumentStatus.PENDING.value == "pending"
        assert DocumentStatus.SUBMITTED.value == "submitted"
        assert DocumentStatus.VERIFIED.value == "verified"
        assert DocumentStatus.FAILED.value == "failed"
        assert DocumentStatus.EXPIRED.value == "expired"
        assert DocumentStatus.FRAUD_SUSPECT.value == "fraud_suspect"
        assert DocumentStatus.RE_REQUESTED.value == "re_requested"

    def test_risk_level_values(self):
        assert RiskLevel.LOW.value == "Low"
        assert RiskLevel.MEDIUM.value == "Medium"
        assert RiskLevel.HIGH.value == "High"

    def test_health_status_values(self):
        assert HealthStatus.GREEN.value == "Green"
        assert HealthStatus.AMBER.value == "Amber"
        assert HealthStatus.RED.value == "Red"

    def test_escalation_level_values(self):
        assert EscalationLevel.NONE.value == 0
        assert EscalationLevel.AUTO_RETRY.value == 1
        assert EscalationLevel.REROUTE.value == 2
        assert EscalationLevel.HUMAN.value == 3


class TestChecklistItem:
    """Test ChecklistItem model."""

    def test_creation_with_defaults(self):
        item = ChecklistItem(
            category="Legal",
            document_name="Certificate of Incorporation",
        )
        assert item.category == "Legal"
        assert item.document_name == "Certificate of Incorporation"
        assert item.required is True
        assert item.status == DocumentStatus.PENDING
        assert item.retry_count == 0
        assert item.max_retries == 2
        assert item.id  # auto-generated

    def test_creation_with_all_fields(self):
        item = ChecklistItem(
            category="Regulatory",
            document_name="CDSCO Licence",
            description="Medical device licence",
            required=False,
            status=DocumentStatus.VERIFIED,
            retry_count=1,
            max_retries=3,
        )
        assert item.required is False
        assert item.retry_count == 1

    def test_model_dump(self):
        item = ChecklistItem(
            category="Financial",
            document_name="GST Certificate",
        )
        data = item.model_dump()
        assert isinstance(data, dict)
        assert "category" in data
        assert "document_name" in data
        assert "status" in data


class TestFraudFlag:
    """Test FraudFlag model."""

    def test_creation(self):
        flag = FraudFlag(
            doc_name="GST Certificate",
            flag_type="cert_mismatch",
            description="Certificate number does not match GSTN records",
            severity="critical",
        )
        assert flag.severity == "critical"
        assert flag.flag_type == "cert_mismatch"
        assert isinstance(flag.detected_at, datetime)


class TestVendorState:
    """Test the core VendorState model."""

    def test_defaults(self):
        state = VendorState()
        assert state.vendor_id  # auto-generated UUID
        assert state.vendor_name == ""
        assert state.workflow_status == "pending"  # use_enum_values=True
        assert state.current_step == 0
        assert state.checklist == []
        assert state.fraud_flags == []
        assert state.audit_log == []

    def test_enum_values_config(self):
        """use_enum_values=True serializes enums as their string values."""
        state = VendorState(
            workflow_status=WorkflowStatus.ACTIVE,
            risk_score=RiskLevel.HIGH,
            health_status=HealthStatus.RED,
        )
        # With use_enum_values=True, enums are stored as values
        assert state.workflow_status == "active"
        assert state.risk_score == "High"
        assert state.health_status == "Red"

    def test_model_dump_serializable(self):
        """model_dump produces a JSON-serializable dict."""
        state = VendorState(
            vendor_name="Test Corp",
            industry="IT",
            workflow_status=WorkflowStatus.COMPLETE,
        )
        data = state.model_dump(mode="json")
        assert isinstance(data, dict)
        assert data["vendor_name"] == "Test Corp"
        assert data["workflow_status"] == "complete"

    def test_checklist_items_in_state(self):
        """ChecklistItems can be added to VendorState."""
        items = [
            ChecklistItem(category="Legal", document_name="Doc1"),
            ChecklistItem(category="Financial", document_name="Doc2"),
        ]
        state = VendorState(checklist=items)
        assert len(state.checklist) == 2

    def test_timestamps_auto_set(self):
        """created_at and updated_at are automatically set."""
        state = VendorState()
        assert isinstance(state.created_at, datetime)
        assert isinstance(state.updated_at, datetime)


class TestVendorRequest:
    """Test VendorRequest model."""

    def test_required_fields(self):
        req = VendorRequest(
            vendor_name="Test Corp",
            industry="MedTech",
        )
        assert req.vendor_name == "Test Corp"
        assert req.urgency == "normal"
        assert req.contact_email == ""

    def test_all_fields(self):
        req = VendorRequest(
            vendor_name="Acme",
            industry="Pharma",
            contact_email="test@acme.com",
            urgency="critical",
            notes="Urgent onboarding",
        )
        assert req.urgency == "critical"
        assert req.notes == "Urgent onboarding"


class TestNexusResponse:
    """Test API response model."""

    def test_default_response(self):
        resp = NexusResponse()
        assert resp.status == "success"
        assert resp.data is None
        assert resp.agent_actions_taken == []
        assert isinstance(resp.timestamp, datetime)

    def test_with_data(self):
        resp = NexusResponse(
            status="success",
            data={"vendor_id": "123"},
            agent_actions_taken=["Orchestrator: Generated checklist"],
            message="Done",
        )
        assert resp.data["vendor_id"] == "123"
        assert len(resp.agent_actions_taken) == 1


class TestVerificationResult:
    """Test VerificationResult model."""

    def test_creation(self):
        vr = VerificationResult(
            doc_name="GST Certificate",
            status=DocumentStatus.VERIFIED,
            reason="GSTN API confirmed active",
            api_source="GSTN",
            cross_reference_match=True,
        )
        assert vr.status == DocumentStatus.VERIFIED
        assert vr.cross_reference_match is True
        assert vr.expiry_date is None


class TestAuditLogEntry:
    """Test AuditLogEntry model."""

    def test_creation(self):
        entry = AuditLogEntry(
            agent="Orchestrator",
            action="Generated checklist",
            reason="New vendor onboarding",
            details={"items": 6},
        )
        assert entry.agent == "Orchestrator"
        assert isinstance(entry.timestamp, datetime)
        assert entry.details["items"] == 6
