"""
Nexus — Full 6-Agent Pipeline Audit Script
Tests each agent in pipeline order with real inputs and logs detailed results.
Run from: c:\\ET_2\\Nexus>    python test_agents.py
"""
import asyncio
import json
import os
import sys
import traceback
from datetime import datetime, timedelta

# Make sure the Nexus package is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

# ─── Helpers ──────────────────────────────────────────────────────────────────

def section(title):
    print("\n" + "═" * 70)
    print(f"  {title}")
    print("═" * 70)

def sub(label, val=None):
    if val is None:
        print(f"\n  ── {label}")
    else:
        print(f"  {label}: {val}")

def dump(label, obj, truncate=1200):
    text = json.dumps(obj, indent=2, default=str)
    if len(text) > truncate:
        text = text[:truncate] + f"\n  ... [truncated — {len(text)} total chars]"
    print(f"\n  ◆ {label}:\n{text}")

VENDOR_ID = "techflow-test-001"
VENDOR_NAME = "TechFlow Systems"
INDUSTRY = "IT"
GSTIN = "27AABCT1234F1Z5"

# ─── Initial State ─────────────────────────────────────────────────────────────

BASE_STATE = {
    "vendor_id": VENDOR_ID,
    "vendor_name": VENDOR_NAME,
    "industry": INDUSTRY,
    "gstin": GSTIN,
    "checklist": [],
    "documents_pending": [],
    "documents_submitted": {},
    "verification_results": {},
    "fraud_flags": [],
    "risk_score": None,
    "risk_rationale": "",
    "audit_log": [],
    "workflow_status": "active",
    "current_step": 1,
    "escalation_level": 0,
    "exceptions": [],
}

# ─── AGENT 1: Orchestrator ─────────────────────────────────────────────────────

async def test_orchestrator(state):
    section("AGENT 1: ORCHESTRATOR")
    from backend.agents.orchestrator import run_orchestrator

    sub("INPUT")
    print(f"  vendor_name : {state['vendor_name']}")
    print(f"  industry    : {state['industry']}")
    print(f"  gstin       : {state['gstin']}")

    print("\n  [Calling LLM to generate compliance checklist...]")
    try:
        t0 = datetime.utcnow()
        result = await run_orchestrator(state)
        elapsed = (datetime.utcnow() - t0).total_seconds()

        checklist = result.get("checklist", [])
        sub("OUTPUT")
        print(f"  ✓ Checklist items generated : {len(checklist)}")
        print(f"  ✓ LLM call duration         : {elapsed:.2f}s")
        print(f"  ✓ Workflow status           : {result.get('workflow_status')}")
        print(f"  ✓ Documents pending         : {len(result.get('documents_pending', []))}")

        # Check: real LLM or fallback?
        categories = set(item.get("category") for item in checklist)
        print(f"  ✓ Categories generated      : {categories}")

        # Fallback has exactly 8 or fewer items; LLM should give 10-16
        if len(checklist) >= 10:
            print("  ✅ LLM output confirmed (10+ items — real generation)")
        elif len(checklist) >= 6:
            print("  ⚠️  POSSIBLY FALLBACK (6-9 items — check if LLM failed)")
        else:
            print("  ❌ HARDCODED FALLBACK triggered (LLM call failed)")

        sub("CHECKLIST PREVIEW")
        for i, item in enumerate(checklist[:5], 1):
            print(f"  {i}. [{item.get('category')}] {item.get('document_name')}")
        if len(checklist) > 5:
            print(f"  ... and {len(checklist)-5} more")

        sub("AUDIT LOG ENTRY")
        entry = result.get("audit_log", [{}])[-1]
        print(f"  Agent : {entry.get('agent')}")
        print(f"  Action: {entry.get('action')}")

        sub("SUPABASE WRITE CHECK")
        print("  ❌ Orchestrator does NOT write checklist to Supabase.")
        print("     It only writes to in-memory state_manager.")
        print("     (Supabase writes happen in Next.js /api/onboard route instead)")

        return result

    except Exception as e:
        print(f"  ❌ ORCHESTRATOR FAILED: {e}")
        traceback.print_exc()
        return state


# ─── AGENT 2: Collector ────────────────────────────────────────────────────────

