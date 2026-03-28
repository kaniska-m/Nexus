-- ============================================================================
-- Nexus — Database Schema
-- Supabase PostgreSQL migration: Core tables for vendor onboarding platform
-- ============================================================================

-- ── Profiles (extends Supabase auth.users) ──────────────────────────────────

CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  role TEXT CHECK (role IN ('buyer', 'supplier', 'admin')) DEFAULT 'buyer',
  organization TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Vendors ─────────────────────────────────────────────────────────────────

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

-- ── Checklist Items ─────────────────────────────────────────────────────────

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

-- ── Fraud Flags ─────────────────────────────────────────────────────────────

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

-- ── Audit Logs ──────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Exceptions ──────────────────────────────────────────────────────────────

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

-- ── Documents (uploaded files) ──────────────────────────────────────────────

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

-- ── Monitoring Signals ──────────────────────────────────────────────────────

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

-- ── Auto-update updated_at trigger ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Indexes for performance ─────────────────────────────────────────────────

CREATE INDEX idx_checklist_vendor ON checklist_items(vendor_id);
CREATE INDEX idx_audit_vendor ON audit_logs(vendor_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_fraud_vendor ON fraud_flags(vendor_id);
CREATE INDEX idx_exceptions_vendor ON exceptions(vendor_id);
CREATE INDEX idx_documents_vendor ON documents(vendor_id);
CREATE INDEX idx_signals_vendor ON monitoring_signals(vendor_id);
CREATE INDEX idx_vendors_status ON vendors(workflow_status);
CREATE INDEX idx_vendors_health ON vendors(health_status);
