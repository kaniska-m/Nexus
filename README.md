<p align="center">
  <img src="https://img.shields.io/badge/NEXUS-Vendor%20Verification-0d9488?style=for-the-badge&labelColor=0f1f3d" alt="Nexus Badge"/>
  <br/>
  <img src="https://img.shields.io/badge/ET%20AI%20Hackathon%202026-Track%202-2563eb?style=flat-square" alt="Hackathon Track"/>
  <img src="https://img.shields.io/badge/Agents-6%20Specialized-d97706?style=flat-square" alt="Agents"/>
  <img src="https://img.shields.io/badge/Tests-172%20Passing-16a34a?style=flat-square" alt="Tests"/>
  <img src="https://img.shields.io/badge/Autonomy-17%2F19%20Steps-0d9488?style=flat-square" alt="Autonomy"/>
</p>

<h1 align="center">NEXUS</h1>
<h3 align="center">Agentic AI for Cross-Boundary Vendor Verification</h3>

<p align="center">
  <em>A multi-agent AI platform that autonomously manages the entire vendor verification workflow across two organizations — from the buyer raising a request to a regulator-ready audit pack being delivered.</em>
</p>

---

## Table of Contents

- [The Problem](#the-problem)
- [What Nexus Does](#what-nexus-does)
- [System Architecture](#system-architecture)
- [Multi-Agent Pipeline](#multi-agent-pipeline)
- [LangGraph Workflow DAG](#langgraph-workflow-dag)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Design Decisions](#design-decisions)

---

## The Problem

Every regulated company — hospitals, banks, pharma manufacturers — must verify new vendors before transacting. This process, called **vendor due diligence**, is mandatory, complex, and completely broken.

| What Happens Today | Impact |
|---|---|
| Procurement sends a 100–300 question Word doc over email | Weeks of back-and-forth |
| Supplier fills it out manually over 2–3 days | Error-prone, inconsistent |
| Legal team reads every answer line by line | 6–8 hours per vendor |
| Compliance officer logs into MCA21, GSTN, CDSCO portals separately | Fragmented verification |
| If anything is missing or expired, the entire cycle restarts | **Average: 5–8 weeks per vendor** |

**The real gap:** Every existing AI tool works *inside one company*. Nexus works **across two companies**. That buyer–supplier boundary is where the actual workflow pain lives — and no agent system today handles this cross-boundary verification.

---

## What Nexus Does

Nexus deploys **6 specialized AI agents** that collaborate autonomously to verify documents, check regulatory compliance, detect fraud, assess risk, monitor vendor health, and generate audit trails — all in real-time.

<table>
<tr>
<td width="50%">

### Without Nexus
- 100–300 question Word doc via email
- Supplier fills manually over 3 days
- Staff reads every answer by hand
- Manual logins to MCA21, GSTN, CDSCO
- Certificates checked one by one
- **5–8 weeks average turnaround**

</td>
<td width="50%">

### With Nexus
- AI-generated smart form, structured and precise
- Collector agent chases missing items automatically
- Verifier agent reads and validates every document
- APIs queried automatically in minutes
- Risk score generated with full written reasoning
- **2 days. One human approval click.**

</td>
</tr>
</table>

> **The Nexus Promise:** If you can write down the compliance rules, Nexus enforces them — faster, more consistently, and with a complete audit trail that no human process can match.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         NEXUS PLATFORM                               │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │    Buyer      │   │   Supplier   │   │   Vendor     │            │
│  │  Dashboard    │   │    Portal    │   │   Health     │  Frontend  │
│  │ (Live Agent   │   │ (Doc Upload  │   │  (Continuous │  (React +  │
│  │  Activity)    │   │  + Progress) │   │  Monitoring) │ Tailwind)  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘            │
│         │                  │                   │                     │
│ ────────┼──────────────────┼───────────────────┼──────────────────── │
│         │          REST API + SSE              │                     │
│         ▼                  ▼                   ▼                     │
│  ┌──────────────────── FastAPI ──────────────────────────┐          │
│  │                                                       │          │
│  │   ┌───────────────────────────────────────────────┐   │          │
│  │   │          LangGraph Workflow DAG                │   │          │
│  │   │                                               │   │          │
│  │   │  Orchestrator → Collector → Verifier →        │   │          │
│  │   │  Risk Scorer → Audit Agent → [Complete/Halt]  │   │          │
│  │   │                                               │   │          │
│  │   │  + Monitor Agent (post-approval loop)         │   │          │
│  │   └───────────────────────────────────────────────┘   │          │
│  │                                                       │          │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐          │  Tools   │
│  │   │  MCA21   │  │   GSTN   │  │  CDSCO   │          │          │
│  │   │ Mock API │  │ Mock API │  │ Mock API │          │          │
│  │   └──────────┘  └──────────┘  └──────────┘          │          │
│  │   ┌────────────────────┐  ┌──────────────────┐       │          │
│  │   │ OpenSanctions API  │  │   PDF Reader     │       │          │
│  │   │   (Real API)       │  │   (PyMuPDF)      │       │          │
│  │   └────────────────────┘  └──────────────────┘       │          │
│  └───────────────────────────────────────────────────────┘          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  Supabase (PostgreSQL + Auth + Realtime + Storage)       │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                      │
│  LLM: Groq (Llama 3.1 8B Instant) — Free Tier                      │
│  Emails: Resend    |    Vector DB: ChromaDB    |    Charts: Recharts │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Agent Pipeline

Nexus uses **6 specialized agents** in a directed orchestration graph. Each agent perceives its environment, reasons against rules, takes action, and adapts from outcomes. This is not a chatbot or a linear prompt chain.

| # | Agent | Role | Key Actions | GenAI Usage |
|---|-------|------|-------------|-------------|
| 1 | **Orchestrator** | The Brain — workflow control | Reads industry, generates dynamic compliance checklist, assigns tasks, detects stalls, escalates failures | LLM generates compliance checklist from regulatory knowledge — **no hardcoding required**. New industry = zero code changes |
| 2 | **Collector** | Document intake & chasing | Smart form generation, tracks submitted vs pending, auto-sends contextual reminders, validates format | LLM drafts reminders **tailored to exactly what is missing** per supplier — not generic templates |
| 3 | **Verifier** | Document verification & fraud detection | Reads PDFs via OCR, checks expiry dates and cert numbers, cross-references MCA21/GSTN/CDSCO APIs | LLM extracts **structured fields from unstructured PDFs** — expiry dates, registration numbers, signatures |
| 4 | **Risk Scorer** | Risk intelligence & reasoning | Sanction list screening (OpenSanctions), risk scoring (Low/Medium/High), halt recommendations | LLM generates a **human-readable risk rationale narrative** — not just a number |
| 5 | **Audit Agent** | Compliance audit trail | Decision compilation, timestamped logging, regulator-ready PDF audit pack generation | LLM formats decision log into **regulator-appropriate language** |
| 6 | **Monitor** | Post-approval health surveillance | Certificate expiry tracking, risk drift detection, SLA performance, continuous sanction screening | LLM reasons across multiple signals to produce a **narrative health summary** with recommended actions |

---

## LangGraph Workflow DAG

The pipeline is a **Directed Acyclic Graph (DAG)** with conditional branching — not a simple chain. Agents communicate through a shared state object managed by the Orchestrator.

```
                    ┌─────────────┐
                    │ Orchestrator│
                    │  (Entry)    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
               ┌────│  Collector  │────┐
               │    └──────┬──────┘    │
               │           │           │
          ┌────▼────┐      │     ┌─────▼─────┐
          │Collector│      │     │  Escalate  │──→ END
          │ (Retry) │      │     │ (Human)    │
          └─────────┘      │     └────────────┘
                    ┌──────▼──────┐
               ┌────│  Verifier   │────┐
               │    └──────┬──────┘    │
               │           │           │
          ┌────▼────┐      │     ┌─────▼─────┐
          │Collector│      │     │   HALT     │──→ END
          │(Resubm.)│      │     │  (Fraud)   │
          └─────────┘      │     └────────────┘
                    ┌──────▼──────┐
               ┌────│ Risk Scorer │────┐
               │    └──────┬──────┘    │
               │           │           │
               │    ┌──────▼──────┐    │
               │    │ Audit Agent │    │
               │    └──────┬──────┘    │
               │           │           │
               │          END     ┌────▼────┐
               └──────────────────│  HALT   │──→ END
                                  └─────────┘
```

### Conditional Branching Logic

| Scenario | What Happens | DAG Path |
|---|---|---|
| **Happy path** | All docs submitted, all verified | Orchestrator → Collector → Verifier → Risk Scorer → Audit → END |
| **Missing document** | Collector retries 2x, then escalates | Collector → `collector_retry` → ... → `escalate` → END |
| **Failed verification** | Verifier flags, Collector re-requests | Verifier → `collector_resubmit` → Collector |
| **Fraud signal** | Immediate halt, no retry | Verifier → `halt` → END |
| **Sanction match** | Risk Scorer halts workflow | Risk Scorer → `halt` → END |
| **Supplier unresponsive** | Auto-escalation to compliance officer | Orchestrator escalates after stall detection |

### Three-Level Error Recovery

| Failure | Level 1 — Auto Retry | Level 2 — Re-route | Level 3 — Human |
|---|---|---|---|
| Document missing | Collector re-requests after 12 hrs | Orchestrator contacts senior supplier | Flag to buyer compliance officer |
| Certificate expired | Verifier flags, Collector requests renewal | Supplier gets deadline warning | Block approval until renewed |
| API timeout | Verifier retries 3x with backoff | Marks as Pending Verification | Human manually checks |
| **Fraud signal** | **Immediate halt — no retry** | Orchestrator escalates immediately | Compliance officer reviews |

---

## Key Features

### Two Portals — Cross-Boundary Orchestration

- **Buyer Dashboard** — Hospital/company raises vendor requests, watches agent activity live, reviews only flagged exceptions, tracks time saved, downloads audit packs
- **Supplier Portal** — Vendor receives structured smart form, uploads documents, sees pending vs approved status, gets automatic reminders for missing items

### Real-Time Agent Activity Feed

- Live Server-Sent Events (SSE) streaming during pipeline execution
- Supabase Realtime subscriptions for instant state updates
- Semantic agent icons and color-coded activity entries
- Typing indicator animations between pipeline stages

### Post-Approval Monitoring (6th Agent)

The Monitor Agent transforms Nexus from a one-time tool into a **permanent compliance infrastructure**:

| Signal | What's Watched | Auto Response |
|---|---|---|
| Certificate expiry | ISO certs, drug licences, GST — all expiry dates tracked | 30-day Amber warning → 7-day Red alert → Auto-suspension |
| Risk score drift | MCA21 director changes, GST filing gaps, news sentiment | Re-verification triggered, compliance officer alerted |
| SLA performance | Delivery timelines, quality rates, invoice disputes | Recovery plan generated, procurement head notified |
| Sanction updates | Government-published sanction/blacklists | Immediate halt on new POs, full re-verification |

### Vendor Health Dashboard

Every approved vendor gets a live health score:
- **Green (Healthy)** — All certs valid, risk stable, SLA met. Monitoring continues on schedule.
- **Amber (Watch)** — One signal drifting (cert expiring, minor SLA slip). Auto-renewal request sent.
- **Red (Action Required)** — Critical issue (cert expired, sanction match, risk surge). Immediate alert + PO block.

### Regulator-Ready Audit Trail

- Every agent decision logged with timestamp, reasoning, and outcome
- PDF audit pack generated via ReportLab with full provenance chain
- Complete chain-of-custody for regulatory compliance
- Immutable audit log — satisfies enterprise compliance requirements

### Email Notifications (Resend)

Automated emails for: onboarding started, document reminders, verification complete, fraud alerts, health alerts, and human approval requests.

### Fraud Pattern Detection (ChromaDB)

Vector database seeded with 15+ fraud scenarios for semantic similarity matching against submitted documents and vendor profiles.

---

## Tech Stack

| Category | Technology | Why |
|---|---|---|
| **Agent Framework** | LangGraph | Stateful directed graph — perfect for multi-agent DAG with conditional branching and error recovery |
| **LLM** | Groq (Llama 3.1 8B Instant) | Free tier, 30 req/min — separate temp configs for heavy (compliance analysis) vs light (summaries) tasks |
| **Backend** | FastAPI (Python) | Async agent orchestration, webhook endpoints, shared state management, SSE streaming |
| **Frontend** | Next.js 14 + React 18 + Tailwind CSS 3 | App Router, server components, responsive UI with glassmorphism design |
| **Database** | Supabase (PostgreSQL) | Auth, Realtime subscriptions, Row Level Security, Storage for document uploads |
| **Government APIs** | MCA21, GSTN, CDSCO (simulated) | Realistic response structure — mock APIs return production-accurate data shapes |
| **Sanction Screening** | OpenSanctions | Real API for checking vendors against global sanction/watchlists |
| **PDF Processing** | PyMuPDF (fitz) | Extract text, cert numbers, expiry dates from unstructured PDFs |
| **Audit PDF** | ReportLab | Generates formatted, timestamped, regulator-ready PDF reports |
| **Vector DB** | ChromaDB | Local persistent store for fraud pattern semantic search |
| **Email** | Resend | Transactional emails with branded Nexus HTML templates |
| **Charts** | Recharts | Dashboard visualizations and vendor analytics |
| **Testing** | pytest + pytest-asyncio | 172 tests covering agents, tools, API routes, models, graph, integration |

---

## Project Structure

```
nexus-vendor-onboarding-platform/
│
├── backend/                          # Python — FastAPI + LangGraph
│   ├── agents/                       # 6 specialized AI agents
│   │   ├── orchestrator.py           #   The Brain: dynamic checklist gen, workflow control
│   │   ├── collector.py              #   Document intake, smart form, auto-chase reminders
│   │   ├── verifier.py               #   PDF reading, API cross-referencing, fraud detection
│   │   ├── risk_scorer.py            #   Sanction screening, risk scoring, halt logic
│   │   ├── audit_agent.py            #   Decision compilation, PDF audit pack generation
│   │   └── monitor_agent.py          #   Post-approval: cert expiry, risk drift, SLA checks
│   │
│   ├── api/                          # FastAPI routes
│   │   ├── main.py                   #   Core server: onboard, status, pipeline, monitor
│   │   ├── buyer_routes.py           #   Buyer dashboard endpoints
│   │   ├── supplier_routes.py        #   Supplier portal endpoints (doc upload, status)
│   │   ├── monitor_routes.py         #   Health monitoring endpoints
│   │   └── notify_routes.py          #   Email notification dispatch
│   │
│   ├── graph/
│   │   └── nexus_graph.py            # LangGraph DAG: 7 nodes, 3 conditional edge functions
│   │
│   ├── models/                       # Pydantic V2 data models
│   │   ├── vendor.py                 #   VendorState, ChecklistItem, FraudFlag, AuditLogEntry
│   │   ├── audit.py                  #   Audit response models
│   │   └── checklist.py              #   Checklist schemas
│   │
│   ├── tools/                        # External integrations
│   │   ├── mca21_tool.py             #   Ministry of Corporate Affairs API (simulated)
│   │   ├── gstn_tool.py              #   GST Network API (simulated)
│   │   ├── cdsco_tool.py             #   Drug regulatory API (simulated)
│   │   ├── pdf_reader.py             #   PyMuPDF-based document extraction
│   │   └── sanction_checker.py       #   OpenSanctions integration
│   │
│   └── utils/
│       ├── llm_wrapper.py            #   Groq LLM client (heavy/light model routing)
│       ├── state_manager.py          #   Thread-safe centralized vendor state
│       ├── pdf_generator.py          #   ReportLab audit PDF generation
│       ├── chroma_client.py          #   ChromaDB: fraud pattern seeding + semantic search
│       └── resend_client.py          #   Resend email transport with Nexus HTML templates
│
├── app/                              # Next.js 14 App Router
│   ├── api/                          #   Server-side API routes
│   │   ├── onboard/                  #     POST /api/onboard
│   │   ├── pipeline/[vendorId]/      #     POST /api/pipeline/:id (SSE streaming)
│   │   └── notify/                   #     POST /api/notify (email dispatch)
│   ├── dashboard/                    #   Buyer Dashboard page
│   ├── login/                        #   Supabase Auth login page
│   ├── supplier/                     #   Supplier Portal page
│   ├── layout.tsx                    #   Root layout with NavBar + CommandPalette
│   └── globals.css                   #   Global styles + animation keyframes
│
├── components/                       # Shared React components (Next.js)
│   ├── NavBar.jsx                    #   Top navigation with user avatar + connection status
│   ├── CommandPalette.jsx            #   Ctrl+K keyboard navigation
│   ├── RealtimeProvider.tsx          #   Supabase Realtime context
│   ├── AgentActivityFeed.jsx         #   Live SSE + Realtime activity feed
│   ├── VendorDetailDrawer.jsx        #   Slide-over: Overview + Audit Trail tabs
│   ├── VendorHealthDrawer.jsx        #   Health status details with risk grid
│   ├── VendorRequestCard.jsx         #   Vendor card with status badges
│   ├── TimeSavedCounter.jsx          #   Animated count-up ROI counter
│   ├── HealthScoreBadge.jsx          #   Green/Amber/Red health indicator
│   ├── RiskScoreCard.jsx             #   Risk level display with rationale
│   ├── ExceptionPanel.jsx            #   Exception/flag details panel
│   └── AuditTrailViewer.jsx          #   Timestamped agent action viewer
│
├── frontend/                         # Vite + React frontend (standalone)
│   └── src/
│       ├── api/nexusApi.js           #   Centralized API client (axios)
│       ├── pages/                    #   BuyerDashboard, SupplierPortal, VendorHealth, AuditLogs
│       └── components/               #   Matching component set for Vite build
│
├── lib/                              # Shared utilities (Next.js)
│   ├── api.ts                        #   Server-side API helpers
│   ├── types.ts                      #   TypeScript type definitions
│   ├── groq.ts                       #   Groq LLM client configuration
│   ├── tools.ts                      #   Government API tool wrappers
│   ├── chroma.ts                     #   ChromaDB integration
│   ├── resend.ts                     #   Email template + transport
│   └── supabase/                     #   Supabase client (browser + server)
│
├── supabase/                         # Database
│   ├── migrations/
│   │   ├── 001_schema.sql            #   8 tables: profiles, vendors, checklist_items,
│   │   │                             #   fraud_flags, audit_logs, exceptions, documents,
│   │   │                             #   monitoring_signals
│   │   └── 002_rls.sql              #   Row Level Security policies
│   └── seed.sql                      #   3 realistic demo vendors with full data
│
├── data/
│   ├── compliance_rules/
│   │   └── medtech.json              #   MedTech industry compliance rule definitions
│   └── sample_vendors/
│       └── sample_vendor_1.json      #   Sample vendor data for testing
│
├── tests/                            # 172 passing tests
│   ├── conftest.py                   #   Shared fixtures, mocks, async test config
│   ├── test_orchestrator.py          #   Orchestrator agent unit tests
│   ├── test_collector.py             #   Collector agent unit tests
│   ├── test_verifier.py              #   Verifier agent unit tests
│   ├── test_risk_scorer.py           #   Risk Scorer agent unit tests
│   ├── test_audit_agent.py           #   Audit Agent unit tests
│   ├── test_monitor_agent.py         #   Monitor Agent unit tests
│   ├── test_nexus_graph.py           #   LangGraph DAG structure + edge tests
│   ├── test_pipeline_integration.py  #   End-to-end pipeline integration tests
│   ├── test_models.py               #   Pydantic model validation tests
│   ├── test_state_manager.py         #   State management tests
│   ├── test_llm_wrapper.py           #   LLM client tests
│   ├── test_mca21_tool.py            #   MCA21 API tool tests
│   ├── test_gstn_tool.py             #   GSTN API tool tests
│   ├── test_cdsco_tool.py            #   CDSCO API tool tests
│   ├── test_pdf_reader.py            #   PDF extraction tests
│   ├── test_sanction_checker.py      #   Sanction screening tests
│   ├── test_api_main.py              #   Core API route tests
│   ├── test_api_buyer.py             #   Buyer route tests
│   ├── test_api_supplier.py          #   Supplier route tests
│   └── test_api_monitor.py           #   Monitor route tests
│
├── middleware.ts                     # Next.js auth middleware (role-based routing)
├── requirements.txt                  # Python dependencies
├── package.json                      # Node.js dependencies (Next.js root)
├── pytest.ini                        # Test configuration
├── .env.example                      # Environment variable template
├── DEMO_GUIDE.md                     # Step-by-step demo scenarios for judges
└── log.md                            # Development log
```

---

## Getting Started

### Prerequisites

| Requirement | Min Version | Notes |
|---|---|---|
| Python | 3.10+ | Backend agents + API |
| Node.js | 18+ | Frontend (Next.js or Vite) |
| Groq API Key | Free | [Get key → console.groq.com/keys](https://console.groq.com/keys) |
| Supabase Project | Free | [Create project → supabase.com](https://supabase.com) (optional — backend runs with in-memory state) |

### 1. Clone & Configure

```bash
git clone https://github.com/kaniska-m/Nexus-vendor-onboarding-platform.git
cd Nexus-vendor-onboarding-platform
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# Required
GROQ_API_KEY=your-groq-api-key-here

# Optional (Supabase — for Realtime + Auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional (Emails)
RESEND_API_KEY=your-resend-key
```

### 2. Start the Backend (FastAPI)

```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
python -m backend.api.main
```

The backend runs at **http://localhost:8000**.  
Swagger UI is available at **http://localhost:8000/docs**.

> On startup, the backend automatically seeds **3 demo vendors** (MedTech, IT, Pharma) with full checklist, audit log, and monitoring data — ready for demo.

### 3. Start the Frontend

**Option A — Vite (standalone React frontend):**
```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

**Option B — Next.js (full-stack with Supabase Auth + Realtime):**
```bash
npm install
npm run dev
# Runs at http://localhost:3000
```

### 4. Open the Platform

| Portal | URL | Description |
|---|---|---|
| **Buyer Dashboard** | `/buyer` or `/dashboard` | Onboard vendors, watch agents work, review exceptions |
| **Supplier Portal** | `/supplier/{vendor_id}` | Upload documents, track progress, see checklist |
| **Vendor Health** | `/dashboard` (Health tab) | Monitor Green/Amber/Red vendor health scores |
| **Audit Logs** | `/dashboard` (Audit tab) | Search, filter, and export agent decision logs |

---

## API Reference

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check — verifies server + seeds ChromaDB |
| `POST` | `/api/vendor/onboard` | Start new vendor onboarding (triggers Orchestrator) |
| `GET` | `/api/vendor/{id}/status` | Get current vendor verification state |
| `POST` | `/api/vendor/{id}/run-pipeline` | Run full LangGraph DAG pipeline |
| `GET` | `/api/vendor/{id}/audit-pdf` | Download generated audit PDF |
| `POST` | `/api/vendor/{id}/monitor` | Run Monitor Agent health check |
| `GET` | `/api/python_memory/vendors` | List all vendors (in-memory state) |

### Sub-Routers

| Prefix | Router | Endpoints |
|---|---|---|
| `/api/buyer` | Buyer Dashboard | Vendor listing, stats, exceptions |
| `/api/supplier` | Supplier Portal | Document upload, status, checklist |
| `/api/monitor` | Monitoring | Health checks, vendor health listing |
| `/api/notify` | Notifications | Email dispatch (Resend integration) |

### Response Format

All API responses follow a standardized format:

```json
{
  "status": "success",
  "data": { ... },
  "agent_actions_taken": ["Orchestrator: Generated checklist", "..."],
  "timestamp": "2026-03-29T13:00:00Z",
  "message": "Vendor onboarding initiated. 6 items generated for MedTech."
}
```

---

## Testing

The project maintains **172 passing tests** covering every layer of the system:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=term-missing

# Run specific test suites
pytest tests/test_orchestrator.py          # Agent tests
pytest tests/test_nexus_graph.py           # DAG structure tests
pytest tests/test_pipeline_integration.py  # End-to-end
pytest tests/test_api_main.py              # API route tests
```

### Test Coverage

| Suite | Files | What's Tested |
|---|---|---|
| **Agent Tests** (6) | `test_orchestrator`, `test_collector`, `test_verifier`, `test_risk_scorer`, `test_audit_agent`, `test_monitor_agent` | Agent behavior, state mutations, LLM interactions, edge cases |
| **Tool Tests** (5) | `test_mca21_tool`, `test_gstn_tool`, `test_cdsco_tool`, `test_pdf_reader`, `test_sanction_checker` | API responses, error handling, data extraction |
| **API Tests** (4) | `test_api_main`, `test_api_buyer`, `test_api_supplier`, `test_api_monitor` | HTTP endpoints, request/response validation, error codes |
| **Core Tests** (3) | `test_models`, `test_state_manager`, `test_llm_wrapper` | Pydantic models, state CRUD, LLM config |
| **Integration** (2) | `test_nexus_graph`, `test_pipeline_integration` | DAG compilation, full pipeline flow, conditional edges |

---

## Design Decisions

1. **LLM Routing for Cost Efficiency** — Heavy tasks (compliance analysis, fraud detection, risk scoring) use higher temperature configs. Light tasks (reminders, summaries, form validation) use lower-cost configs. Estimated cost per vendor: **under $0.15 USD**.

2. **Centralized State via `NexusStateManager`** — All 6 agents share a thread-safe state manager. Single source of truth eliminates data inconsistency across the pipeline.

3. **Conditional DAG, Not a Chain** — LangGraph conditional edges (`should_proceed_to_verification`, `should_proceed_after_verification`, `should_proceed_after_risk`) enable granular routing based on real-time data. Each branch handles a specific failure mode.

4. **Simulated Government APIs with Real Structure** — MCA21/GSTN/CDSCO tools return production-accurate response shapes (CIN format, GST structure, licence numbers) — ready for real API swap with zero agent changes.

5. **Post-Approval Monitoring** — The 6th agent turns Nexus from a one-time onboarding tool into permanent compliance infrastructure. No other typical vendor system offers continuous automated re-verification.

6. **Supabase Realtime for Live Updates** — Postgres changes → WebSocket → React state. Dashboard vendor cards flash on status changes. Audit logs slide in as agents write them. Zero polling required.

7. **172 Tests Before Demo** — Full pytest suite ensures the multi-agent pipeline, conditional edges, API routes, and tools all behave correctly under both happy paths and error scenarios.

---

<p align="center">
  <strong>NEXUS — Verify Once. Trust Always.</strong>
  <br/>
  <em>Built for the ET AI Hackathon 2026 — Track 2: Autonomous Enterprise Workflows</em>
</p>