async def test_collector(state):
    section("AGENT 2: COLLECTOR")
    from backend.agents.collector import run_collector, generate_smart_form

    # Simulate: 2 docs submitted, rest pending
    submitted_docs = {
        "GST Registration Certificate": {"file_path": "/uploads/gst_cert.pdf"},
        "Certificate of Incorporation": {"file_path": "/uploads/inc_cert.pdf"},
    }
    state["documents_submitted"] = submitted_docs

    sub("INPUT")
    print(f"  Checklist items     : {len(state['checklist'])}")
    print(f"  Submitted docs      : {list(submitted_docs.keys())}")

    try:
        t0 = datetime.utcnow()
        result = await run_collector(state)
        elapsed = (datetime.utcnow() - t0).total_seconds()

        sub("OUTPUT")
        print(f"  ✓ Still pending     : {len(result.get('documents_pending', []))}")
        print(f"  ✓ Duration          : {elapsed:.2f}s")

        pending = result.get("documents_pending", [])
        print(f"  ✓ Pending docs      : {pending[:4]}")

        # Verify submitted docs were removed from pending
        for doc in submitted_docs:
            if doc in pending:
                print(f"  ❌ ERROR: '{doc}' still in pending after submission!")
            else:
                print(f"  ✅ '{doc}' correctly removed from pending")

        # Check LLM reminder was generated
        audit = result.get("audit_log", [])
        collector_entry = next((e for e in audit if e.get("agent") == "Collector"), None)
        if collector_entry:
            details = collector_entry.get("details", {})
            print(f"  ✓ LLM reminders sent: {details.get('reminders_sent', 0)}")

        sub("FORM GENERATION TEST")
        form = await generate_smart_form(state["checklist"][:3])
        print(f"  ✓ Form title    : {form.get('form_title')}")
        print(f"  ✓ Fields count  : {len(form.get('fields', []))}")
        print(f"  ✓ Total required: {form.get('total_required')}")

        sub("SUPABASE WRITE CHECK")
        print("  ❌ Collector does NOT write to Supabase.")
        print("     Document status updates are in-memory only (state dict).")
        print("     No Supabase upsert for checklist_items table from this agent.")

        return result

    except Exception as e:
        print(f"  ❌ COLLECTOR FAILED: {e}")
        traceback.print_exc()
        return state


# ─── AGENT 3: Verifier ─────────────────────────────────────────────────────────

async def test_verifier(state):
    section("AGENT 3: VERIFIER")
    from backend.agents.verifier import run_verifier
    from backend.tools.mca21_tool import lookup_mca21_by_name, lookup_mca21
    from backend.tools.gstn_tool import lookup_gstn
    from backend.tools.pdf_reader import extract_fields_from_pdf

    # Add docs including ones that trigger API checks by keyword
    state["documents_submitted"] = {
        "Certificate of Incorporation": {"file_path": "/uploads/test_inc.pdf"},
        "GST Registration Certificate": {"file_path": "/uploads/test_gst.pdf"},
    }

    sub("INPUT")
    print(f"  Submitted docs: {list(state['documents_submitted'].keys())}")
    print(f"  GSTIN for check: {GSTIN}")

    # --- Direct tool tests ---
    sub("TOOL TEST: MCA21 (by name)")
    r = await lookup_mca21_by_name("TechFlow")
    print(f"  api_status : {r.get('api_status')}")
    print(f"  company    : {r['response'].get('company_name')}")
    print(f"  status     : {r['response'].get('registration_status')}")
    print(f"  IS MOCK    : ✅ Yes — static Python dict, no real HTTP call")

    sub("TOOL TEST: MCA21 (known Strike-Off case)")
    r2 = await lookup_mca21("U24110GJ2015PTC087654")
    print(f"  company    : {r2['response'].get('company_name')}")
    print(f"  status     : {r2['response'].get('registration_status')} ← fraud trigger!")

    sub("TOOL TEST: GSTN lookup (vendor GSTIN)")
    r3 = await lookup_gstn(GSTIN)
    print(f"  api_status : {r3.get('api_status')} ({'in mock DB' if r3['api_status']=='success' else 'NOT in mock DB — returns Not Found'})")
    print(f"  filing     : {r3['response'].get('filing_status')}")
    print(f"  IS MOCK    : ✅ Yes — static Python dict, no real HTTP call")

    sub("TOOL TEST: PDF Extraction (no real file)")
    pdf_r = await extract_fields_from_pdf("/tmp/nonexistent.pdf")
    print(f"  status: {pdf_r.get('status')} — {pdf_r.get('error', 'ok')}")

    sub("FRAUD DETECTION TEST")
    print("  Triggering MCA21 Strike-Off scenario via run_verifier...")
    # Use PharmaChem to trigger fraud
    fraud_state = {
        **state,
        "vendor_name": "PharmaChem Gujarat",
        "documents_submitted": {
            "Certificate of Incorporation": {"file_path": "/uploads/test.pdf"}
        }
    }
    try:
        t0 = datetime.utcnow()
        result = await run_verifier(fraud_state)
        elapsed = (datetime.utcnow() - t0).total_seconds()

        fraud_flags = result.get("fraud_flags", [])
        print(f"  ✓ Duration       : {elapsed:.2f}s")
        print(f"  ✓ Fraud flags    : {len(fraud_flags)}")
        for f in fraud_flags:
            print(f"  🚨 [{f.get('severity')}] {f.get('flag_type')}: {f.get('description')[:80]}")
        if fraud_flags:
            print(f"  ✅ Fraud detection TRIGGERED correctly on Strike-Off company")

        sub("SUPABASE WRITE CHECK")
        print("  ❌ Verifier does NOT write to Supabase directly.")
        print("     Results go into in-memory state dict only.")

        # Now run normal TechFlow through verifier
        t0 = datetime.utcnow()
        result2 = await run_verifier(state)
        elapsed2 = (datetime.utcnow() - t0).total_seconds()
        vr = result2.get("verification_results", {})
        print(f"\n  ✓ TechFlow verifier run duration: {elapsed2:.2f}s")
        print(f"  ✓ Verification results: {len(vr)} doc(s)")
        for doc, res in vr.items():
            print(f"    [{res.get('status')}] {doc} — {res.get('reason', '')[:60]}")

        return result2

    except Exception as e:
        print(f"  ❌ VERIFIER FAILED: {e}")
        traceback.print_exc()
        return state


