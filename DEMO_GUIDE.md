# Nexus Vendor Onboarding Platform — Official Demo Guide 🚀

This guide provides step-by-step instructions to fully test and demonstrate the capabilities of the **Nexus Multi-Agent LangGraph Pipeline**. By following these scenarios, you can showcase the system's happy paths, error recovery, automated chasing, and AI-driven fraud detection.

---

## 🛠️ Setup & Preparation

Before starting the demo, ensure both the backend and frontend are running.

1. **Start the Backend (FastAPI)**
   ```bash
   cd backend
   uvicorn api.main:app --reload
   ```
   *The backend will be available at `http://localhost:8000`. You can view the Swagger UI at `http://localhost:8000/docs`.*

2. **Start the Frontend (React/Vite)**
   ```bash
   cd frontend
   npm run dev
   ```
   *The frontend will be available at `http://localhost:5173`.*

---

## 🎬 Scenario 1: The "Happy Path" (Clean IT Vendor)
**Goal:** Show a flawless onboarding experience where all documents are valid, APIs match, and risk is low.

**Steps:**
1. Navigate to the **Buyer Dashboard** (or use the `/api/vendor/onboard` endpoint).
2. Initiate onboarding for a new vendor:
   - **Name:** `TechFlow Solutions`
   - **Industry:** `IT`
   - **Email:** `contact@techflow.local`
3. **What to Watch For (Backend Terminal Logs):**
   - 👀 Watch the **Orchestrator** dynamically generate a checklist (e.g., *Certificate of Incorporation, ISO 27001*).
4. Simulate the vendor submitting the required PDF documents via the **Supplier Portal**.
5. **What to Watch For (Backend Terminal Logs):**
   - 👀 Watch the **Verifier** extract text from the PDF and cross-reference the extracted CIN against the simulated `MCA21` API. It should log "MCA21 verified: Active".
   - 👀 Watch the **Risk Scorer** parse the API results and output a `Low` risk score with a generated rationale.
   - 👀 Watch the **Audit Agent** compile the final decision and generate the Regulator-Ready Audit PDF.
6. Check the **Buyer Dashboard** — the vendor's status should be `Complete`.

---

## 🎬 Scenario 2: The "Sanction Hit" (Critical Fraud Halt)
**Goal:** Demonstrate the system's ability to instantly halt onboarding and flag compliance teams if a vendor appears on a global watch list.

**Steps:**
1. Initiate onboarding for a new vendor:
   - **Name:** `BadCorp` or `North Star Trading` (or any generic name that matches watchlist rules).
   - **Industry:** `Logistics`
2. Submit a dummy document for them.
3. **What to Watch For (Backend Terminal Logs):**
   - 👀 Watch the **Risk Scorer** query the `Sanction Checker Tool`.
   - 👀 The tool will return a high-confidence match against an OFAC or UN sanction list.
   - 👀 Watch the **LangGraph DAG** instantly route to the `halt` node.
   - 👀 The backend will explicitly log: `WORKFLOW HALTED — Critical issue detected`.
4. Check the **Buyer Exceptions Dashboard**. You will see:
   - `Escalation Level`: **3 (Human Review)**
   - `Status`: **Halted**
   - Detailed Fraud Flags mapping out the specific sanction list hit.

---

## 🎬 Scenario 3: The "Ghosting Vendor" (Automated Document Chasing)
**Goal:** Showcase how the Collector agent tracks pending documents and autonomously follows up without human intervention.

**Steps:**
1. Initiate onboarding for a MedTech vendor (this triggers a larger checklist implicitly under `Orchestrator` rules).
   - **Name:** `BioHealth Medical`
   - **Industry:** `MedTech`
2. **Do NOT** submit all the required documents. Submit only one (e.g., GST Certificate) and leave the `CDSCO Medical Device Licence` pending.
3. Trigger the workflow progression (this can be simulated by triggering the `/api/monitor/{id}/run-check` or simply letting the graph re-evaluate).
4. **What to Watch For (Backend Terminal Logs):**
   - 👀 Watch the **Collector** evaluate `documents_submitted` vs `checklist`.
   - 👀 The Collector will see missing documents, increment the `retry_count`, and use the `light` LLM to draft a polite reminder email.
   - 👀 Notice the graph routes to `collector_retry` instead of `verifier`.
5. Trigger the progression 2 more times (to exceed the default `max_retries = 2`).
6. **What to Watch For:**
   - 👀 The LangGraph DAG will evaluate the conditional edge `should_proceed_to_verification` and see retries exceeded.
   - 👀 The graph routes to the `escalate` node.
7. Check the UI: The vendor status is now `Escalated` due to unresponsiveness.

---

## 🎬 Scenario 4: The "Struck-Off Company" (API Cross-Reference Failure)
**Goal:** Show how the Verifier agent protects against forged documents by double-checking assertions against Source-of-Truth government APIs.

**Steps:**
1. You must tweak the mock API response in `backend/tools/mca21_tool.py` temporarily (or use a specific test name if programmed) so that `registration_status` returns `"Strike Off"`.
2. Initiate onboarding and upload a perfectly forged, authentic-looking PDF for "Certificate of Incorporation".
3. **What to Watch For (Backend Terminal Logs):**
   - 👀 The **Verifier** extracts the CIN correctly from the PDF.
   - 👀 The **Verifier** pings the MCA21 API.
   - 👀 The API returns `Strike Off`.
   - 👀 The Verifier immediately flags the document `status` as `failed` and appends a `critical` fraud flag.
4. **What to Watch For (Graph Execution):**
   - 👀 The conditional edge `should_proceed_after_verification` routes the vendor to the `halt` node instead of the `risk_scorer`.
5. Check the UI: The vendor is flagged and halted, protecting your procurement team from onboarding a defunct company.

---

## 💡 Pro-Tips for Delivering the Demo

- **Highlight the "Brain":** Open `backend/graph/nexus_graph.py` on your screen during the demo. Point to the conditional edges (`should_proceed_to_verification`, `should_proceed_after_verification`) to show how the AI makes granular routing decisions based on real-time data.
- **Show the State:** Use the `/api/vendor/{vendor_id}/status` endpoint in a browser tab to show the raw JSON `VendorState` updating in real-time as the agents do their work.
- **Audit Logs:** Emphasize that *every* action taken by *every* agent is logged immutably in the `audit_log` array. Show this JSON object to prove that the system is regulator-ready and transparent.
