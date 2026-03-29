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

    # Create required directories
    os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)
    os.makedirs(os.getenv("AUDIT_PDF_DIR", "./audit_reports"), exist_ok=True)

    # Seed initial vendors for Hackathon Demo
    try:
        from backend.utils.state_manager import state_manager
        from backend.models.vendor import (
            VendorState, ChecklistItem, FraudFlag,
            ExceptionItem, DocumentStatus, RiskLevel,
            WorkflowStatus, HealthStatus, AuditLogEntry,
        )

        v1 = VendorState(
            vendor_id="demo-medtech-001",
            vendor_name="Global Health Supplies Ltd",
            industry="MedTech",
            contact_email="compliance@globalhealth.in",
            workflow_status=WorkflowStatus.ACTIVE,
            current_step=4,
            documents_pending=["CDSCO Manufacturing Licence"],
            checklist=[
                ChecklistItem(category="Legal", document_name="Certificate of Incorporation", description="MCA21 registered company proof", required=True, status=DocumentStatus.VERIFIED),
                ChecklistItem(category="Financial", document_name="GST Registration Certificate", description="Active GSTN registration", required=True, status=DocumentStatus.VERIFIED),
                ChecklistItem(category="Financial", document_name="PAN Card (Company)", description="Permanent Account Number", required=True, status=DocumentStatus.SUBMITTED),
                ChecklistItem(category="Quality", document_name="ISO 9001:2015 Certificate", description="Quality management system", required=True, status=DocumentStatus.SUBMITTED),
                ChecklistItem(category="Regulatory", document_name="CDSCO Manufacturing Licence", description="Medical device manufacturing licence", required=True, status=DocumentStatus.PENDING),
                ChecklistItem(category="Quality", document_name="ISO 13485 Certificate", description="Medical device QMS", required=True, status=DocumentStatus.PENDING),
            ],
            risk_score=RiskLevel.LOW,
            risk_rationale="Initial checks passed cleanly. Company is MCA21 registered and GST compliant. No adverse findings.",
            health_status=HealthStatus.GREEN,
            audit_log=[
                AuditLogEntry(agent="Orchestrator", action="Workflow initiated for MedTech vendor", reason="New onboarding request received"),
                AuditLogEntry(agent="Orchestrator", action="Generated 6-item compliance checklist for MedTech industry", reason="Industry requires CDSCO + ISO 13485 documentation"),
                AuditLogEntry(agent="Collector", action="Document collection request sent to vendor", reason="6 documents required for MedTech compliance"),
                AuditLogEntry(agent="Collector", action="Received Certificate of Incorporation", reason="Document submitted by vendor"),
                AuditLogEntry(agent="Verifier", action="Verified Certificate of Incorporation via MCA21 API", reason="CIN match confirmed — company registered since 2018"),
                AuditLogEntry(agent="Collector", action="Received GST Registration Certificate", reason="Document submitted by vendor"),
                AuditLogEntry(agent="Verifier", action="Verified GST Registration via GSTN API", reason="Active filing status confirmed — last return filed Feb 2026"),
                AuditLogEntry(agent="Risk Scorer", action="Initial risk assessment: LOW", reason="All verified documents match registry data. No sanctions hits."),
                AuditLogEntry(agent="Monitor", action="Health check passed — status GREEN", reason="Active compliance, no outstanding flags"),
            ],
        )
        await state_manager.create_state(v1)

        v2 = VendorState(
            vendor_id="demo-it-002",
            vendor_name="TechFlow Systems",
            industry="IT",
            contact_email="vendor@techflow.io",
            workflow_status=WorkflowStatus.ESCALATED,
            current_step=5,
            checklist=[
                ChecklistItem(category="Legal", document_name="Certificate of Incorporation", description="MCA21 registered company proof", required=True, status=DocumentStatus.VERIFIED),
                ChecklistItem(category="Financial", document_name="GST Registration Certificate", description="Active GSTN registration", required=True, status=DocumentStatus.FAILED),
                ChecklistItem(category="Quality", document_name="ISO 27001 Certificate", description="Information security management", required=True, status=DocumentStatus.PENDING),
            ],
            fraud_flags=[
                FraudFlag(doc_name="GST Registration Certificate", flag_type="data_mismatch", description="GST number shows inactive filing status in GSTN registry", severity="high"),
            ],
            exceptions=[
                ExceptionItem(exception_type="verification_failure", description="Failed to verify IT service credentials — GST number inactive", agent="Verifier", requires_human=True),
            ],
            risk_score=RiskLevel.HIGH,
            risk_rationale="Significant mismatches in submitted documents vs registry. GST filing inactive for 6+ months. Requires human compliance officer review.",
            health_status=HealthStatus.RED,
            audit_log=[
                AuditLogEntry(agent="Orchestrator", action="Workflow initiated for IT vendor", reason="New onboarding request received"),
                AuditLogEntry(agent="Orchestrator", action="Generated 3-item compliance checklist for IT industry", reason="Standard IT vendor requirements"),
                AuditLogEntry(agent="Collector", action="Document collection request sent to vendor", reason="3 documents required for IT compliance"),
                AuditLogEntry(agent="Collector", action="Received Certificate of Incorporation", reason="Document submitted by vendor"),
                AuditLogEntry(agent="Verifier", action="Verified Certificate of Incorporation via MCA21 API", reason="CIN match confirmed"),
                AuditLogEntry(agent="Collector", action="Received GST Registration Certificate", reason="Document submitted by vendor"),
                AuditLogEntry(agent="Verifier", action="⚠ VERIFICATION FAILED — GST Registration Certificate", reason="GST number shows INACTIVE filing status in GSTN registry. Last return filed 6+ months ago."),
                AuditLogEntry(agent="Verifier", action="Fraud flag raised: data_mismatch on GST Certificate", reason="Submitted certificate shows active status but GSTN API confirms inactive"),
                AuditLogEntry(agent="Risk Scorer", action="Risk assessment: HIGH — workflow ESCALATED", reason="Critical data mismatch. GST filing inactive 6+ months. Requires human compliance review."),
                AuditLogEntry(agent="Monitor", action="Health check CRITICAL — status RED", reason="Unresolved fraud flag, verification failure"),
            ],
        )
        await state_manager.create_state(v2)

        v3 = VendorState(
            vendor_id="demo-pharma-003",
            vendor_name="PharmaChem Gujarat",
            industry="Pharma",
            contact_email="reg@pharmachem.co.in",
            workflow_status=WorkflowStatus.COMPLETE,
            current_step=13,
            checklist=[
                ChecklistItem(category="Legal", document_name="Certificate of Incorporation", description="MCA21 registered company proof", required=True, status=DocumentStatus.VERIFIED),
                ChecklistItem(category="Financial", document_name="GST Registration Certificate", description="Active GSTN registration", required=True, status=DocumentStatus.VERIFIED),
                ChecklistItem(category="Regulatory", document_name="Drug Licence (Form 20/21)", description="State drug licence", required=True, status=DocumentStatus.VERIFIED),
                ChecklistItem(category="Quality", document_name="ISO 9001:2015 Certificate", description="Quality management system", required=True, status=DocumentStatus.VERIFIED),
            ],
            risk_score=RiskLevel.MEDIUM,
            risk_rationale="All documents verified. Minor concern flagged regarding CPCB compliance history. Overall acceptable risk for onboarding.",
            health_status=HealthStatus.AMBER,
            audit_log=[
                AuditLogEntry(agent="Orchestrator", action="Workflow initiated for Pharma vendor", reason="New onboarding request received"),
                AuditLogEntry(agent="Orchestrator", action="Generated 4-item compliance checklist for Pharma industry", reason="Pharma requires Drug Licence verification"),
                AuditLogEntry(agent="Collector", action="All 4 documents received from vendor", reason="Complete submission — no pending documents"),
                AuditLogEntry(agent="Verifier", action="Verified Certificate of Incorporation via MCA21 API", reason="CIN match confirmed — registered in Gujarat since 2015"),
                AuditLogEntry(agent="Verifier", action="Verified GST Registration via GSTN API", reason="Active filing status — quarterly returns current"),
                AuditLogEntry(agent="Verifier", action="Verified Drug Licence (Form 20/21) via CDSCO API", reason="Valid state drug licence — expiry March 2028"),
                AuditLogEntry(agent="Verifier", action="Verified ISO 9001:2015 Certificate", reason="Certificate valid — certified by Bureau Veritas"),
                AuditLogEntry(agent="Risk Scorer", action="Risk assessment: MEDIUM", reason="All docs verified. Minor CPCB compliance flag from 2023 — resolved. Acceptable risk."),
                AuditLogEntry(agent="Audit Agent", action="Audit trail compiled — 8 entries, narrative generated", reason="Full verification complete"),
                AuditLogEntry(agent="Audit Agent", action="Vendor onboarding APPROVED — workflow marked COMPLETE", reason="All compliance requirements met. PDF audit report generated."),
                AuditLogEntry(agent="Monitor", action="Post-approval monitoring initiated — status AMBER", reason="Minor historical CPCB flag warrants continued monitoring"),
            ],
        )
        await state_manager.create_state(v3)

        logger.info("   ✅ Seeded 3 demo vendors")
    except Exception as e:
        logger.warning(f"   ⚠️ Could not seed vendors: {e}")
        import traceback
        traceback.print_exc()

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
    # Seed fraud patterns on the first health check
    try:
        from backend.utils.chroma_client import seed_fraud_patterns
        seed_fraud_patterns()
    except Exception as e:
        logger.warning(f"Chroma seeding failed: {e}")

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

    # Use mode='json' to auto-serialize datetimes and enums
    state_data = state.model_dump(mode='json')

    return NexusAPIResponse(
        status="success",
        data=state_data,
        agent_actions_taken=[],
        message=f"Current status: {state.workflow_status}",
    )


