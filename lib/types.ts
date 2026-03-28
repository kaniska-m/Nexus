// ============================================================================
// Nexus — TypeScript Types
// Database table types for the Supabase schema
// ============================================================================

// ── Profiles ────────────────────────────────────────────────────────────────

export type UserRole = 'buyer' | 'supplier' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  organization: string | null;
  created_at: string;
}

// ── Vendors ─────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'pending' | 'active' | 'processing' | 'complete' | 'completed' | 'escalated' | 'halted' | 'stalled' | 'failed';
export type RiskScore = 'Low' | 'Medium' | 'High';
export type HealthStatus = 'Green' | 'Amber' | 'Red';

export interface Vendor {
  id: string;
  vendor_name: string;
  industry: string;
  contact_email: string | null;
  contact_name: string | null;
  cin: string | null;
  gst_number: string | null;
  pan_number: string | null;
  registered_address: string | null;
  director_name: string | null;
  director_din: string | null;
  workflow_status: WorkflowStatus;
  risk_score: RiskScore | null;
  risk_rationale: string | null;
  health_status: HealthStatus;
  current_step: number;
  escalation_level: number;
  monitoring_notes: string | null;
  last_monitored: string | null;
  supplier_portal_link: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewVendor {
  vendor_name: string;
  industry: string;
  contact_email?: string;
  contact_name?: string;
  urgency?: string;
}

// ── Checklist Items ─────────────────────────────────────────────────────────

export type ChecklistStatus = 'pending' | 'submitted' | 'verified' | 'failed';

export interface ChecklistItem {
  id: string;
  vendor_id: string;
  category: string;
  document_name: string;
  description: string | null;
  required: boolean;
  status: ChecklistStatus;
  api_to_check: string | null;
  retry_count: number;
  max_retries: number;
  verified_at: string | null;
  file_url: string | null;
  failure_reason: string | null;
}

// ── Fraud Flags ─────────────────────────────────────────────────────────────

export interface FraudFlag {
  id: string;
  vendor_id: string;
  checklist_item_id: string | null;
  doc_name: string;
  flag_type: string;
  description: string | null;
  severity: string;
  detected_at: string;
}

export interface NewFraudFlag {
  vendor_id: string;
  checklist_item_id?: string;
  doc_name: string;
  flag_type: string;
  description?: string;
  severity?: string;
}

// ── Audit Logs ──────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  vendor_id: string;
  agent: string;
  action: string;
  reason: string | null;
  details: Record<string, any>;
  created_at: string;
  // Joined fields (optional)
  vendor_name?: string;
}

export interface AuditFilters {
  vendorId?: string;
  agent?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

// ── Exceptions ──────────────────────────────────────────────────────────────

export interface Exception {
  id: string;
  vendor_id: string;
  exception_type: string;
  description: string | null;
  agent: string | null;
  level: number;
  requires_human: boolean;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ── Documents ───────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  vendor_id: string;
  checklist_item_id: string | null;
  document_name: string;
  file_path: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  submitted_at: string;
  submitted_by: string | null;
}

// ── Monitoring Signals ──────────────────────────────────────────────────────

export interface MonitoringSignal {
  id: string;
  vendor_id: string;
  signal_type: string;
  signal_value: Record<string, any> | null;
  trigger_condition: string | null;
  agent_response: string | null;
  severity: string;
  created_at: string;
}

// ── Composite Types (for API responses) ─────────────────────────────────────

export interface VendorDetail extends Vendor {
  checklist: ChecklistItem[];
  fraud_flags: FraudFlag[];
  audit_log: AuditLog[];
  exceptions: Exception[];
}

export interface DashboardSummary {
  total_vendors: number;
  active_count: number;
  completed_count: number;
  flagged_count: number;
  vendors: Vendor[];
}

export interface HealthVendor extends Vendor {
  fraud_flags: FraudFlag[];
  checklist: ChecklistItem[];
  audit_log: AuditLog[];
}
