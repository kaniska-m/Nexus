# ============================================================================
# Nexus — Buyer Dashboard Routes
# Serves: Buyer-side API endpoints for the procurement team dashboard.
# ============================================================================

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/dashboard")
async def get_buyer_dashboard():
    """Get the buyer dashboard summary — all active vendors with status."""
    from backend.utils.state_manager import state_manager

    states = await state_manager.get_all_states()

    active_count = sum(1 for s in states if str(getattr(s.workflow_status, 'value', s.workflow_status)) == "active")
    complete_count = sum(1 for s in states if str(getattr(s.workflow_status, 'value', s.workflow_status)) == "complete")
    escalated_count = sum(1 for s in states if str(getattr(s.workflow_status, 'value', s.workflow_status)) in ["escalated", "halted"])

    # Calculate time saved (simulated: 6 hours saved per automated vendor)
    time_saved_hours = complete_count * 6 + active_count * 3

    return {
        "status": "success",
        "data": {
            "summary": {
                "total_vendors": len(states),
                "active": active_count,
                "complete": complete_count,
                "escalated": escalated_count,
                "time_saved_hours": time_saved_hours,
            },
            "vendors": [
                {
                    "vendor_id": s.vendor_id,
                    "vendor_name": s.vendor_name,
                    "industry": s.industry,
                    "workflow_status": str(getattr(s.workflow_status, 'value', s.workflow_status)),
                    "risk_score": str(getattr(s.risk_score, 'value', s.risk_score)) if s.risk_score else None,
                    "current_step": s.current_step,
                    "exceptions_count": len(s.exceptions),
                }
                for s in states
            ],
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/exceptions")
async def get_exceptions():
    """Get all flagged exceptions across all vendors."""
    from backend.utils.state_manager import state_manager

    states = await state_manager.get_all_states()
    all_exceptions = []

    for s in states:
        for exc in s.exceptions:
            all_exceptions.append({
                "vendor_id": s.vendor_id,
                "vendor_name": s.vendor_name,
                "exception": exc.model_dump() if hasattr(exc, 'model_dump') else exc,
            })

    return {
        "status": "success",
        "data": {"exceptions": all_exceptions, "total": len(all_exceptions)},
        "timestamp": datetime.utcnow().isoformat(),
    }