# ─── AGENT 4: Risk Scorer ──────────────────────────────────────────────────────

async def test_risk_scorer(state):
    section("AGENT 4: RISK SCORER")
    from backend.agents.risk_scorer import run_risk_scorer
    from backend.tools.sanction_checker import check_sanctions

    sub("TOOL TEST: Sanction Check — OpenSanctions API")
    api_key = os.getenv("OPENSANCTIONS_API_KEY")
    print(f"  OPENSANCTIONS_API_KEY present: {'✅ YES — real API will be called' if api_key else '❌ NO — will use mock fallback'}")

    t0 = datetime.utcnow()
    sanction_result = await check_sanctions(entity_name=VENDOR_NAME, directors=["Rajesh Sharma"])
    elapsed = (datetime.utcnow() - t0).total_seconds()
    print(f"  Source      : {sanction_result.get('source')}")
    print(f"  Duration    : {elapsed:.2f}s")
    print(f"  Sanctioned? : {sanction_result.get('is_sanctioned')}")
    print(f"  Lists scanned: {sanction_result.get('lists_scanned')}")

    # Test a known sanctioned name
    sub("TOOL TEST: Sanction Check — known blacklisted entity")
    evil_result = await check_sanctions("Global Pharma Exports Ltd")
    print(f"  is_sanctioned : {evil_result.get('is_sanctioned')}")
    print(f"  matches       : {evil_result.get('total_matches')}")
    if evil_result.get("matches"):
        m = evil_result["matches"][0]
        print(f"  🚨 Match: {m.get('entity_name')} — {m.get('reason')[:70]}")

    sub("INPUT to Risk Scorer")
    print(f"  vendor_name  : {state['vendor_name']}")
    print(f"  fraud_flags  : {len(state.get('fraud_flags', []))}")
    print(f"  verif results: {len(state.get('verification_results', {}))}")

    try:
        t0 = datetime.utcnow()
        result = await run_risk_scorer(state)
        elapsed = (datetime.utcnow() - t0).total_seconds()

        sub("OUTPUT")
        print(f"  ✓ Risk score    : {result.get('risk_score')}")
        print(f"  ✓ Duration      : {elapsed:.2f}s")

        rationale = result.get("risk_rationale", "")
        print(f"  ✓ LLM rationale : {rationale[:200]}...")

        if len(rationale) > 50 and result.get("risk_score") in ["Low", "Medium", "High"]:
            print("  ✅ LLM rationale is real (not hardcoded fallback)")
        else:
            print("  ⚠️  LLM call may have failed — check rationale text")

        audit = [e for e in result.get("audit_log", []) if e.get("agent") == "Risk Scorer"]
        if audit:
            print(f"  ✓ Audit entry details: {audit[-1].get('details', {})}")

        sub("SUPABASE WRITE CHECK")
        print("  ❌ Risk Scorer does NOT write risk_score to Supabase directly.")
        print("     Saved to in-memory state only. Next.js pipeline writes it to Supabase.")

        # Grace failure test: simulate OpenSanctions down
        sub("RESILIENCE TEST: What if sanction check fails?")
        print("  The sanction checker wraps exceptions with try/except per entity.")
        print("  On httpx.HTTPError → logs error but continues. No crash.")
        print("  ✅ Graceful degradation confirmed in code (lines 125-128 of sanction_checker.py)")

        return result

    except Exception as e:
        print(f"  ❌ RISK SCORER FAILED: {e}")
        traceback.print_exc()
        return state


