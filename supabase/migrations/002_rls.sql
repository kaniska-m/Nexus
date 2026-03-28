-- ============================================================================
-- Nexus — Row Level Security Policies
-- Hackathon-friendly: authenticated users get broad read/write access
-- ============================================================================

-- ── Enable RLS on all tables ────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_signals ENABLE ROW LEVEL SECURITY;

-- ── Profiles ────────────────────────────────────────────────────────────────

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- ── Vendors (authenticated = full read, anon = read for supplier portal) ───

CREATE POLICY "Authenticated read vendors"
  ON vendors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Public read vendor by id"
  ON vendors FOR SELECT TO anon
  USING (true);

CREATE POLICY "Auth insert vendors"
  ON vendors FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Auth update vendors"
  ON vendors FOR UPDATE TO authenticated
  USING (true);

-- ── Checklist Items ─────────────────────────────────────────────────────────

CREATE POLICY "Authenticated read checklist"
  ON checklist_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Public read checklist by vendor"
  ON checklist_items FOR SELECT TO anon
  USING (true);

CREATE POLICY "Auth insert checklist"
  ON checklist_items FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Auth update checklist"
  ON checklist_items FOR UPDATE TO authenticated
  USING (true);

-- ── Fraud Flags ─────────────────────────────────────────────────────────────

CREATE POLICY "Authenticated read fraud"
  ON fraud_flags FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Auth insert fraud"
  ON fraud_flags FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── Audit Logs ──────────────────────────────────────────────────────────────

CREATE POLICY "Authenticated read audit"
  ON audit_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Public read audit by vendor"
  ON audit_logs FOR SELECT TO anon
  USING (true);

CREATE POLICY "Auth insert audit"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── Exceptions ──────────────────────────────────────────────────────────────

CREATE POLICY "Authenticated read exceptions"
  ON exceptions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Auth insert exceptions"
  ON exceptions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Auth update exceptions"
  ON exceptions FOR UPDATE TO authenticated
  USING (true);

-- ── Documents ───────────────────────────────────────────────────────────────

CREATE POLICY "Authenticated read docs"
  ON documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Public read docs by vendor"
  ON documents FOR SELECT TO anon
  USING (true);

CREATE POLICY "Public insert documents"
  ON documents FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Auth insert documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── Monitoring Signals ──────────────────────────────────────────────────────

CREATE POLICY "Authenticated read signals"
  ON monitoring_signals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Auth insert signals"
  ON monitoring_signals FOR INSERT TO authenticated
  WITH CHECK (true);
