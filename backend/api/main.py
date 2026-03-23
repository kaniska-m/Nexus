# ============================================================================
# Nexus — FastAPI Application Server
# Serves: Main API entry point for the Nexus multi-agent system.
# Provides CORS, health check, vendor onboarding, and status endpoints.
# All API endpoints return {status, data, agent_actions_taken, timestamp}.
# ============================================================================

from __future__ import annotations

import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s | %(name)-20s | %(levelname)-8s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan (startup/shutdown) ───────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("🚀 Nexus — Multi-Agent Vendor Verification System starting...")
    logger.info(f"   LLM Heavy Model: {os.getenv('LLM_MODEL_HEAVY', 'llama-3.1-8b-instant')}")
    logger.info(f"   LLM Light Model: {os.getenv('LLM_MODEL_LIGHT', 'llama-3.1-8b-instant')}")
    logger.info(f"   Environment: {os.getenv('APP_ENV', 'development')}")

    # Seed initial vendors for Hackathon Demo
    try:
        from backend.utils.state_manager import state_manager
        from backend.models.vendor import VendorState
        
        v1 = VendorState(
            vendor_id="demo-medtech-001",
            vendor_name="Global Health Supplies Ltd",
            industry="MedTech",
            workflow_status="active",
            current_step=4,
            documents_pending=["CDSCO Manufacturing Licence"],
            checklist=[
                {"category": "Legal", "document_name": "Certificate of Incorporation", "required": True, "status": "verified"},
                {"category": "Financial", "document_name": "GST Registration Certificate", "required": True, "status": "verified"},
            ],
            risk_score="Low",
            risk_rationale="Initial checks passed cleanly.",
        )
        await state_manager.create_state(v1)
        
        v2 = VendorState(
            vendor_id="demo-it-002",
            vendor_name="TechFlow Systems",
            industry="IT",
            workflow_status="escalated",
            current_step=5,
            fraud_flags=[{"agent": "Verifier", "flag_type": "Data Mismatch", "severity": "high", "description": "GST number inactive"}],
            exceptions=[{"step": "Verification", "description": "Failed to verify IT service credentials", "severity": "high"}],
            risk_score="High",
            risk_rationale="Significant mismatches in submitted documents vs registry.",
        )
        await state_manager.create_state(v2)
        logger.info("   ✅ Seeded initial demo vendors")
    except Exception as e:
        logger.warning(f"   ⚠️ Could not seed vendors: {e}")

    # Pre-compile the graph at startup
    try:
        from backend.graph.nexus_graph import get_workflow
        get_workflow()
        logger.info("   ✅ LangGraph DAG compiled successfully")
    except Exception as e:
        logger.warning(f"   ⚠️ Graph compilation deferred: {e}")

    yield

    logger.info("Nexus shutting down...")


# ── FastAPI App ───────────────────────────────────────────────────────────

