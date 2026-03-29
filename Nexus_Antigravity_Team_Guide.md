# Nexus — Complete Build Guide
## Google Antigravity IDE + Groq Free Tier + Two-Person Team Workflow

---

# PART 1 — SETUP (Do this before anything else)

## Step 1: Install Google Antigravity

1. Go to **antigravity.google** → Download for your OS (Windows / Mac / Linux)
2. Run installer → Sign in with your **personal Gmail** (free tier, generous limits)
3. On the Agent Manager config screen, select **"Agent-assisted development"** (recommended — AI helps but you stay in control)
4. Terminal Policy → **Auto** (lets agent run npm/pip commands without asking each time)

Both teammates install Antigravity separately on their own machines. You work on the **same GitHub repo** — Antigravity is just an IDE, not a shared session tool.

---

## Step 2: Free API Keys You Need (Both of You)

Get these before opening Antigravity. All are genuinely free with no credit card:

| Service | What it's for | Free tier | Get it at |
|---------|--------------|-----------|-----------|
| **Groq** | LLM — all 6 AI agents | 30 req/min, generous daily tokens | console.groq.com |
| **Supabase** | Database + Auth + Storage + Realtime | 500MB DB, 1GB storage, unlimited auth | supabase.com |
| **Chroma** | Vector DB (runs locally, zero signup) | Completely free, runs on your machine | pip install chromadb |
| **Resend** | Email notifications | 100 emails/day | resend.com |
| **Vercel** | Deploy frontend | Hobby tier = free | vercel.com |

**Only one teammate needs Groq + Supabase + Resend** — share those keys in a shared `.env.local` file via a private message or shared note. Never commit them to GitHub.

---

## Step 3: Set Up the Shared GitHub Repo

**Teammate A (you) does this:**
```bash
# Create the repo on GitHub — name it nexus-et-hackathon
# Initialize locally:
git init nexus-et-hackathon
cd nexus-et-hackathon
git remote add origin https://github.com/YOUR_USERNAME/nexus-et-hackathon.git

# Create branch structure:
git checkout -b main          # stable, working code only
git push -u origin main

git checkout -b dev           # day-to-day work branch
git push -u origin dev
```

**Teammate B does this:**
```bash
git clone https://github.com/YOUR_USERNAME/nexus-et-hackathon.git
cd nexus-et-hackathon
git checkout dev
```

**Create `.env.local` in project root (never commit this):**
```
# Add to .gitignore immediately:
echo ".env.local" >> .gitignore

# .env.local contents:
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxx
RESEND_API_KEY=re_xxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
CHROMA_URL=   # leave blank — runs in-memory locally
```

Share this file with your teammate via WhatsApp/Telegram DM.

---

## Step 4: Open Antigravity — First Thing to Do

1. Open Antigravity → `File > Open Folder` → select your cloned repo folder
2. You'll see the **Agent panel on the right side**
3. Set model to **Gemini 3 Pro** (default, free, best for code generation)
4. Before pasting any prompt, set up **Rules** (system instructions the agent always follows)

**Setting up Rules** (click `...` top right → Customizations → Rules):

Create a new Rule called `nexus-project-rules` with this content:

```
NEXUS PROJECT RULES — Always follow these:

1. This is a Next.js 14 App Router project with a Python FastAPI backend in /backend/. NEVER modify anything in /backend/ unless explicitly told to.

2. LLM: Use Groq API (groq-sdk npm package) as the ONLY LLM provider. Model for reasoning tasks: llama-3.3-70b-versatile. Model for fast/cheap tasks: llama-3.1-8b-instant. NEVER use Anthropic SDK, OpenAI SDK, or any other LLM provider.

3. Database: Supabase (supabase-js). Read from Supabase in Next.js frontend. Write from both FastAPI and Next.js API routes.

4. Vector DB: Chroma (chromadb npm package). EphemeralClient for local dev (no URL needed). Runs in-memory.

5. Always use TypeScript for new files. Keep existing .jsx components as .jsx.

6. Design system: Do NOT change src/index.css or globals.css colors or fonts. Use existing Tailwind classes: nexus-card, nexus-btn-primary, nexus-btn-outline, nexus-input, nexus-gradient-bg.

7. Every API route must return: { status: "success"|"error", data: {...}, timestamp: ISO_string, message?: string }

8. Commit message format: feat: / fix: / agent: / db: / ui:
```

---

## Step 5: Team Split — Who Builds What

Split the 9 prompts between two people so you work in parallel without conflicts:

| Teammate | Prompts | Files Owned | Branch |
|----------|---------|-------------|--------|
| **A (you)** | 1, 3, 4, 7, 9 | Next.js conversion, DB schema, agent pipeline, polish, deploy | `feat/backend-agents` |
| **B** | 2, 5, 6, 8 | Auth, supplier portal, realtime, visual polish | `feat/frontend-ui` |

**Sync points** (merge to `dev` branch together):
- After Prompt 3 (schema done) — both need it
- After Prompt 4 (agent routes done) — B can start connecting UI to real data
- End of Day — merge both branches to `dev`, resolve conflicts together

**How to avoid conflicts:**
- A owns: `app/api/`, `lib/llm.ts`, `lib/tools.ts`, `lib/chroma.ts`, `lib/supabase/queries.ts`
- B owns: `app/dashboard/`, `app/supplier/`, `components/`, `app/login/`
- Both can freely edit: `lib/types.ts`, `lib/supabase/client.ts`, `globals.css` (coordinate first)

---

# PART 2 — HOW TO USE ANTIGRAVITY (The right way)

## The Antigravity Workflow

Unlike v0 where you paste in a browser, Antigravity works inside your actual codebase. The agent can read your files, run terminal commands, install packages, and verify the result in its built-in browser.

**The loop for each prompt:**

```
1. Open Agent panel (right side)
2. Paste the prompt (see Part 3)
3. Agent shows a PLAN first — READ IT before approving
4. If plan looks correct → click "Approve" or just press Enter
5. Agent writes files, runs npm install, etc.
6. Agent opens browser and verifies the result
7. If something looks wrong → type your correction in chat (don't start over)
8. When satisfied → git add . && git commit -m "feat: ..."
```

