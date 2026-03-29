# ============================================================================
# Nexus — Python Backend Supabase Client
# Serves: Agent-side persistence of risk scores, audit logs, vendor status
# ============================================================================

import logging
import os

from supabase import create_client, Client

logger = logging.getLogger(__name__)

_supabase_client: Client | None = None


def get_supabase() -> Client | None:
    """
    Returns a singleton Supabase client for the Python backend.
    Uses NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
    (service role key bypasses RLS for server-side writes).
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    # Prefer service role key for server-side writes; fall back to anon key
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not url or not key:
        logger.warning("Supabase credentials not found in environment — agent DB writes disabled")
        return None

    try:
        _supabase_client = create_client(url, key)
        logger.info("Supabase client initialized for Python backend")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


async def upsert_vendor_risk(vendor_id: str, risk_score: str, risk_rationale: str, workflow_status: str) -> bool:
    """Update risk score and rationale for a vendor in the Supabase vendors table."""
    client = get_supabase()
    if not client:
        return False
    try:
        client.table("vendors").update({
            "risk_score": risk_score,
            "risk_rationale": risk_rationale,
            "workflow_status": workflow_status,
        }).eq("id", vendor_id).execute()
        logger.info(f"Supabase: risk score persisted for vendor {vendor_id}")
        return True
    except Exception as e:
        logger.error(f"Supabase risk upsert failed: {e}")
        return False


async def upsert_vendor_audit(vendor_id: str, audit_summary: dict, audit_log: list) -> bool:
    """Update audit summary and log for a vendor in the Supabase vendors table."""
    client = get_supabase()
    if not client:
        return False
    try:
        client.table("vendors").update({
            "audit_summary": audit_summary,
            "audit_log": audit_log,
        }).eq("id", vendor_id).execute()
        logger.info(f"Supabase: audit log persisted for vendor {vendor_id}")
        return True
    except Exception as e:
        logger.error(f"Supabase audit upsert failed: {e}")
        return False
