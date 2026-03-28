# ============================================================================
# Tests — NexusStateManager
# ============================================================================

import asyncio
import pytest

from backend.models.vendor import (
    EscalationLevel,
    VendorState,
    WorkflowStatus,
)
from backend.utils.state_manager import NexusStateManager


@pytest.fixture
def sm():
    return NexusStateManager()


def _make(vid="v1", name="Corp"):
    return VendorState(vendor_id=vid, vendor_name=name, industry="IT")


class TestStateManagerCRUD:
    """Test basic CRUD operations."""

    async def test_create_and_get(self, sm):
        vs = _make("v1", "TestCorp")
        await sm.create_state(vs)
        got = await sm.get_state("v1")
        assert got is not None
        assert got.vendor_name == "TestCorp"

    async def test_get_nonexistent(self, sm):
        got = await sm.get_state("nope")
        assert got is None

    async def test_get_all_states(self, sm):
        await sm.create_state(_make("v1", "A"))
        await sm.create_state(_make("v2", "B"))
        all_states = await sm.get_all_states()
        assert len(all_states) == 2

    async def test_update_state(self, sm):
        await sm.create_state(_make("v1", "Original"))
        updated = await sm.update_state("v1", vendor_name="Updated")
        assert updated.vendor_name == "Updated"

    async def test_update_nonexistent(self, sm):
        result = await sm.update_state("nope", vendor_name="X")
        assert result is None

    async def test_delete_state(self, sm):
        await sm.create_state(_make("v1"))
        assert await sm.delete_state("v1") is True
        assert await sm.get_state("v1") is None

    async def test_delete_nonexistent(self, sm):
        assert await sm.delete_state("nope") is False


class TestStateManagerAuditLog:
    """Test audit log operations."""

    async def test_append_audit_log(self, sm):
        await sm.create_state(_make("v1"))
        await sm.append_audit_log("v1", agent="Test", action="did thing")
        state = await sm.get_state("v1")
        assert len(state.audit_log) == 1
        assert state.audit_log[0].agent == "Test"

    async def test_append_audit_log_nonexistent(self, sm):
        # Should not raise, just log error silently
        await sm.append_audit_log("nope", agent="Test", action="x")

    async def test_multiple_audit_entries(self, sm):
        await sm.create_state(_make("v1"))
        for i in range(5):
            await sm.append_audit_log("v1", agent=f"Agent{i}", action=f"action{i}")
        state = await sm.get_state("v1")
        assert len(state.audit_log) == 5


class TestStateManagerFraudFlags:
    """Test fraud flag operations and auto-halt."""

    async def test_add_fraud_flag_non_critical(self, sm):
        await sm.create_state(_make("v1"))
        await sm.add_fraud_flag(
            "v1", doc_name="GST", flag_type="mismatch",
            description="Numbers don't match", severity="high",
        )
        state = await sm.get_state("v1")
        assert len(state.fraud_flags) == 1
        # Non-critical does NOT halt
        assert state.workflow_status != "halted"

    async def test_add_fraud_flag_critical_auto_halts(self, sm):
        await sm.create_state(_make("v1"))
        await sm.add_fraud_flag(
            "v1", doc_name="MCA", flag_type="struck_off",
            description="Company struck off", severity="critical",
        )
        state = await sm.get_state("v1")
        assert len(state.fraud_flags) == 1
        # Critical fraud → auto-halt
        assert state.workflow_status == "halted"
        assert state.escalation_level == 3  # HUMAN


class TestStateManagerEscalation:
    """Test escalation and workflow control."""

    async def test_escalate(self, sm):
        await sm.create_state(_make("v1"))
        await sm.escalate("v1", EscalationLevel.REROUTE, "Too many retries")
        state = await sm.get_state("v1")
        assert state.escalation_level == 2

    async def test_escalate_to_human(self, sm):
        await sm.create_state(_make("v1"))
        await sm.escalate("v1", EscalationLevel.HUMAN, "Unresolved fraud")
        state = await sm.get_state("v1")
        assert state.escalation_level == 3
        assert state.workflow_status == "escalated"

    async def test_advance_step(self, sm):
        await sm.create_state(_make("v1"))
        step = await sm.advance_step("v1")
        assert step == 1  # 0 → 1
        step = await sm.advance_step("v1")
        assert step == 2

    async def test_advance_step_nonexistent(self, sm):
        step = await sm.advance_step("nope")
        assert step == -1

    async def test_update_workflow_status(self, sm):
        await sm.create_state(_make("v1"))
        await sm.update_workflow_status("v1", WorkflowStatus.COMPLETE)
        state = await sm.get_state("v1")
        assert state.workflow_status == "complete"


class TestStateManagerConcurrency:
    """Test thread-safety under concurrent access."""

    async def test_concurrent_updates(self, sm):
        """Multiple concurrent updates should not corrupt state."""
        await sm.create_state(_make("v1"))

        async def bump_step():
            await sm.advance_step("v1")

        # Run 10 concurrent step bumps
        await asyncio.gather(*[bump_step() for _ in range(10)])

        state = await sm.get_state("v1")
        assert state.current_step == 10

    async def test_concurrent_audit_logs(self, sm):
        """Multiple concurrent audit log appends should all succeed."""
        await sm.create_state(_make("v1"))

        async def add_log(i: int):
            await sm.append_audit_log("v1", agent=f"Agent{i}", action=f"act{i}")

        await asyncio.gather(*[add_log(i) for i in range(20)])

        state = await sm.get_state("v1")
        assert len(state.audit_log) == 20