**Critical: Always read the plan.** Antigravity generates an implementation plan (called an Artifact) before writing code. This is your checkpoint. If it plans to touch `/backend/` files → stop it and say "do not modify any files in /backend/".

**Iterating without losing context:**
If the agent does something wrong, comment on its output rather than restarting: "The pipeline route is correct but the Groq call uses the wrong model — change to llama-3.3-70b-versatile for the risk scorer and llama-3.1-8b-instant for the collector reminder." The agent keeps the whole context and patches only that part.

---

## Setting Up Workflows (Saved Prompts for Repeated Tasks)

Antigravity lets you save prompts as `/workflows` you can trigger with a slash command. Create these after setup:

Go to `...` → Customizations → Workflows → New Workflow:

**Workflow 1: `/run-agent-test`**
```
Run the Next.js dev server if it's not running, then open the browser to http://localhost:3000/api/health and show me the JSON response. If any service shows status "error", identify which file is causing it and suggest a fix.
```

**Workflow 2: `/seed-db`**
```
Open the Supabase dashboard URL from .env.local, navigate to the SQL editor, and run the contents of supabase/seed.sql. Then verify the vendors table has 3 rows.
```

**Workflow 3: `/commit-and-push`**
```
Show me a diff of all changed files, suggest a conventional commit message starting with feat:/fix:/agent:/db:/ui:, then run: git add . && git commit -m "[your message]" && git push origin [current branch]
```

---

# PART 3 — THE 9 PROMPTS (Groq version, Antigravity-formatted)

Paste these one at a time into the Antigravity Agent panel. Each prompt tells the agent exactly what to build.

---

## PROMPT 1 — Convert to Next.js 14

> **Who runs this:** Teammate A
> **Branch:** `feat/backend-agents`
> **Time:** ~20 min

```
Convert the existing Vite + React frontend to Next.js 14 App Router. The backend in /backend/ must NOT be touched.

EXISTING FRONTEND (in frontend/ or src/ directory):
- Pages: BuyerDashboard.jsx, SupplierPortal.jsx, VendorHealthPage.jsx, AuditLogsPage.jsx
- Components: AgentActivityFeed, AuditTrailViewer, ExceptionPanel, HealthScoreBadge, RiskScoreCard, TimeSavedCounter, VendorDetailDrawer, VendorHealthDrawer, VendorRequestCard
- API client: nexusApi.js with 14 endpoint functions
- Design: index.css with full Tailwind design system, custom colors, fonts

CREATE this Next.js 14 App Router structure at project root:
app/
├── layout.tsx           — Root layout: NavBar, global providers, page title format "Nexus — {page}"
├── page.tsx             — Redirect to /dashboard
├── dashboard/page.tsx   — BuyerDashboard content ("use client")
├── dashboard/health/page.tsx — VendorHealthPage content
├── dashboard/audit/page.tsx  — AuditLogsPage content
├── supplier/[vendorId]/page.tsx — SupplierPortal, no auth required
├── globals.css          — Copy index.css content exactly
components/              — Copy all 9 components, keep .jsx extension
lib/
├── api.ts               — Convert nexusApi.js to TypeScript
next.config.js           — rewrites: /api/backend/* → process.env.BACKEND_URL ?? "http://localhost:8000"
tailwind.config.ts       — Keep exact same custom colors and fonts

RULES:
- Keep all JSX and Tailwind classes exactly as-is
- Replace React Router: useParams/useNavigate/NavLink → next/navigation equivalents
- Add "use client" to any component using hooks or browser APIs
- Keep all deps: lucide-react, react-hot-toast, react-dropzone, recharts
- lib/api.ts base URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"

After creating all files, run: npm install && npm run dev
Then verify the app loads at localhost:3000 in the browser.
```

---

## PROMPT 2 — Supabase Auth with Role-Based Access

> **Who runs this:** Teammate B
> **Branch:** `feat/frontend-ui`
> **Time:** ~15 min
> **Prerequisite:** Prompt 1 must be merged to dev first

```
Add Supabase authentication with role-based access to the Nexus Next.js app.

ROLES:
- buyer: can access /dashboard, /dashboard/health, /dashboard/audit
- supplier: can access /supplier/[vendorId] only (via shared link, no password)
- admin: full access

CREATE these files:

lib/supabase/client.ts:
  import { createBrowserClient } from '@supabase/ssr'
  export const createClient = () => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

lib/supabase/server.ts:
  Server client using @supabase/ssr createServerClient with cookies()

middleware.ts:
  - /dashboard/* → redirect to /login if no session
  - /supplier/* → allow without auth (public supplier link)
  - /login, /signup → redirect authenticated users to /dashboard

app/login/page.tsx — Design requirements:
  - Background: nexus-gradient-bg class (navy → teal diagonal)
  - Center card: max-w-md, nexus-card class, p-8
  - Header: "NEXUS" in font-syne font-bold text-2xl + teal pulsing dot (w-2 h-2 rounded-full bg-teal-400 animate-pulse)
  - Subtitle: "Multi-Agent Vendor Verification Platform" text-sm text-slate-400
  - Email + Password fields: nexus-input class
  - "Sign in" button: nexus-btn-primary, full width
  - "Sign in with Google": nexus-btn-outline, full width
  - Toggle to registration form: name, email, password, role (select: Buyer / Admin)
  - Inline error messages in text-red-400 text-sm
  - Footer: "Powered by AI Agents" text-xs text-slate-500

app/auth/callback/route.ts: Handle OAuth redirect

MODIFY app/layout.tsx — When user is authenticated, NavBar top-right shows:
  - User initials avatar (circle, teal bg)
  - Email (truncated to 20 chars)
  - Role badge: buyer=blue, admin=purple
  - Sign out button → supabase.auth.signOut() → redirect to /login

MODIFY lib/api.ts:
  - Get session with supabase.auth.getSession()
  - Add header: Authorization: Bearer {session.access_token}
  - On 401: call supabase.auth.signOut() + redirect to /login

Install needed packages: @supabase/supabase-js @supabase/ssr
Run npm install and verify login page renders at /login
```