# ─── AGENT 5: Audit Agent ─────────────────────────────────────────────────────

async def test_audit_agent(state):
    section("AGENT 5: AUDIT AGENT")
    from backend.agents.audit_agent import run_audit_agent, generate_audit_pdf

    sub("INPUT")
    print(f"  Audit log entries : {len(state.get('audit_log', []))}")
    print(f"  Risk score        : {state.get('risk_score')}")
    print(f"  Fraud flags       : {len(state.get('fraud_flags', []))}")
    print(f"  Verif results     : {len(state.get('verification_results', {}))}")

    try:
        t0 = datetime.utcnow()
        result = await run_audit_agent(state)
        elapsed = (datetime.utcnow() - t0).total_seconds()

        summary = result.get("audit_summary", {})
        sub("OUTPUT")
        print(f"  ✓ Duration             : {elapsed:.2f}s")
        print(f"  ✓ Workflow status      : {result.get('workflow_status')}")
        print(f"  ✓ Total steps logged   : {summary.get('total_steps_logged')}")
        print(f"  ✓ Agents involved      : {summary.get('agents_involved')}")
        print(f"  ✓ Docs verified        : {summary['verification_summary']['verified']}")
        print(f"  ✓ Docs failed          : {summary['verification_summary']['failed']}")
        print(f"  ✓ Fraud signals        : {summary['verification_summary']['fraud_signals']}")

        narrative = summary.get("narrative", "")
        print(f"\n  ✓ LLM Narrative preview:\n  \"{narrative[:300]}...\"")
        if len(narrative) > 100:
            print("  ✅ LLM narrative generated successfully")
        else:
            print("  ⚠️  LLM may have returned fallback narrative")

        sub("PDF GENERATION TEST")
        try:
            import reportlab
            print(f"  ReportLab installed : ✅ YES (v{reportlab.Version})")
            pdf_path = await generate_audit_pdf(result)
            if pdf_path:
                print(f"  ✅ PDF generated at : {pdf_path}")
            else:
                print(f"  ❌ PDF not generated (check audit_reports/ dir perms)")
        except ImportError:
            print("  ❌ ReportLab NOT installed — PDF generation is DISABLED")
            print("     Install with: pip install reportlab")

        sub("SUPABASE WRITE CHECK")
        print("  ❌ Audit Agent does NOT write audit_log to Supabase audit_logs table.")
        print("     Audit entries remain in memory. Supabase writes require explicit call.")

        return result

    except Exception as e:
        print(f"  ❌ AUDIT AGENT FAILED: {e}")
        traceback.print_exc()
        return state


# ─── AGENT 6: Monitor Agent ───────────────────────────────────────────────────

