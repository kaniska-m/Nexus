# ============================================================================
# Nexus — Supplier Portal Routes
# Serves: Supplier-side API endpoints for document submission and tracking.
# ============================================================================

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

router = APIRouter()


@router.get("/{vendor_id}/form")
async def get_supplier_form(vendor_id: str):
    """Get the smart form for a supplier to fill — generated from the checklist."""
    from backend.utils.state_manager import state_manager
    from backend.agents.collector import generate_smart_form

    state = await state_manager.get_state(vendor_id)
    if not state:
        raise HTTPException(status_code=404, detail="Vendor not found")

    checklist_dicts = [
        item.model_dump() if hasattr(item, 'model_dump') else item
        for item in state.checklist
    ]
    form = await generate_smart_form(checklist_dicts)

    return {
        "status": "success",
        "data": {
            "vendor_id": vendor_id,
            "vendor_name": state.vendor_name,
            "form": form,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/{vendor_id}/submit-document")
async def submit_document(
    vendor_id: str,
    document_name: str = Form(...),
    file: UploadFile = File(...),
):
    """Supplier uploads a compliance document."""
    from backend.utils.state_manager import state_manager
    import os

    state = await state_manager.get_state(vendor_id)
    if not state:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Save uploaded file
    upload_dir = os.getenv("UPLOAD_DIR", "./uploads")
    vendor_dir = os.path.join(upload_dir, vendor_id[:8])
    os.makedirs(vendor_dir, exist_ok=True)

    file_path = os.path.join(vendor_dir, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Update state with submitted document
    state.documents_submitted[document_name] = {
        "file_path": file_path,
        "filename": file.filename,
        "submitted_at": datetime.utcnow().isoformat(),
    }

    # Remove from pending if it was there
    if document_name in state.documents_pending:
        state.documents_pending.remove(document_name)

    await state_manager.append_audit_log(
        vendor_id=vendor_id,
        agent="Supplier Portal",
        action=f"Document submitted: {document_name}",
        reason=f"Supplier uploaded {file.filename}",
    )

    return {
        "status": "success",
        "data": {
            "document_name": document_name,
            "filename": file.filename,
            "submitted_at": datetime.utcnow().isoformat(),
            "pending_remaining": len(state.documents_pending),
        },
        "agent_actions_taken": ["Collector: Document received and logged"],
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/{vendor_id}/status")
async def get_supplier_status(vendor_id: str):
    """Get the supplier's progress — what's submitted vs pending."""
    from backend.utils.state_manager import state_manager

    state = await state_manager.get_state(vendor_id)
    if not state:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return {
        "status": "success",
        "data": {
            "vendor_id": vendor_id,
            "vendor_name": state.vendor_name,
            "documents_submitted": len(state.documents_submitted),
            "documents_pending": state.documents_pending,
            "pending_count": len(state.documents_pending),
            "workflow_status": str(getattr(state.workflow_status, 'value', state.workflow_status)),
        },
        "timestamp": datetime.utcnow().isoformat(),
    }