---

## PROMPT 3 — Supabase Database Schema + Seed Data

> **Who runs this:** Teammate A
> **Branch:** `feat/backend-agents`
> **Time:** ~15 min

```
Create the full Supabase database schema for Nexus and seed it with 3 realistic demo vendors.

CREATE supabase/migrations/001_schema.sql:

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  role TEXT CHECK (role IN ('buyer', 'supplier', 'admin')) DEFAULT 'buyer',
  organization TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendors
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  contact_email TEXT,
  contact_name TEXT,
  cin TEXT,
  gst_number TEXT,
  pan_number TEXT,
  registered_address TEXT,
  director_name TEXT,
  director_din TEXT,
  workflow_status TEXT DEFAULT 'pending',
  risk_score TEXT,
  risk_rationale TEXT,
  health_status TEXT DEFAULT 'Green',
  current_step INTEGER DEFAULT 0,
  escalation_level INTEGER DEFAULT 0,
  monitoring_notes TEXT,
  last_monitored TIMESTAMPTZ,
  supplier_portal_link TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checklist items
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  document_name TEXT NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  api_to_check TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  verified_at TIMESTAMPTZ,
  file_url TEXT,
  failure_reason TEXT
);

-- Fraud flags
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES checklist_items(id),
  doc_name TEXT NOT NULL,
  flag_type TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'high',
  detected_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exceptions
CREATE TABLE exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL,
  description TEXT,
  agent TEXT,
  level INTEGER DEFAULT 1,
  requires_human BOOLEAN DEFAULT false,
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documents (uploaded files)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES checklist_items(id),
  document_name TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  submitted_by TEXT
);

-- Monitoring signals
CREATE TABLE monitoring_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_value JSONB,
  trigger_condition TEXT,
  agent_response TEXT,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE supabase/migrations/002_rls.sql:
  -- Enable RLS on all tables
  ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
  ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
  ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE monitoring_signals ENABLE ROW LEVEL SECURITY;

  -- Authenticated users can read all vendors (hackathon demo)
  CREATE POLICY "Authenticated read vendors" ON vendors FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Authenticated read checklist" ON checklist_items FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Authenticated read fraud" ON fraud_flags FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Authenticated read audit" ON audit_logs FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Authenticated read docs" ON documents FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Authenticated read signals" ON monitoring_signals FOR SELECT TO authenticated USING (true);

  -- Public can read a specific vendor by ID (for supplier portal)
  CREATE POLICY "Public read vendor by id" ON vendors FOR SELECT TO anon USING (true);
  CREATE POLICY "Public read checklist by vendor" ON checklist_items FOR SELECT TO anon USING (true);
  CREATE POLICY "Public insert documents" ON documents FOR INSERT TO anon WITH CHECK (true);

  -- Authenticated users can insert/update
  CREATE POLICY "Auth insert vendors" ON vendors FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Auth update vendors" ON vendors FOR UPDATE TO authenticated USING (true);
  CREATE POLICY "Auth insert audit" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Auth insert fraud" ON fraud_flags FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Auth insert exceptions" ON exceptions FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Auth update checklist" ON checklist_items FOR UPDATE TO authenticated USING (true);
  CREATE POLICY "Auth insert signals" ON monitoring_signals FOR INSERT TO authenticated WITH CHECK (true);

CREATE supabase/seed.sql — Insert 3 vendors with realistic data:

Vendor 1: "Global Health Supplies Ltd", industry: MedTech, workflow_status: active, risk_score: Low, health_status: Green
  - 8 checklist items (Certificate of Incorporation → verified, GST → verified, PAN → submitted, ISO 9001 → submitted, CDSCO Licence → pending, ISO 13485 → pending, Drug Master File → pending, Factory Inspection Report → pending)
  - 9 audit logs with timestamps 5 minutes apart: Orchestrator init, Collector form sent, 4 Verifier checks, Risk Scorer assessment, Audit Agent log compile
  - 1 monitoring signal: cert_expiry, days_until_expiry: 28, severity: amber

Vendor 2: "TechFlow Systems Pvt Ltd", industry: IT, workflow_status: escalated, risk_score: High, health_status: Red
  - 6 checklist items (CoI → verified, GST → fraud_flagged, ISO 27001 → pending, SOC 2 → pending, MSME Cert → submitted, NDA → verified)
  - 1 fraud_flag: doc_name "GST Registration Certificate", flag_type "data_mismatch", severity "critical", description "GST number on PDF (07AADCT1234F1Z5) mismatches GSTN API (07AADCT1234F1Z6). Possible document alteration."
  - 1 exception: type verification_failure, level 3, requires_human true
  - 12 audit logs including fraud detection and escalation

Vendor 3: "PharmaChem Gujarat Ltd", industry: Pharma, workflow_status: complete, risk_score: Medium, health_status: Amber
  - 7 checklist items, all verified
  - 1 monitoring signal: risk_drift, news mention with negative sentiment, health_status → Amber
  - 13 audit logs showing complete pipeline
  - monitoring_notes: "Risk drift detected on 2026-03-25. News mention of regulatory inquiry found via web scan. Risk score remains Medium but upward trend flagged. Renewal of Drug Licence recommended within 30 days."

CREATE lib/supabase/queries.ts with these typed functions:
- getVendors(): Promise<Vendor[]>
- getVendorDetail(id: string): Promise<VendorDetail>
- getDashboardSummary(): Promise<DashboardSummary>
- createVendor(data: NewVendor): Promise<Vendor>
- updateVendorStatus(id: string, status: string, step: number): Promise<void>
- getAuditLogs(filters?: AuditFilters): Promise<AuditLog[]>
- getHealthDashboard(): Promise<HealthVendor[]>
- insertAuditLog(vendorId: string, agent: string, action: string, reason?: string, details?: object): Promise<void>
- insertFraudFlag(data: NewFraudFlag): Promise<void>

CREATE lib/types.ts with TypeScript types for all database tables.

After creating files, print instructions telling me to:
1. Go to Supabase dashboard
2. Open SQL Editor
3. Run 001_schema.sql
4. Run 002_rls.sql
5. Run seed.sql
6. Verify vendors table has 3 rows
```