app = FastAPI(
    title="Nexus — Vendor Verification API",
    description=(
        "Multi-agent AI system for autonomous cross-boundary vendor verification. "
        "6 specialized agents orchestrated via LangGraph for compliance checking, "
        "document verification, risk scoring, and audit trail generation."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS Middleware ───────────────────────────────────────────────────────

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────

class VendorOnboardRequest(BaseModel):
    """Request body for starting vendor onboarding."""
    vendor_name: str = Field(..., description="Name of the supplier company")
    industry: str = Field(..., description="e.g. MedTech, IT, Finance, Pharma")
    contact_email: str = Field(default="", description="Supplier contact email")
    urgency: str = Field(default="normal", description="normal / urgent / critical")


class NexusAPIResponse(BaseModel):
    """Standard API response format per spec."""
    status: str = "success"
    data: Any = None
    agent_actions_taken: list[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    message: str = ""


# ── Health Check ──────────────────────────────────────────────────────────

@app.get("/health", response_model=NexusAPIResponse)
async def health_check():
    """Health check endpoint — verifies the server is running."""
    return NexusAPIResponse(
        status="healthy",
        data={
            "service": "Nexus Vendor Verification API",
            "version": "1.0.0",
            "agents": [
                "Orchestrator", "Collector", "Verifier",
                "Risk Scorer", "Audit Agent", "Monitor"
            ],
            "llm_provider": "Groq (free tier)",
            "llm_heavy_model": os.getenv("LLM_MODEL_HEAVY", "llama-3.1-8b-instant"),
            "llm_light_model": os.getenv("LLM_MODEL_LIGHT", "llama-3.1-8b-instant"),
        },
        message="Nexus is operational",
    )


# ── Vendor Onboarding ────────────────────────────────────────────────────

@app.post("/api/vendor/onboard", response_model=NexusAPIResponse)
async def onboard_vendor(request: VendorOnboardRequest):
    """
    Start a new vendor onboarding workflow.

    This triggers the full LangGraph DAG:
    Orchestrator → Collector → Verifier → Risk Scorer → Audit Agent

    Returns the initial state with generated compliance checklist.
    """
    from backend.graph.nexus_graph import get_workflow
    from backend.utils.state_manager import state_manager
    from backend.models.vendor import VendorState

    vendor_id = str(uuid.uuid4())

    logger.info(f"Onboarding request: {request.vendor_name} ({request.industry})")

    # Initialize state
    initial_state = {
        "vendor_id": vendor_id,
        "vendor_name": request.vendor_name,
        "industry": request.industry,
        "contact_email": request.contact_email,
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

    # Persist initial state
    vendor_state = VendorState(
        vendor_id=vendor_id,
        vendor_name=request.vendor_name,
        industry=request.industry,
        contact_email=request.contact_email,
    )
    await state_manager.create_state(vendor_state)

    try:
        # Run the orchestrator step only (not the full pipeline for initial request)
        from backend.agents.orchestrator import run_orchestrator
        result_state = await run_orchestrator(initial_state)

        # Update persisted state
        await state_manager.update_state(
            vendor_id,
            checklist=result_state.get("checklist", []),
            documents_pending=result_state.get("documents_pending", []),
            workflow_status=result_state.get("workflow_status", "active"),
            current_step=result_state.get("current_step", 2),
        )

        return NexusAPIResponse(
            status="success",
            data={
                "vendor_id": vendor_id,
                "vendor_name": request.vendor_name,
                "industry": request.industry,
                "workflow_status": result_state.get("workflow_status", "active"),
                "checklist": result_state.get("checklist", []),
                "total_checklist_items": len(result_state.get("checklist", [])),
                "documents_pending": result_state.get("documents_pending", []),
                "current_step": result_state.get("current_step", 2),
                "audit_log": result_state.get("audit_log", []),
            },
            agent_actions_taken=[
                "Orchestrator: Generated compliance checklist",
                "Orchestrator: Initialized vendor workflow state",
            ],
            message=f"Vendor onboarding initiated. {len(result_state.get('checklist', []))} checklist items generated for {request.industry} industry.",
        )

    except Exception as e:
        logger.error(f"Onboarding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Onboarding failed: {str(e)}")


# ── Vendor Status ─────────────────────────────────────────────────────────

@app.get("/api/vendor/{vendor_id}/status", response_model=NexusAPIResponse)
async def get_vendor_status(vendor_id: str):
    """Get the current status of a vendor verification workflow."""
    from backend.utils.state_manager import state_manager

    state = await state_manager.get_state(vendor_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

    return NexusAPIResponse(
        status="success",
        data=state.model_dump(),
        agent_actions_taken=[],
        message=f"Current status: {state.workflow_status.value if hasattr(state.workflow_status, 'value') else state.workflow_status}",
    )


# ── List All Vendors ──────────────────────────────────────────────────────

@app.get("/api/vendors", response_model=NexusAPIResponse)
async def list_vendors():
    """List all vendor workflows (for buyer dashboard)."""
    from backend.utils.state_manager import state_manager

    states = await state_manager.get_all_states()

    vendors = []
    for state in states:
        vendors.append({
            "vendor_id": state.vendor_id,
            "vendor_name": state.vendor_name,
            "industry": state.industry,
            "workflow_status": state.workflow_status.value if hasattr(state.workflow_status, 'value') else str(state.workflow_status),
            "risk_score": state.risk_score.value if state.risk_score and hasattr(state.risk_score, 'value') else state.risk_score,
            "current_step": state.current_step,
            "health_status": state.health_status.value if state.health_status and hasattr(state.health_status, 'value') else state.health_status,
            "created_at": state.created_at.isoformat(),
        })

    return NexusAPIResponse(
        status="success",
        data={"vendors": vendors, "total": len(vendors)},
        message=f"{len(vendors)} vendor(s) in system",
    )


# ── Run Full Pipeline ─────────────────────────────────────────────────────

@app.post("/api/vendor/{vendor_id}/run-pipeline", response_model=NexusAPIResponse)
async def run_full_pipeline(vendor_id: str):
    """
    Run the complete verification pipeline for a vendor.
    This executes the full LangGraph DAG from Collector through Audit Agent.
    """
    from backend.utils.state_manager import state_manager
    from backend.graph.nexus_graph import get_workflow

    state = await state_manager.get_state(vendor_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

    # Convert to dict for LangGraph
    state_dict = state.model_dump()
    # Serialize enums to values
    for key, value in state_dict.items():
        if hasattr(value, 'value'):
            state_dict[key] = value.value

    try:
        workflow = get_workflow()
        result = await workflow.ainvoke(state_dict)

        actions_taken = [
            entry.get("action", "")
            for entry in result.get("audit_log", [])
        ]

        return NexusAPIResponse(
            status="success",
            data=result,
            agent_actions_taken=actions_taken,
            message=f"Pipeline complete. Workflow status: {result.get('workflow_status', 'unknown')}",
        )

    except Exception as e:
        logger.error(f"Pipeline execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")

# ── Download Audit PDF ────────────────────────────────────────────────────

@app.get("/api/vendor/{vendor_id}/audit-pdf")
async def download_audit_pdf(vendor_id: str):
    """Download the generated PDF audit pack for a vendor."""
    audit_dir = os.getenv("AUDIT_PDF_DIR", "./audit_reports")
    filename = ""
    # Find the latest PDF for this vendor
    if os.path.exists(audit_dir):
        for f in os.listdir(audit_dir):
            if f.startswith(f"audit_pack_{vendor_id[:8]}") and f.endswith(".pdf"):
                filename = f
                break
                
    if not filename:
        raise HTTPException(status_code=404, detail="Audit PDF not generated yet or not found.")
        
    filepath = os.path.join(audit_dir, filename)
    return FileResponse(filepath, media_type="application/pdf", filename=filename)


# ── Monitor Endpoint ──────────────────────────────────────────────────────

@app.post("/api/vendor/{vendor_id}/monitor", response_model=NexusAPIResponse)
async def run_monitor_check(vendor_id: str):
    """Run a health monitoring check on an approved vendor."""
    from backend.utils.state_manager import state_manager
    from backend.agents.monitor_agent import run_monitor

    state = await state_manager.get_state(vendor_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

    state_dict = state.model_dump()
    for key, value in state_dict.items():
        if hasattr(value, 'value'):
            state_dict[key] = value.value

    try:
        result = await run_monitor(state_dict)

        return NexusAPIResponse(
            status="success",
            data={
                "vendor_id": vendor_id,
                "health_status": result.get("health_status"),
                "monitoring_notes": result.get("monitoring_notes"),
                "last_monitored": result.get("last_monitored"),
            },
            agent_actions_taken=["Monitor: Health check completed"],
            message=f"Health status: {result.get('health_status', 'unknown')}",
        )

    except Exception as e:
        logger.error(f"Monitor check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Monitor failed: {str(e)}")


# ── Import Sub-Routers ───────────────────────────────────────────────────

try:
    from backend.api.buyer_routes import router as buyer_router
    from backend.api.supplier_routes import router as supplier_router
    from backend.api.monitor_routes import router as monitor_router

    app.include_router(buyer_router, prefix="/api/buyer", tags=["Buyer Dashboard"])
    app.include_router(supplier_router, prefix="/api/supplier", tags=["Supplier Portal"])
    app.include_router(monitor_router, prefix="/api/monitor", tags=["Monitoring"])
except ImportError as e:
    logger.warning(f"Sub-routers not loaded (will be available in Day 2): {e}")


# ── Run Server ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.api.main:app",
        host=os.getenv("SERVER_HOST", "0.0.0.0"),
        port=int(os.getenv("SERVER_PORT", "8000")),
        reload=True,
        log_level="info",
    )