# ── List All Vendors (Legacy / Python Memory) ──────────────────────────────

@app.get("/api/python_memory/vendors", response_model=NexusAPIResponse)
async def list_vendors():
    """List all vendor workflows (for buyer dashboard)."""
    from backend.utils.state_manager import state_manager

    states = await state_manager.get_all_states()

    vendors = []
    for state in states:
        # Serialize checklist items
        checklist_data = []
        for item in state.checklist:
            if hasattr(item, 'model_dump'):
                checklist_data.append(item.model_dump())
            elif isinstance(item, dict):
                checklist_data.append(item)

        # Serialize audit log entries
        audit_data = []
        for entry in state.audit_log:
            if hasattr(entry, 'model_dump'):
                d = entry.model_dump()
                d['timestamp'] = d['timestamp'].isoformat() if hasattr(d['timestamp'], 'isoformat') else str(d['timestamp'])
                audit_data.append(d)
            elif isinstance(entry, dict):
                audit_data.append(entry)

        # Serialize fraud flags
        fraud_data = []
        for flag in state.fraud_flags:
            if hasattr(flag, 'model_dump'):
                d = flag.model_dump()
                d['detected_at'] = d['detected_at'].isoformat() if hasattr(d.get('detected_at', ''), 'isoformat') else str(d.get('detected_at', ''))
                fraud_data.append(d)
            elif isinstance(flag, dict):
                fraud_data.append(flag)

        # Serialize exceptions
        exception_data = []
        for exc in state.exceptions:
            if hasattr(exc, 'model_dump'):
                d = exc.model_dump()
                d['created_at'] = d['created_at'].isoformat() if hasattr(d.get('created_at', ''), 'isoformat') else str(d.get('created_at', ''))
                exception_data.append(d)
            elif isinstance(exc, dict):
                exception_data.append(exc)

        vendors.append({
            "vendor_id": state.vendor_id,
            "vendor_name": state.vendor_name,
            "industry": state.industry,
            "contact_email": state.contact_email,
            "workflow_status": str(state.workflow_status),
            "risk_score": str(state.risk_score) if state.risk_score else None,
            "risk_rationale": state.risk_rationale,
            "current_step": state.current_step,
            "health_status": str(state.health_status) if state.health_status else None,
            "checklist": checklist_data,
            "documents_pending": state.documents_pending,
            "documents_submitted": state.documents_submitted,
            "fraud_flags": fraud_data,
            "exceptions": exception_data,
            "audit_log": audit_data,
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
    from backend.api.notify_routes import router as notify_router

    app.include_router(buyer_router, prefix="/api/buyer", tags=["Buyer Dashboard"])
    app.include_router(supplier_router, prefix="/api/supplier", tags=["Supplier Portal"])
    app.include_router(monitor_router, prefix="/api/monitor", tags=["Monitoring"])
    app.include_router(notify_router, prefix="/api/notify", tags=["Notifications"])
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