---

## PROMPT 4 — Groq LLM + LangGraph Agent Pipeline

> **Who runs this:** Teammate A
> **Branch:** `feat/backend-agents`
> **Time:** ~30 min — most important prompt, take your time
> **Prerequisite:** Prompt 3 complete and DB seeded

```
Build the 6-agent LangGraph pipeline as Next.js API routes using Groq as the LLM. This is the core of Nexus.

INSTALL PACKAGES:
npm install groq-sdk chromadb

CREATE lib/groq.ts — Groq LLM wrapper:
import Groq from 'groq-sdk';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function callLLM(
  prompt: string,
  model: 'heavy' | 'fast' = 'heavy',
  systemPrompt?: string
): Promise<string> {
  const modelId = model === 'heavy' ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
  const response = await groq.chat.completions.create({
    model: modelId,
    temperature: model === 'heavy' ? 0.2 : 0.5,
    max_tokens: 1024,
    messages: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt }
    ]
  });
  return response.choices[0].message.content ?? '';
}

export async function callLLMJSON<T>(
  prompt: string,
  model: 'heavy' | 'fast' = 'heavy',
  systemPrompt?: string
): Promise<T> {
  const raw = await callLLM(prompt, model, systemPrompt);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as T;
}

CREATE lib/tools.ts — Simulated Indian government API tools:
Each function returns realistic mock data. Simulate realistic error rates:

checkMCA21(companyName: string, cinNumber: string):
  - 88% match: return { found: true, companyName, cinNumber, directors: ['name1', 'name2'], status: 'Active', registeredAddress }
  - 7% mismatch: return different director names (triggers fraud check)
  - 5% not found: return { found: false }

checkGSTN(gstNumber: string):
  - 80% valid: return { valid: true, legalName, registrationDate, status: 'Active', returnsFiled: true }
  - 15% mismatch: return { valid: true, legalName: different_name } — this triggers fraud flag
  - 5% not found: return { valid: false }

checkCDSCO(licenceNumber: string, companyName: string):
  - 88% valid: return { valid: true, licenceType, expiryDate: future date, products: [] }
  - 7% expired: return { valid: false, expiryDate: past date, reason: 'Licence expired' }
  - 5% mismatch: return { valid: true, companyName: different_name }

checkSanctionList(entityName: string, directors: string[]):
  - 94% clean: return { flagged: false, source: 'RBI/MCA Sanction DB' }
  - 6% flagged: return { flagged: true, matchedEntity: entityName, source: 'RBI Sanction List', reason: 'Regulatory violation 2024' }

checkBankAccount(accountNumber: string, ifscCode: string):
  - 85% valid: return { valid: true, bankName, accountHolderName: matches company }
  - 15% mismatch: return { valid: true, accountHolderName: different_name }

CREATE lib/chroma.ts — Chroma vector DB:
import { ChromaClient } from 'chromadb';

const client = process.env.CHROMA_URL
  ? new ChromaClient({ path: process.env.CHROMA_URL })
  : new ChromaClient(); // EphemeralClient — in-memory, zero config

const FRAUD_COLLECTION = 'nexus_fraud_patterns';
const DOC_COLLECTION = 'nexus_vendor_documents';

// Seed these fraud patterns on startup (call seedFraudPatterns() once)
const FRAUD_PATTERNS = [
  "GST number on submitted document does not match GSTN API registry record",
  "Certificate of Incorporation director names differ from MCA21 database",
  "CDSCO drug licence number format invalid or not found in registry",
  "Bank account holder name does not match company registered name",
  "ISO certification number not verifiable against issuing body registry",
  "Document appears digitally altered — metadata timestamp inconsistency detected",
  "Same certificate number submitted by two different vendors",
  "GST registration date on document predates company incorporation date",
  "PAN card number format valid but does not match Income Tax database",
  "Registered office address on document differs from MCA21 record",
  "FSSAI licence expired but submitted as valid document",
  "Drug Master File number referenced but not present in CDSCO portal",
  "Director DIN number does not match MCA21 director database",
  "Factory inspection report date older than 3 years — likely outdated",
  "Company name on document uses abbreviation not matching registered name"
];

export async function seedFraudPatterns() { ... }
export async function searchFraudPatterns(query: string, threshold = 0.75): Promise<string[]> { ... }
export async function embedDocument(vendorId: string, itemId: string, text: string, metadata: object) { ... }
export async function searchSimilarDocuments(query: string, vendorId?: string): Promise<any[]> { ... }

CREATE app/api/onboard/route.ts — POST — Orchestrator Agent:
1. Validate input: { vendor_name, industry, contact_email, contact_name }
2. Call callLLMJSON() with llama-3.3-70b-versatile:
   System: "You are the Nexus Orchestrator Agent. Generate a precise industry-specific vendor compliance checklist for Indian regulatory requirements. Respond ONLY with a JSON array, no markdown."
   Prompt: "Generate a compliance checklist for a {industry} vendor named {vendor_name}. Include 12-16 items across categories: Legal, Financial, Regulatory, Quality. Each item: { category: string, document_name: string, description: string, required: boolean, api_to_check: 'MCA21'|'GSTN'|'CDSCO'|'BANK'|'SANCTION'|null }"
   Fallback if Groq fails: use hardcoded 12-item checklist covering CoI, GST, PAN, Board Resolution, ISO 9001, Bank Verification + industry-specific items
3. Insert vendor to Supabase
4. Insert all checklist_items to Supabase
5. Generate supplier_portal_link: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/${vendor.id}`
6. Update vendor.supplier_portal_link in Supabase
7. Insert audit log: "Orchestrator: Workflow initialized. Generated {n}-item compliance checklist for {industry} vendor. Supplier portal link generated."
8. Call /api/notify with type "onboarding_started" if contact_email exists
9. Return: { status: "success", data: { vendor, checklist, supplier_portal_url }, timestamp }

CREATE app/api/pipeline/[vendorId]/route.ts — POST — Full pipeline with SSE streaming:

Use ReadableStream for Server-Sent Events so audit entries appear live in the UI.

Response headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive

Helper: emit(controller, agent, action) → encodes and enqueues SSE data event

COLLECTOR NODE:
- Load vendor + checklist from Supabase
- Load documents table for this vendor
- Count: submitted_count, pending_items
- For missing required docs: call callLLM(prompt, 'fast') with llama-3.1-8b-instant:
  "Generate a professional, concise email reminder (max 120 words) to {contact_name} at {vendor_name} for these missing documents: {missing_list}. Include portal link: {portal_url}. Tone: firm, helpful."
- Update vendor current_step = 1
- emit("Collector", "Document status reviewed. {submitted_count} submitted, {pending_count} pending. Reminder generated for missing items.")

VERIFIER NODE (run for each submitted document):
- For each checklist_item where status = 'submitted':
  - Search fraud patterns: searchFraudPatterns(document_name + " " + vendor_name)
  - Determine which API to call based on checklist_item.api_to_check
  - Call the appropriate tool function from lib/tools.ts
  - Call callLLMJSON(prompt, 'heavy') to analyze result:
    System: "You are the Nexus Verifier Agent. Analyze government API responses against document data."
    Prompt: "Document: {document_name} for {vendor_name}. API tool: {api_name}. API result: {api_result}. Similar fraud patterns found: {fraud_patterns}. Respond as JSON: { verdict: 'verified'|'failed'|'fraud_signal', confidence: number, findings: string, mismatch_fields: string[] }"
  - If fraud_signal: insert fraud_flag to Supabase, update checklist_item status to 'fraud_flagged'
  - If failed: update status to 'failed', increment retry_count
  - If verified: update status to 'verified', set verified_at
  - embed the document text into Chroma: embedDocument(vendorId, itemId, findings, metadata)
  - emit("Verifier", "{document_name} → {verdict} via {api_name}. {findings}")

RISK SCORER NODE:
- Count: verified, failed, fraud_flagged items
- Run checkSanctionList on vendor_name + director names
- Determine base risk: 0 fraud = Low, 1 fraud or 2+ failed = Medium, 2+ fraud or sanction = High
- Call callLLMJSON(prompt, 'heavy'):
  System: "You are the Nexus Risk Scoring Agent. Produce risk assessments for Indian vendor compliance."
  Prompt: "Vendor: {vendor_name}, Industry: {industry}. Verification: {verified_count} verified, {failed_count} failed, {fraud_count} fraud flags. Sanction check: {sanction_result}. Produce: { risk_score: 'Low'|'Medium'|'High', risk_rationale: '3-sentence professional explanation for a compliance officer citing specific findings', recommended_action: string }"
- Update vendor risk_score, risk_rationale in Supabase
- emit("Risk Scorer", "Assessment complete — {risk_score} risk. {risk_rationale first sentence}")

AUDIT AGENT NODE:
- Determine workflow_status:
  - fraud_count > 0 → 'halted'
  - risk_score = 'High' and no fraud → 'escalated'
  - else → 'complete'
- Call callLLM(prompt, 'fast') with llama-3.1-8b-instant to format audit summary
- Update vendor workflow_status, current_step = 13 in Supabase
- emit("Audit Agent", "Workflow status: {status}. Audit trail compiled — {total_log_count} entries. {completion_note}")
- If workflow_status = 'complete': call /api/notify type "verification_complete"
- If workflow_status = 'halted': call /api/notify type "fraud_alert"
- If workflow_status = 'escalated': call /api/notify type "human_approval_required"

THREE-LEVEL ERROR RECOVERY (apply in every node):
Level 1: API timeout → retry up to 3x with exponential backoff (1s, 2s, 4s). Log each retry.
Level 2: After 3 failed retries → mark checklist_item as 'pending_verification', continue pipeline. Log "Verifier: API unavailable — {doc_name} marked pending_verification. Will retry on next run."
Level 3: fraud_signal → immediate halt, create exception with requires_human: true. Level 3 also triggers for supplier_unresponsive (no docs submitted in 48hrs).

Return: final vendor state as last SSE event, then close stream.

CREATE app/api/monitor/[vendorId]/route.ts — POST — Monitor Agent (6th agent):

Load vendor + all checklist_items.

Run 4 signals:

Signal 1 — Cert expiry:
  - For each verified item with expiry context, simulate days_until_expiry (random 5-400)
  - < 30 days → amber warning. < 7 days → red alert. <= 0 → suspension flag.

Signal 2 — Risk drift:
  - Re-run checkMCA21 and checkGSTN with vendor's stored registration numbers
  - If any field changed vs original → risk_drift detected

Signal 3 — SLA performance:
  - Simulate: random sla_score 50-100. < 70 → amber. < 55 → red.

Signal 4 — Sanction list:
  - Re-run checkSanctionList on vendor_name

Determine health_status:
  - All signals clear → Green
  - 1 amber signal → Amber
  - Any red or sanction flag → Red

Call callLLM(prompt, 'fast') for monitoring_notes:
  "Summarize health check for {vendor_name}. Signals: {signals_json}. Write 2-3 sentences as the Nexus Monitor Agent: explain the current health status and what action is recommended. Be specific."

Insert monitoring_signals records to Supabase.
Update vendor health_status, monitoring_notes, last_monitored.
Insert audit_log: "Monitor: Health check complete — {health_status}. {n} signals evaluated."
If Red: call /api/notify type "health_alert"

Return: { status: "success", data: { health_status, monitoring_notes, signals }, timestamp }

CREATE app/api/vendors/route.ts — GET:
  Read from Supabase (not FastAPI). Join with checklist counts and fraud flag counts.
  Return shape matching existing frontend expectations.

CREATE app/api/vendors/[vendorId]/route.ts — GET + PATCH:
  GET: full vendor detail
  PATCH: human approval/rejection. On approve: insert audit_log with "Human approval: {email} approved {vendor_name}"

CREATE app/api/health/route.ts — GET:
  Test Supabase connection, Groq connection (tiny test prompt), Chroma status.
  Return: { status, services: { supabase, groq, chroma, resend }, agents: [...6 agents...], timestamp }
