# ============================================================================
# Nexus — Shared State Manager
# Serves: ALL agents — thread-safe shared state management.
# Every agent reads from and writes to VendorState through this class.
# In-memory storage keyed by vendor_id. Production would use a database.
# ============================================================================

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, Optional

from backend.models.vendor import (
    AuditLogEntry,
    EscalationLevel,
    ExceptionItem,
    FraudFlag,
    VendorState,
    WorkflowStatus,
)

logger = logging.getLogger(__name__)


class NexusStateManager:
    """
    Thread-safe shared state manager for vendor workflows.

    All 6 agents interact with vendor state exclusively through this manager.
    This ensures consistent state transitions and audit logging.
    """

    def __init__(self) -> None:
        self._states: dict[str, VendorState] = {}
        self._lock = asyncio.Lock()

    # ── State CRUD ─────────────────────────────────────────────────────

    async def create_state(self, state: VendorState) -> VendorState:
        """Initialize a new vendor workflow state."""
        async with self._lock:
            self._states[state.vendor_id] = state
            logger.info(f"State created for vendor: {state.vendor_name} ({state.vendor_id})")
            return state

    async def get_state(self, vendor_id: str) -> Optional[VendorState]:
        """Retrieve vendor state by ID."""
        return self._states.get(vendor_id)

    async def get_all_states(self) -> list[VendorState]:
        """Retrieve all vendor states (for dashboard)."""
        return list(self._states.values())

    async def update_state(self, vendor_id: str, **updates: Any) -> Optional[VendorState]:
        """Update specific fields on a vendor state."""
        async with self._lock:
            state = self._states.get(vendor_id)
            if not state:
                logger.warning(f"State not found for vendor_id: {vendor_id}")
                return None

            for key, value in updates.items():
                if hasattr(state, key):
                    setattr(state, key, value)

            state.updated_at = datetime.utcnow()
            self._states[vendor_id] = state
            return state

    async def delete_state(self, vendor_id: str) -> bool:
        """Remove a vendor state (for cleanup)."""
        async with self._lock:
            if vendor_id in self._states:
                del self._states[vendor_id]
                return True
            return False

    # ── Audit Log ──────────────────────────────────────────────────────

    async def append_audit_log(
        self,
        vendor_id: str,
        agent: str,
        action: str,
        reason: str = "",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Append an entry to the audit log.
        RULE: Every agent function must call this before returning.
        """
        async with self._lock:
            state = self._states.get(vendor_id)
            if not state:
                logger.error(f"Cannot append audit log — vendor {vendor_id} not found")
                return

            entry = AuditLogEntry(
                agent=agent,
                action=action,
                reason=reason,
                details=details or {},
            )
            state.audit_log.append(entry)
            state.updated_at = datetime.utcnow()

            logger.info(f"Audit log [{agent}]: {action}")

    # ── Exceptions ─────────────────────────────────────────────────────

    async def add_exception(
        self,
        vendor_id: str,
        exception_type: str,
        description: str,
        agent: str,
        requires_human: bool = False,
    ) -> None:
        """Add an exception item that may need human review."""
        async with self._lock:
            state = self._states.get(vendor_id)
            if not state:
                return

            exception = ExceptionItem(
                exception_type=exception_type,
                description=description,
                agent=agent,
                requires_human=requires_human,
            )
            state.exceptions.append(exception)
            state.updated_at = datetime.utcnow()

            logger.warning(f"Exception added [{agent}]: {exception_type} — {description}")

    # ── Fraud Flags ────────────────────────────────────────────────────

    async def add_fraud_flag(
        self,
        vendor_id: str,
        doc_name: str,
        flag_type: str,
        description: str,
        severity: str = "high",
    ) -> None:
        """
        Add a fraud flag. Triggers immediate workflow halt if severity is critical.
        """
        async with self._lock:
            state = self._states.get(vendor_id)
            if not state:
                return

            flag = FraudFlag(
                doc_name=doc_name,
                flag_type=flag_type,
                description=description,
                severity=severity,
            )
            state.fraud_flags.append(flag)

            # Critical fraud → immediate halt
            if severity == "critical":
                state.workflow_status = WorkflowStatus.HALTED
                state.escalation_level = EscalationLevel.HUMAN
                logger.critical(
                    f"FRAUD HALT — Vendor {vendor_id}: {flag_type} on {doc_name}"
                )

            state.updated_at = datetime.utcnow()

    # ── Workflow Control ───────────────────────────────────────────────

    async def update_workflow_status(
        self, vendor_id: str, status: WorkflowStatus
    ) -> None:
        """Update the workflow status."""
        await self.update_state(vendor_id, workflow_status=status)
        logger.info(f"Workflow status → {status.value} for vendor {vendor_id}")

    async def escalate(
        self, vendor_id: str, level: EscalationLevel, reason: str
    ) -> None:
        """Escalate the workflow to a higher level."""
        async with self._lock:
            state = self._states.get(vendor_id)
            if not state:
                return

            state.escalation_level = level
            if level == EscalationLevel.HUMAN:
                state.workflow_status = WorkflowStatus.ESCALATED

            state.updated_at = datetime.utcnow()

        await self.append_audit_log(
            vendor_id=vendor_id,
            agent="Orchestrator",
            action=f"Escalated to level {level.value}",
            reason=reason,
        )

    async def advance_step(self, vendor_id: str) -> int:
        """Advance the workflow to the next step. Returns new step number."""
        async with self._lock:
            state = self._states.get(vendor_id)
            if not state:
                return -1
            state.current_step += 1
            state.updated_at = datetime.utcnow()
            return state.current_step


# ── Singleton Instance ─────────────────────────────────────────────────────

state_manager = NexusStateManager()