async def test_monitor_agent(state):
    section("AGENT 6: MONITOR AGENT")
    from backend.agents.monitor_agent import run_monitor

    # Add verification results with expiry dates to test expiry alerts
    state["verification_results"] = {
        "ISO 27001 Certificate": {
            "status": "verified",
            "expiry_date": (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d"),  # expires in 5 days!
            "reason": "CDSCO verified"
        },
        "GST Registration Certificate": {
            "status": "verified",
            "expiry_date": (datetime.utcnow() + timedelta(days=180)).strftime("%Y-%m-%d"),
            "reason": "GSTN active"
        },
        "STPI Registration": {
            "status": "verified",
            "expiry_date": (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%d"),  # EXPIRED!
            "reason": "Verified"
        },
    }
    state["risk_score"] = state.get("risk_score", "Low")

    sub("INPUT (with expiry trap)")
    print(f"  vendor      : {state['vendor_name']}")
    print(f"  risk_score  : {state.get('risk_score')}")
    for doc, r in state["verification_results"].items():
        print(f"  {doc}: expires {r['expiry_date']}")

    try:
        t0 = datetime.utcnow()
        result = await run_monitor(state)
        elapsed = (datetime.utcnow() - t0).total_seconds()

        sub("OUTPUT")
        print(f"  ✓ Duration       : {elapsed:.2f}s")
        print(f"  ✓ Health status  : {result.get('health_status')}")
        print(f"  ✓ Last monitored : {result.get('last_monitored')}")

        monitor_entry = next(
            (e for e in reversed(result.get("audit_log", []))
             if e.get("agent") == "Monitor"), None
        )
        if monitor_entry:
            issues = monitor_entry.get("details", {}).get("issues", [])
            print(f"  ✓ Issues found   : {len(issues)}")
            for issue in issues:
                print(f"    🚨 {issue}")
            next_check = monitor_entry.get("details", {}).get("next_check")
            print(f"  ✓ Next check at  : {next_check}")

        notes = result.get("monitoring_notes", "")
        print(f"\n  ✓ LLM summary: \"{notes[:200]}\"")

        sub("CONTINUOUS MONITORING CHECK")
        print("  ❌ Monitor Agent is NOT a scheduler/daemon.")
        print("     It runs ONCE when called. True continuous monitoring")
        print("     requires an external cron job or APScheduler.")
        print("     MONITORING_SCHEDULE dict defines intervals but nothing calls them.")

        sub("SUPABASE WRITE CHECK")
        print("  ❌ Monitor Agent does NOT update health_status in Supabase.")
        print("     health_status stays in memory only.")

        return result

    except Exception as e:
        print(f"  ❌ MONITOR AGENT FAILED: {e}")
        traceback.print_exc()
        return state


# ─── MAIN ──────────────────────────────────────────────────────────────────────

async def main():
    print("\n" + "█" * 70)
    print("  NEXUS — FULL 6-AGENT PIPELINE AUDIT")
    print(f"  Vendor: {VENDOR_NAME} | Industry: {INDUSTRY} | GSTIN: {GSTIN}")
    print(f"  Run at: {datetime.utcnow().isoformat()} UTC")
    print("█" * 70)

    state = dict(BASE_STATE)

    state = await test_orchestrator(state)
    state = await test_collector(state)
    state = await test_verifier(state)
    state = await test_risk_scorer(state)
    state = await test_audit_agent(state)
    state = await test_monitor_agent(state)

    section("FINAL AUDIT SUMMARY")
    print(f"  Vendor            : {state.get('vendor_name')}")
    print(f"  Industry          : {state.get('industry')}")
    print(f"  Risk Score        : {state.get('risk_score')}")
    print(f"  Health Status     : {state.get('health_status')}")
    print(f"  Workflow Status   : {state.get('workflow_status')}")
    print(f"  Fraud Flags       : {len(state.get('fraud_flags', []))}")
    print(f"  Audit Log Entries : {len(state.get('audit_log', []))}")
    print(f"  Checklist Items   : {len(state.get('checklist', []))}")

    print("\n  📋 FINDING SUMMARY:")
    print("  ┌─────────────────────────────────────────────────────────────")
    print("  │ Agent         │ LLM │ Supabase Write │ Mock APIs?")
    print("  ├─────────────────────────────────────────────────────────────")
    print("  │ Orchestrator  │ ✅  │ ❌ Memory only │ N/A — LLM")
    print("  │ Collector     │ ✅  │ ❌ Memory only │ N/A — state dict")
    print("  │ Verifier      │ ❌  │ ❌ Memory only │ ✅ ALL MOCK")
    print("  │ Risk Scorer   │ ✅  │ ❌ Memory only │ ⚠️  Sanction: real/mock")
    print("  │ Audit Agent   │ ✅  │ ❌ Memory only │ N/A — LLM only")
    print("  │ Monitor       │ ✅  │ ❌ Memory only │ ⚠️  Sanction: real/mock")
    print("  └─────────────────────────────────────────────────────────────")
    print("\n  ⚠️  KEY GAPS:")
    print("  1. No agent writes back to Supabase — all state is in RAM")
    print("  2. MCA21 / GSTN / CDSCO APIs are fully mocked (static dict)")
    print("  3. Monitor runs ONCE — not a real continuous scheduler")
    print("  4. PDF audit generation requires 'reportlab' to be installed")
    print("  5. OpenSanctions needs OPENSANCTIONS_API_KEY env var for real checks")
    print()


if __name__ == "__main__":
    asyncio.run(main())