```

---

## PROMPT 5 — Supplier Portal: Smart Form + Document Upload

> **Who runs this:** Teammate B
> **Branch:** `feat/frontend-ui`
> **Time:** ~20 min

```
Upgrade the Supplier Portal at app/supplier/[vendorId]/page.tsx to a full 3-stage document submission flow.

INSTALL: (if not already installed) npm install react-dropzone

The portal loads using the vendorId from the URL. No login required. Use Supabase anon client.

STAGE 1 — Company Verification Form:
Load vendor from Supabase by vendorId (public read policy).
Show pre-filled editable form:
- Company name (read-only, from vendor record)
- Industry (read-only)
- Contact name (editable, save to vendor.contact_name)
- Contact email (editable)
- CIN — validate format: [A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}
- GST Number — validate: [0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}
- PAN Number — validate: [A-Z]{5}[0-9]{4}[A-Z]{1}
- Registered Address (textarea)
- Director Name
- Director DIN — validate: 8 digit number
Show inline validation error below each field as user types (red text, no submit required).
"Next: Upload Documents" button → disabled until all required fields pass validation.
On submit: update vendor record in Supabase with form data. Move to Stage 2.

STAGE 2 — Document Upload:
Load checklist_items from Supabase for this vendor.
Group by category (Legal, Financial, Regulatory, Quality, Industry-Specific).
For each checklist item show:
- Document name + description text
- Required badge (red pill) if required = true
- Status pill: pending=gray, submitted=blue, verified=green, failed=red, fraud_flagged=red+warning icon
- If status = 'failed': show failure_reason from checklist_item in amber callout box
- Drag-drop zone per item using react-dropzone: accept PDF, JPG, PNG, DOC, DOCX, max 10MB
- After file selected: show filename, file size (formatted: "2.3 MB"), type icon

Upload flow for each file:
1. Validate type and size client-side — show error if fails
2. Upload to Supabase Storage: bucket "vendor-documents", path: {vendorId}/{checklistItemId}/{filename}
3. Show progress bar (0-100%) during upload using Supabase onUploadProgress
4. On success:
   a. Insert to documents table: file_path, file_url (public URL), file_size, mime_type
   b. Update checklist_items: status = 'submitted', file_url = public URL
   c. Insert audit_log: agent "Supplier Portal", action "Document submitted: {document_name} by {contact_email}"
5. Checklist item shows green checkmark and "Submitted {timestamp}"

Re-upload: if status = 'failed', allow new upload. Old file is replaced.

Auto-save: every 30 seconds, save form data to Supabase so supplier can return and resume.

Progress bar at top: "{n} of {required_count} required documents submitted ({percent}%)"
Pending required docs: amber dashed border with slow pulse animation (animate-pulse class on border)

When all required docs submitted: show confetti CSS animation (use @keyframes from globals.css) + banner: "All required documents submitted! Our verification team has been notified."

STAGE 3 — Confirmation:
Large green checkmark SVG icon (inline SVG, no external image).
"Documents submitted successfully" heading.
Summary table: document name | submitted at for each submitted doc.
"What happens next" section:
  Step 1: Automated verification (24-48 hrs)
  Step 2: Risk assessment by AI agents
  Step 3: Compliance officer review
Timeline: "Typically completed within 2 business days"
Contact: "Questions? Email {contact_email from vendor}"
```

---

## PROMPT 6 — Realtime Dashboard + Live Agent Feed

> **Who runs this:** Teammate B
> **Branch:** `feat/frontend-ui`
> **Time:** ~15 min
> **Prerequisite:** Prompt 4 deployed (SSE pipeline working)

```
Add Supabase Realtime subscriptions to the Buyer Dashboard and upgrade the live agent feed to consume Server-Sent Events from the pipeline endpoint.

MODIFY app/dashboard/page.tsx:

1. Replace polling with Supabase Realtime:
   - Import createClient from lib/supabase/client
   - Subscribe to vendors channel on mount:
     supabase.channel('vendors').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vendors' }, (payload) => { update vendor in local state })
   - Unsubscribe on unmount
   - When vendor.workflow_status changes: apply flash animation (add class 'border-teal-400 border-2' for 800ms, then remove)

2. TimeSavedCounter: animate from 0 to final value over 2s using useEffect + requestAnimationFrame

3. Demo Mode banner (dismissible):
   - Shown by default, hidden after localStorage.setItem('nexus_demo_dismissed', 'true')
   - Content: "Hackathon Demo — 3 AI-verified vendors loaded | Click Run Pipeline to see all 6 agents in action"
   - "Run Full Demo" button: runs POST /api/pipeline for each vendor sequentially

4. Vendor cards:
   - Stagger mount animation: each card uses animation-delay (0ms, 100ms, 200ms, ...)
   - "Run Pipeline" button: POST /api/pipeline/{vendorId} with streaming response
   - Show animated spinner on the card while pipeline runs
   - Open EventSource to /api/pipeline/{vendorId} and feed each SSE event to AgentActivityFeed

MODIFY components/AgentActivityFeed.jsx:

Two data sources: SSE stream (during pipeline) + Supabase Realtime (after pipeline):

For SSE stream:
  const es = new EventSource(`/api/pipeline/${vendorId}`)
  es.onmessage = (e) => { const entry = JSON.parse(e.data); addEntry(entry); }
  es.onerror = () => { es.close(); switchToRealtime(); }

For Supabase Realtime (after pipeline or on initial load):
  Subscribe to audit_logs INSERT events for this vendorId
  New entries slide in from top: CSS class 'animate-slide-in-top'

Agent label pills — colored by agent (use inline style, no external images):
  Orchestrator: bg-blue-100 text-blue-800
  Collector: bg-teal-100 text-teal-800
  Verifier: bg-amber-100 text-amber-800
  Risk Scorer: bg-red-100 text-red-800
  Audit Agent: bg-purple-100 text-purple-800
  Monitor: bg-green-100 text-green-800

Live indicator: green dot with double-ring pulse animation. Show "LIVE" text beside dot.
Between pipeline stages: show "Agent processing..." with 3-dot bounce animation (typing-dots keyframe).

