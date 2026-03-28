# ============================================================================
# Nexus — Shared Test Fixtures
# Provides mock LLM, mock state, sample vendor data, and helpers
# used across all test files.
# ============================================================================

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ensure backend is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.models.vendor import (
    AuditLogEntry,
    ChecklistItem,
    DocumentStatus,
    EscalationLevel,
    ExceptionItem,
    FraudFlag,
    HealthStatus,
    RiskLevel,
    VendorState,
    WorkflowStatus,
)
from backend.utils.state_manager import NexusStateManager


# ── Fixtures: State Manager ────────────────────────────────────────────────

@pytest.fixture
def fresh_state_manager():
    """Return a brand-new NexusStateManager with no state."""
    return NexusStateManager()


@pytest.fixture
async def seeded_state_manager():
    """Return a NexusStateManager pre-loaded with 2 sample vendors."""
    sm = NexusStateManager()
    await sm.create_state(_make_vendor_state("v-001", "TestCorp", "MedTech"))
    await sm.create_state(_make_vendor_state("v-002", "AlphaTech", "IT"))
    return sm


# ── Fixtures: Sample Vendor States ─────────────────────────────────────────

@pytest.fixture
def sample_vendor_state() -> VendorState:
    """A clean MedTech vendor with basic checklist, no fraud."""
    return _make_vendor_state("test-vendor-001", "MedEquip Solutions", "MedTech")


@pytest.fixture
def sample_vendor_state_dict() -> dict[str, Any]:
    """Same vendor as sample_vendor_state but as a plain dict (for LangGraph)."""
    return {
        "vendor_id": "test-vendor-001",
        "vendor_name": "MedEquip Solutions",
        "industry": "MedTech",
        "contact_email": "test@medequip.in",
        "checklist": [
            {
                "id": "c1",
                "category": "Legal",
                "document_name": "Certificate of Incorporation",
                "description": "MCA21 registered",
                "required": True,
                "status": "pending",
                "retry_count": 0,
                "max_retries": 2,
            },
            {
                "id": "c2",
                "category": "Financial",
                "document_name": "GST Registration Certificate",
                "description": "Active GSTN",
                "required": True,
                "status": "pending",
                "retry_count": 0,
                "max_retries": 2,
            },
            {
                "id": "c3",
                "category": "Regulatory",
                "document_name": "CDSCO Manufacturing Licence",
                "description": "Medical device licence",
                "required": True,
                "status": "pending",
                "retry_count": 0,
                "max_retries": 2,
            },
        ],
        "documents_submitted": {},
        "documents_pending": [
            "Certificate of Incorporation",
            "GST Registration Certificate",
            "CDSCO Manufacturing Licence",
        ],
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


@pytest.fixture
def sample_orchestrator_input() -> dict[str, Any]:
    """Minimal input dict for the orchestrator agent."""
    return {
        "vendor_id": "orch-test-001",
        "vendor_name": "Acme Pharma Ltd",
        "industry": "Pharma",
        "contact_email": "acme@pharma.in",
        "checklist": [],
        "documents_submitted": {},
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


# ── Fixtures: Mock LLM ────────────────────────────────────────────────────

@pytest.fixture
def mock_call_llm():
    """Patch call_llm to return a canned string response."""
    with patch("backend.utils.llm_wrapper.call_llm", new_callable=AsyncMock) as mock:
        mock.return_value = "This is a mock LLM response."
        yield mock


@pytest.fixture
def mock_call_llm_json():
    """Patch call_llm_json to return a canned JSON dict."""
    with patch("backend.utils.llm_wrapper.call_llm_json", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "checklist": [
                {
                    "category": "Legal",
                    "document_name": "Certificate of Incorporation",
                    "description": "MCA21 proof",
                    "required": True,
                },
                {
                    "category": "Financial",
                    "document_name": "GST Registration Certificate",
                    "description": "Active GSTN",
                    "required": True,
                },
            ]
        }
        yield mock


@pytest.fixture
def mock_llm_both(mock_call_llm, mock_call_llm_json):
    """Convenience: patches both call_llm and call_llm_json."""
    return mock_call_llm, mock_call_llm_json


@pytest.fixture
def mock_sanctions_clear():
    """Patch check_sanctions to always return clear."""
    with patch(
        "backend.tools.sanction_checker.check_sanctions", new_callable=AsyncMock
    ) as mock:
        mock.return_value = {
            "source": "Mock",
            "is_sanctioned": False,
            "matches": [],
            "total_matches": 0,
            "lists_scanned": ["Mock"],
            "scan_status": "clear",
        }
        yield mock


@pytest.fixture
def mock_sanctions_flagged():
    """Patch check_sanctions to return a sanctioned entity."""
    with patch(
        "backend.tools.sanction_checker.check_sanctions", new_callable=AsyncMock
    ) as mock:
        mock.return_value = {
            "source": "Mock",
            "is_sanctioned": True,
            "matches": [
                {
                    "entity_name": "Bad Actor Ltd",
                    "reason": "OFAC SDN List",
                    "source_list": "OFAC",
                }
            ],
            "total_matches": 1,
            "lists_scanned": ["OFAC"],
            "scan_status": "flagged",
        }
        yield mock


# ── Helpers ────────────────────────────────────────────────────────────────

def _make_vendor_state(
    vendor_id: str, name: str, industry: str
) -> VendorState:
    return VendorState(
        vendor_id=vendor_id,
        vendor_name=name,
        industry=industry,
        contact_email=f"test@{name.lower().replace(' ', '')}.in",
        workflow_status=WorkflowStatus.PENDING,
        checklist=[
            ChecklistItem(
                category="Legal",
                document_name="Certificate of Incorporation",
                description="MCA21 registered",
                required=True,
            ),
            ChecklistItem(
                category="Financial",
                document_name="GST Registration Certificate",
                description="Active GSTN",
                required=True,
            ),
        ],
    )
