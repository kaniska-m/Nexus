# ============================================================================
# Nexus — Notify Routes
# Serves: Notification system using Resend
# ============================================================================

from __future__ import annotations
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.utils.resend_client import nexus_email_template, send_email
from backend.utils.state_manager import state_manager

router = APIRouter()
logger = logging.getLogger(__name__)

class NotificationRequest(BaseModel):
    type: str = Field(..., description="Type of notification to send")
    vendor_id: str
    recipient_email: str
    data: dict[str, Any] = Field(default_factory=dict)

@router.post("/")
async def send_notification(request: NotificationRequest):
    """Handles various notification triggers and dispatches via Resend."""
    
    state = await state_manager.get_state(request.vendor_id)
    vendor_name = state.vendor_name if state else "Vendor"
    industry = state.industry if state else ""

    t = request.type
    d = request.data
    
    subject = ""
    title = ""
    body = ""
    cta_text = ""
    cta_url = ""

    if t == "onboarding_started":
        subject = "Nexus: Action required — your compliance verification has started"
        title = "Compliance Verification Started"
        body = f"""<p>Welcome, {vendor_name}.</p>
        <p>Your compliance verification for the {industry} industry has been initiated. 
        Please prepare your compliance documents and click the link below to access your secure supplier portal.</p>"""
        cta_text = "Open your compliance portal →"
        cta_url = d.get("portal_url", f"http://localhost:3000/supplier/{request.vendor_id}")

    elif t == "document_reminder":
        pending_count = d.get("pending_count", 0)
        reminder_text = d.get("reminder_text", "You have pending documents required for verification.")
        subject = f"Nexus: {pending_count} documents still required — {vendor_name}"
        title = "Missing Documentation"
        body = f"""<p>Hello {vendor_name},</p>
        <p>{reminder_text}</p>
        <p>Please log in to your portal to upload them.</p>"""
        cta_text = "Upload documents now →"
        cta_url = d.get("portal_url", f"http://localhost:3000/supplier/{request.vendor_id}")

    elif t == "verification_complete":
        risk_score = d.get("risk_score", "Unknown")
        subject = f"Nexus: Verification complete — {vendor_name} is {risk_score} risk"
        title = "Verification Complete"
        color = "#10b981" if risk_score.lower() == "low" else ("#f59e0b" if risk_score.lower() == "medium" else "#ef4444")
        body = f"""<p>The automated verification for <strong>{vendor_name}</strong> has concluded.</p>
        <p>Risk Score: <span style="background-color: {color}; color: white; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: bold;">{risk_score}</span></p>
        <p><strong>Rationale:</strong> {d.get('risk_rationale', '')}</p>
        <p>Summary: {d.get('verified_count', 0)} verified, {d.get('failed_count', 0)} failed.</p>"""
        cta_text = "Review in dashboard →"
        cta_url = d.get("dashboard_url", "http://localhost:3000/buyer")

    elif t == "fraud_alert":
        subject = f"⚠ NEXUS ALERT: Fraud signal detected — {vendor_name}"
        title = "⚠ CRITICAL: Fraud Signal Detected"
        body = f"""<p>A fraud signal has been raised during the verification of <strong>{vendor_name}</strong>.</p>
        <p><strong>Triggering Document:</strong> {d.get('doc_name', 'Unknown')}</p>
        <p><strong>Flag Type:</strong> {d.get('flag_type', 'Unknown')}</p>
        <p><strong>Details:</strong> {d.get('description', '')}</p>
        <p style="color: #ef4444; font-weight: bold; margin-top: 16px;">ACTION: Do not proceed — compliance officer review required.</p>"""
        cta_text = "Review fraud flag →"
        cta_url = d.get("dashboard_url", "http://localhost:3000/buyer")

    elif t == "health_alert":
        subject = f"Nexus Health Alert: {vendor_name} — immediate action required"
        title = "Health Monitor Alert"
        body = f"""<p>Continuous monitoring has detected a critical issue for <strong>{vendor_name}</strong>.</p>
        <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">RED</span></p>
        <p><strong>Monitoring Notes:</strong> {d.get('monitoring_notes', '')}</p>
        <p><strong>Recommended Action:</strong> {d.get('recommended_action', 'Review immediately')}</p>"""
        cta_text = "View vendor health →"
        cta_url = d.get("dashboard_url", "http://localhost:3000/buyer/health")

    elif t == "human_approval_required":
        subject = f"Nexus: Your decision required — {vendor_name}"
        title = "Human Approval Required"
        body = f"""<p>An exception has occurred requiring human approval for <strong>{vendor_name}</strong>.</p>
        <p><strong>Exception:</strong> {d.get('exception_description', '')}</p>
        <p><strong>Risk Rationale:</strong> {d.get('risk_rationale', '')}</p>"""
        cta_text = "Review and decide →"
        cta_url = d.get("dashboard_url", "http://localhost:3000/buyer")

    else:
        raise HTTPException(status_code=400, detail="Invalid notification type")

    html_content = nexus_email_template(title, body, cta_text, cta_url)
    sent = await send_email(request.recipient_email, subject, html_content)

    return {
        "status": "success",
        "data": {"sent": sent},
        "timestamp": datetime.utcnow().isoformat()
    }