MODIFY app/dashboard/health/page.tsx:
- Subscribe to monitoring_signals INSERT — update health badge in realtime
- Red rows: add CSS animation class that shakes every 5s (use animation-delay per row)
- "Run Health Check All" button: calls POST /api/monitor/{vendorId} for each vendor sequentially, shows animated state per row

MODIFY app/dashboard/audit/page.tsx:
- Subscribe to audit_logs INSERT — new rows appear at top with slide animation
- Keyboard shortcut: document.addEventListener('keydown', e => { if ((e.metaKey||e.ctrlKey) && e.key==='k') searchRef.current?.focus() })
- Row click: expand/collapse showing pretty-printed details JSON
- Pagination: show 25 rows, Previous/Next controls

CREATE components/RealtimeProvider.tsx:
  Context with: connection status ('connected'|'reconnecting'|'disconnected'), subscribeToVendors(cb), subscribeToAuditLogs(vendorId, cb)
  Show connection status indicator in NavBar (small colored dot)
```

---

## PROMPT 7 — Email Notifications + Chroma Fraud Patterns

> **Who runs this:** Teammate A
> **Branch:** `feat/backend-agents`
> **Time:** ~15 min

```
Add Resend email notifications and finalize the Chroma vector DB fraud pattern seeding.

INSTALL: npm install resend

CREATE lib/resend.ts:
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

function nexusEmailTemplate(title: string, body: string, ctaText: string, ctaUrl: string): string {
  Return HTML email with:
  - Dark header: background #0f1f3d, "NEXUS" text in white font-syne + teal pulsing circle
  - White card body: title as h1, body as p
  - CTA button: background #0d9488, white text, border-radius 6px, padding 12px 24px
  - Footer: "Powered by Nexus — AI-Powered Vendor Verification" in gray
  - Narrow max-width: 600px, centered
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    await resend.emails.send({ from: 'Nexus Verification <onboarding@resend.dev>', to, subject, html });
    return true;
  } catch { return false; }
}

CREATE app/api/notify/route.ts — POST:
Accept: { type: string, vendor_id: string, recipient_email: string, data: object }

Type handlers:

"onboarding_started": to supplier
  Subject: "Nexus: Action required — your compliance verification has started"
  Body: vendor name, industry, what documents to prepare, portal link
  CTA: "Open your compliance portal →" → {data.portal_url}

"document_reminder": to supplier
  Subject: "Nexus: {data.pending_count} documents still required — {vendor_name}"
  Body: {data.reminder_text} (LLM-generated from Collector), pending doc list, portal link
  CTA: "Upload documents now →"

"verification_complete": to buyer
  Subject: "Nexus: Verification complete — {vendor_name} is {data.risk_score} risk"
  Body: Risk score badge (colored pill), risk_rationale paragraph, summary ({n} verified, {n} failed), dashboard link
  CTA: "Review in dashboard →"

"fraud_alert": to buyer
  Subject: "⚠ NEXUS ALERT: Fraud signal detected — {vendor_name}"
  Body: which document triggered flag, flag_type, full fraud description, severity: CRITICAL in red, action: "Do not proceed — compliance officer review required"
  CTA: "Review fraud flag →"

"health_alert": to buyer
  Subject: "Nexus Health Alert: {vendor_name} — immediate action required"
  Body: health_status Red, which signals triggered, monitoring_notes, recommended action
  CTA: "View vendor health →"

"human_approval_required": to buyer
  Subject: "Nexus: Your decision required — {vendor_name}"
  Body: exception description, risk_rationale, link to audit trail
  CTA: "Review and decide →"

UPDATE lib/chroma.ts — Add seedFraudPatterns() that loads the 15 patterns and call it:
In app/api/health/route.ts: call seedFraudPatterns() if Chroma collection doesn't exist yet.

This means on the first /api/health call, fraud patterns are seeded automatically. No manual step needed.

Return from /api/notify: { status: "success", data: { sent: boolean }, timestamp }
```

---

## PROMPT 8 — Visual Polish

> **Who runs this:** Teammate B
> **Branch:** `feat/frontend-ui`
> **Time:** ~20 min

```
Polish the Nexus UI to feel premium. Add animations, improve the visual hierarchy, and make the hackathon demo unforgettable.

MODIFY app/globals.css — Add after existing design system content:

