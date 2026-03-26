# 🔷 Nexus — Multi-Agent Vendor Verification Platform

> **AI-powered vendor onboarding and compliance verification using autonomous multi-agent orchestration.**

Nexus eliminates manual vendor verification bottlenecks by deploying specialized AI agents that collaborate to verify documents, check regulatory compliance, assess risk, and generate audit trails — all in real-time.

---

## ⚡ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NEXUS PLATFORM                       │
│                                                         │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐            │
│  │  Buyer   │   │ Supplier │   │ Monitor  │            │
│  │Dashboard │   │  Portal  │   │Dashboard │   Frontend │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘  (React)  │
│       │              │              │                   │
│───────┼──────────────┼──────────────┼───────────────────│
│       │         REST API            │                   │
│       ▼              ▼              ▼                   │
│  ┌─────────────── FastAPI ──────────────────┐          │
│  │                                          │          │
│  │  ┌──────────────────────────────────┐    │          │
│  │  │      LangGraph Workflow DAG      │    │          │
│  │  │                                  │    │          │
│  │  │  Orchestrator → Collector →      │    │          │
│  │  │  Verifier → Risk Scorer →        │    │          │
│  │  │  Audit Agent → [Complete/Halt]   │    │          │
│  │  └──────────────────────────────────┘    │ Backend  │
│  │                                          │          │
│  │  ┌─────────┐  ┌────────┐  ┌──────────┐  │          │
│  │  │ MCA21   │  │  GSTN  │  │  CDSCO   │  │          │
│  │  │ Mock API│  │Mock API│  │ Mock API │  │  Tools   │
│  │  └─────────┘  └────────┘  └──────────┘  │          │
│  │  ┌───────────────────┐  ┌────────────┐  │          │
│  │  │ OpenSanctions API │  │ PDF Reader │  │          │
│  │  │    (Real API)     │  │ (PyMuPDF)  │  │          │
│  │  └───────────────────┘  └────────────┘  │          │
│  └──────────────────────────────────────────┘          │
│                                                         │
│  LLM: Groq (Llama 3.1 8B) — Free Tier                 │
└─────────────────────────────────────────────────────────┘
```

## 🧠 Multi-Agent System

| Agent | Role | Key Actions |
|-------|------|------------|
| **Orchestrator** | Brain — generates dynamic compliance checklists | LLM-powered checklist generation, workflow initialization, stall detection |
| **Collector** | Document intake & tracking | Smart form generation, missing doc reminders, retry logic |
| **Verifier** | Document verification & fraud detection | PDF extraction, MCA21/GSTN/CDSCO API cross-referencing, expiry checks |
| **Risk Scorer** | Risk assessment | Sanction list checks (OpenSanctions), risk scoring, halt recommendations |
| **Audit Agent** | Compliance audit trail | Decision compilation, PDF report generation, workflow completion |
| **Monitor** | Post-approval health monitoring | Certificate expiry, SLA performance, continuous risk assessment |

## 🛠️ Tech Stack

- **Backend**: FastAPI + LangGraph + LangChain + Groq LLM
- **Frontend**: Vite + React 18 + Tailwind CSS 3 + Recharts
- **LLM**: Llama 3.1 8B Instant (via Groq — free tier, 30 req/min)
- **APIs**: OpenSanctions (real), MCA21/GSTN/CDSCO (simulated)
- **PDF Processing**: PyMuPDF (fitz)

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API key (free at https://console.groq.com/keys)

### 1. Clone & Configure
```bash
git clone https://github.com/kaniska-m/Nexus-vendor-onboarding-platform.git
cd Nexus-vendor-onboarding-platform
cp .env.example .env   # Fill in your API keys
```

### 2. Start Backend
```bash
pip install -r requirements.txt
python -m backend.api.main
# Server runs at http://localhost:8000
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

### 4. Open in Browser
- **Buyer Dashboard**: http://localhost:5173/buyer
- **Supplier Portal**: http://localhost:5173/supplier/{vendor_id}

## 📁 Project Structure

```
nexus/
├── backend/
│   ├── agents/           # 6 specialized AI agents
│   ├── api/              # FastAPI routes (main, buyer, supplier, monitor)
│   ├── graph/            # LangGraph DAG workflow definition
│   ├── models/           # Pydantic V2 data models
│   ├── tools/            # MCA21, GSTN, CDSCO, PDF reader, sanction checker
│   └── utils/            # LLM wrapper, state manager
├── frontend/
│   ├── src/
│   │   ├── api/          # Centralized API client
│   │   ├── components/   # Reusable UI components
│   │   └── pages/        # Page components
│   └── ...
├── data/                 # Sample data and compliance rules
├── requirements.txt      # Python dependencies
└── .env                  # Environment configuration
```

## 🔑 Key Design Decisions

1. **LLM Routing**: Heavy tasks (compliance analysis) vs Light tasks (summaries) use separate temperature configs for cost optimization
2. **Centralized State**: All agents share a thread-safe `NexusStateManager` — single source of truth
3. **Conditional Workflow**: LangGraph DAG with conditional edges for retries, escalation, and halt on critical fraud
4. **Comprehensive Audit Trail**: Every agent action logged for regulatory compliance

---

Built with ❤️ for smart compliance automation.
