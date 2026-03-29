<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg" alt="Nexus Logo" width="80" height="80">
  
  # Nexus: Autonomous Vendor Compliance & Integrity Platform
  
  **An Agentic Workflow Engine for End-to-End Enterprise Vendor Onboarding**
</div>

---

Nexus represents a paradigm shift in corporate compliance. Traditional vendor onboarding is a slow, manual process prone to human error, document forgery, and data silos. Nexus solves this by deploying a **team of six specialized AI agents** orchestrated via a LangGraph Directed Acyclic Graph (DAG) to autonomously verify, score, and monitor suppliers in real-time.

## 🌟 Key Features

- **True Agentic Autonomy:** Once a vendor is onboarded, the LangGraph pipeline triggers automatically. Agents handle document collection, text extraction, API cross-referencing, and risk scoring sequentially without human intervention.
- **RAG-Powered Fraud Detection:** The Verifier agent utilizes ChromaDB vector similarity search to compare detected discrepancies against known fraud patterns (e.g., shell companies, forged certificates).
- **Graceful Degradation & Escalation:** Built-in conditional branching. If a vendor fails to upload documents, the Collector initiates a retry loop. If critical fraud is detected, the workflow HALTS and ESCALATES to a human compliance officer.
- **Persistent Audit Trails:** Every LLM decision, API check, and risk rationale is permanently logged to Supabase to ensure regulatory readiness.
- **Measurable Business Value:** Automating the 18 manual touchpoints of traditional onboarding reduces processing time from 3-5 days to under 30 minutes, representing a ~71% reduction in compliance costs.

---

## 🧠 The Agentic Architecture

Nexus is built on **LangGraph**, treating the onboarding process as a stateful, branching workflow. 

### Multi-Agent Workflow Diagram

```mermaid
graph TD
    classDef agent fill:#0f1f3d,stroke:#2dd4bf,stroke-width:2px,color:#fff;
    classDef state fill:#f8fafc,stroke:#94a3b8,color:#334155;
    classDef human fill:#ef4444,stroke:#991b1b,stroke-width:2px,color:#fff;

    Start([Vendor Onboarded]) --> Orchestrator

    subgraph LangGraph Pipeline
        Orchestrator("Orchestrator Agent<br/>Generates dynamic checklist") ::: agent
        Collector("Collector Agent<br/>Tracks doc uploads") ::: agent
        Verifier("Verifier Agent<br/>Validates PDFs & checks APIs") ::: agent
        RiskScorer("Risk Scorer Agent<br/>Calculates risk & rationale") ::: agent
        AuditAgent("Audit Agent<br/>Compiles immutable log") ::: agent
    end

    Orchestrator --> Collector
    
    Collector -->|Docs Missing| RetryWait[Wait / Remind] ::: state
    RetryWait -->|Loop < 3x| Collector
    RetryWait -->|Retry Exhausted| Escalate(Human Escalation) ::: human
    
    Collector -->|Docs Uploaded| Verifier
    
    Verifier -->|Fraud Detected| Halt(Workflow Halted) ::: human
    Verifier -->|Docs Expired/Failed| Collector
    Verifier -->|Verified Clean| RiskScorer
    
    RiskScorer -->|Sanction Match| Halt
    RiskScorer -->|Scored| AuditAgent
    
    AuditAgent --> End([Workflow Complete])
```

---

## 🤖 Meet the Agents

Nexus splits responsibilities across specialized agents to prevent hallucination and ensure strict separation of concerns:

1. **Orchestrator Agent**: The project manager. Analyzes the vendor's profile (industry, location, size) and dynamically generates a required compliance checklist (e.g., GSTIN, CDSCO for Pharma).
2. **Collector Agent**: The operator. Monitors the Supabase blob storage for document uploads. Understands which documents are pending and handles supplier notifications/retry loops.
3. **Verifier Agent**: The investigator. Reads raw PDF text via PyMuPDF. Uses an LLM to validate document relevance, extracts key fields via regex, cross-references with government APIs (MCA21, GSTN), and queries ChromaDB for RAG-based fraud pattern matching.
4. **Risk Scorer Agent**: The analyst. Evaluates the aggregate findings of the Verifier. Checks the vendor against sanctions lists and uses an LLM to write a comprehensive, defensible risk rationale paragraph determining a Low, Medium, or High score.
5. **Audit Agent**: The scribe. Compiles every action, reasoning step, and timestamp into an immutable audit log, saving the final payload to Supabase for regulatory review.
6. **Monitor Agent (Daemon)**: The watchdog. A background agent that periodically sweeps established vendors for expired certificates or new adverse media.

---

## 🛠️ Technology Stack

- **Orchestration**: LangGraph, LangChain
- **LLM**: Groq (Llama-3/Mixtral) for high-speed, cost-efficient reasoning
- **Vector DB / RAG**: ChromaDB (locally hosted)
- **Backend Framework**: Python FastAPI
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL, Blob Storage)
- **Document Processing**: PyMuPDF (`fitz`)

---

## 🚀 Setup Instructions

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/kaniska-m/Nexus.git
cd Nexus

# Frontend
npm install

# Backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 2. Environment Variables
Create a `.env` file in the root directory based on `.env.example`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LLM 
GROQ_API_KEY=your_groq_api_key

# Optional APIs
OPENSANCTIONS_API_KEY=your_sanctions_key
```

### 3. Run the Platform
You must run both the Next.js frontend and the FastAPI backend concurrently.

```bash
# Terminal 1: Run Next.js Frontend (Port 3000)
npm run dev

# Terminal 2: Run FastAPI Backend (Port 8000)
source venv/bin/activate
uvicorn backend.api.main:app --reload --port 8000
```

Access the dashboard at `http://localhost:3000`.

---

## 💡 Hackathon Evaluation Notes

This project was built to address the **Agentic Architecture Evaluation Criteria**:

- **Autonomy**: Pipeline executes 5+ sequential steps fully autonomously via LangGraph upon vendor creation.
- **Error Recovery & Branching**: Demonstrated live via the Collector retry loop and the Verifier's strict Fraud Halt edges.
- **Advanced Patterns**: Implements **Retrieval-Augmented Generation (RAG)** using ChromaDB to validate fraud signals against known historical patterns.
- **Graceful Degradation**: Clear fallback mechanisms when APIs fail, ensuring the workflow enters a manual review state rather than crashing.

---
<div align="center">
  <i>Built for the Future of Compliance.</i>
</div>