@keyframes slide-in-top {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}
@keyframes typing-dots {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes scan {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes count-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes flash-border {
  0%, 100% { border-color: transparent; }
  50% { border-color: #0d9488; }
}
@keyframes confetti-fall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
.animate-slide-in-top { animation: slide-in-top 0.2s ease-out; }
.animate-shake { animation: shake 0.4s ease-in-out; }
.animate-flash-border { animation: flash-border 0.8s ease-in-out; }
.animate-scan {
  background: linear-gradient(90deg, transparent 0%, rgba(13,148,136,0.3) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: scan 1.5s linear infinite;
}
.typing-dot { display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: currentColor; animation: typing-dots 1.4s infinite ease-in-out; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

MODIFY components/TimeSavedCounter.jsx:
- Use useEffect + requestAnimationFrame to count from 0 to final value over 2000ms
- Large number: class "font-syne font-bold text-5xl text-white"
- "hrs" suffix: "text-xl text-teal-300 ml-1 self-end mb-1"
- Below: "vs {hours × 3}hrs manual process" in "text-sm text-slate-400 mt-1"
- Text shadow on number: style={{ textShadow: '0 0 20px rgba(13,148,136,0.4)' }}

MODIFY components/VendorDetailDrawer.jsx:
- Opening: wrapper div changes from width 0 to width 480px over 240ms ease-out (CSS transition)
- Overlay backdrop: semi-transparent div with backdropFilter 'blur(4px)'
- Audit trail: add left-side vertical line (1px, border-teal-100, position relative, each entry has left: -13px circle dot)
- "Download Audit Report" button at bottom: GET /api/audit-pdf/{vendorId} triggers download
- Tab indicator: sliding underline (CSS transition on left position)

MODIFY app/dashboard/health/page.tsx:
- Red rows: className includes "animate-shake" with style={{ animationDelay: `${index * 0.3}s`, animationIterationCount: 'infinite', animationDuration: '5s' }}
- "Run Health Check" button in scanning state: use animate-scan class on button background
- Auto-refresh: useEffect with setInterval 60000, show countdown with CSS conic-gradient progress ring (simple, no library)

CREATE components/DemoGuide.tsx:
- Sticky bottom-left button: "?" circle, 48px, nexus-btn-primary style
- Use position: sticky inside a full-height in-flow wrapper — do NOT use position: fixed
- Panel slides up from button: shows 5 steps:
  1 "Dashboard — 3 AI-verified vendors loaded"
  2 "Click a vendor card — see AI audit trail"
  3 "New Vendor — watch Orchestrator generate checklist"
  4 "Supplier Portal — upload docs, watch Verifier process"
  5 "Health tab — Monitor Agent's continuous surveillance"
  Each step: step number circle + text + "Go →" Link
- "Got it" button: localStorage.setItem('nexus_guide_dismissed', 'true')
- Auto-open after 3 seconds on first visit (check localStorage)

Add <DemoGuide /> to app/layout.tsx
```

---

## PROMPT 9 — Production Deploy

> **Who runs this:** Teammate A
> **Branch:** `feat/backend-agents` → merge to `main`
> **Time:** ~10 min

```
Prepare Nexus for Vercel deployment.

MODIFY next.config.js:
module.exports = {
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${process.env.BACKEND_URL ?? 'http://localhost:8000'}/:path*` }]
  },
  images: { domains: ['*.supabase.co'] },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin' }
      ]
    }]
  },
  experimental: { serverComponentsExternalPackages: ['chromadb', 'groq-sdk'] },
  output: 'standalone'
}

CREATE vercel.json:
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "framework": "nextjs",
  "regions": ["sin1"],
  "functions": {
    "app/api/pipeline/[vendorId]/route.ts": { "maxDuration": 60 },
    "app/api/monitor/[vendorId]/route.ts": { "maxDuration": 30 },
    "app/api/onboard/route.ts": { "maxDuration": 30 }
  }
}

Note: Chroma EphemeralClient (in-memory) works fine on Vercel for hackathon demo. Fraud patterns are re-seeded on each cold start via the /api/health endpoint call.

CREATE .env.example with all vars documented (no values).

UPDATE app/api/health/route.ts to also seed Chroma fraud patterns on first call if collection is empty.

FINAL CHECKS — run these in order:
1. npm run build — must succeed with no errors
2. npm run start — app runs at localhost:3000
3. GET /api/health — all services green
4. POST /api/onboard with test vendor — checklist generated
5. GET /suppliers/{vendor_id} — portal loads without auth
6. Push to GitHub main branch
7. Connect repo to Vercel, add all env vars from .env.local
8. Deploy — get live URL
9. Test /api/health on live URL
```

---

# PART 4 — DAY-BY-DAY BUILD PLAN (2 teammates, 5 days)

| Day | Teammate A | Teammate B | Sync at end of day |
|-----|-----------|-----------|-------------------|
| Day 1 | Prompt 1 (Next.js conversion) + Prompt 3 (schema) | Install Antigravity, clone repo, run Prompt 2 (auth) | Merge both branches to dev, confirm app runs with auth |
| Day 2 | Prompt 4 (agent pipeline — take the full day) | Prompt 5 (supplier portal) | Test: onboard a vendor, open supplier portal, upload a doc |
| Day 3 | Debug Prompt 4 edge cases + Prompt 7 (email + Chroma) | Prompt 6 (realtime + dashboard) | Test: run full pipeline, confirm SSE feed works, emails land |
| Day 4 | Prompt 9 (deploy) + fix any prod issues | Prompt 8 (visual polish) | Live Vercel URL working end-to-end |
| Day 5 | Write README + prep demo scenarios | Final UI polish + demo walkthrough | Record 3-minute demo video |

---

# PART 5 — GROQ RATE LIMIT STRATEGY

Groq free tier: 30 requests/minute, 6000 tokens/minute for llama-3.3-70b-versatile.

**How to stay under the limit during the demo:**

The pipeline for one vendor makes ~8-12 Groq calls:
- 1 call: Orchestrator checklist generation (llama-3.3-70b-versatile, ~800 tokens)
- 1 call per submitted doc for Verifier (llama-3.3-70b-versatile, ~400 tokens each)
- 1 call: Risk Scorer assessment (llama-3.3-70b-versatile, ~600 tokens)
- 1 call: Collector reminder (llama-3.1-8b-instant, ~200 tokens)
- 1 call: Audit Agent summary (llama-3.1-8b-instant, ~300 tokens)
- 1 call: Monitor notes (llama-3.1-8b-instant, ~200 tokens)

For 3 demo vendors: ~24-36 calls total. Well within 30/min if you run them 10 seconds apart.

**Add these safeguards in lib/groq.ts:**

```typescript
// Simple in-memory rate limiter
let lastCallTime = 0;
const MIN_INTERVAL = 2200; // 2.2 seconds between calls = max 27/min

async function rateLimit() {
  const now = Date.now();
  const wait = MIN_INTERVAL - (now - lastCallTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallTime = Date.now();
}

// Add rateLimit() before every groq.chat.completions.create() call
```

**Fallback if Groq is down:** Every callLLMJSON() call must have a try/catch that returns a hardcoded fallback response. Never let the pipeline crash if Groq hits a rate limit. Log the error and continue.

---

# PART 6 — QUICK TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| Antigravity modifies /backend/ | Stop the agent, say "Do not touch /backend/ — revert those changes" |
| Groq 429 rate limit error | Add the rateLimit() helper above, increase MIN_INTERVAL to 3000 |
| Chroma "collection not found" | Make sure /api/health was called at least once (seeds the fraud patterns) |
| Supabase RLS blocking supplier portal | Check 002_rls.sql — "Public read vendor by id" policy must be applied |
| SSE stream not working on Vercel | Vercel supports streaming — make sure the route has maxDuration: 60 in vercel.json |
| Agent writes incomplete code | Say: "The [filename] is incomplete — finish the implementation without truncating" |
| Two teammates have merge conflict | Resolve together: A owns /app/api/ and /lib/, B owns /app/dashboard/ and /components/ |
