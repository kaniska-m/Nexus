# ============================================================================
# Nexus — Monitor Routes
# Serves: Monitoring endpoints for vendor health dashboard.
# ============================================================================

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/health-dashboard")
async def get_health_dashboard():
    """Get the vendor health dashboard — all approved vendors with health status."""
    from backend.utils.state_manager import state_manager

    states = await state_manager.get_all_states()

    health_data = []
    for s in states:
        health_data.append({
            "vendor_id": s.vendor_id,
            "vendor_name": s.vendor_name,
            "industry": s.industry,
            "risk_score": str(getattr(s.risk_score, 'value', s.risk_score)) if s.risk_score else None,
            "health_status": str(getattr(s.health_status, 'value', s.health_status)) if s.health_status else "Not Monitored",
            "last_monitored": s.last_monitored.isoformat() if s.last_monitored else None,
            "monitoring_notes": s.monitoring_notes,
            "workflow_status": str(getattr(s.workflow_status, 'value', s.workflow_status)),
        })

    green = sum(1 for h in health_data if h["health_status"] == "Green")
    amber = sum(1 for h in health_data if h["health_status"] == "Amber")
    red = sum(1 for h in health_data if h["health_status"] == "Red")

    return {
        "status": "success",
        "data": {
            "summary": {"green": green, "amber": amber, "red": red, "total": len(health_data)},
            "vendors": health_data,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/{vendor_id}/run-check")
async def run_health_check(vendor_id: str):
    """Trigger a health monitoring check for a specific vendor."""
    from backend.utils.state_manager import state_manager
    from backend.agents.monitor_agent import run_monitor

    state = await state_manager.get_state(vendor_id)
    if not state:
        raise HTTPException(status_code=404, detail="Vendor not found")

    state_dict = state.model_dump()
    for key, value in state_dict.items():
        if hasattr(value, 'value'):
            state_dict[key] = value.value

    result = await run_monitor(state_dict)

    return {
        "status": "success",
        "data": {
            "vendor_id": vendor_id,
            "health_status": result.get("health_status"),
            "monitoring_notes": result.get("monitoring_notes"),
            "last_monitored": result.get("last_monitored"),
        },
        "agent_actions_taken": ["Monitor: Health check completed"],
        "timestamp": datetime.utcnow().isoformat(),
    }
