// ============================================================================
// Nexus — Supabase Query Functions
// Typed database access layer for all vendor onboarding operations
// ============================================================================

import { createClient } from '@/lib/supabase/client';
import type {
  Vendor,
  VendorDetail,
  DashboardSummary,
  NewVendor,
  AuditLog,
  AuditFilters,
  HealthVendor,
  NewFraudFlag,
  ChecklistItem,
  FraudFlag,
  Exception,
} from '@/lib/types';

// ── Vendors ─────────────────────────────────────────────────────────────────

export async function getVendors(): Promise<Vendor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getVendorDetail(id: string): Promise<VendorDetail> {
  const supabase = createClient();

  // Fetch vendor + all related data in parallel
  const [vendorRes, checklistRes, fraudRes, auditRes, exceptionsRes] = await Promise.all([
    supabase.from('vendors').select('*').eq('id', id).single(),
    supabase.from('checklist_items').select('*').eq('vendor_id', id).order('category'),
    supabase.from('fraud_flags').select('*').eq('vendor_id', id).order('detected_at', { ascending: false }),
    supabase.from('audit_logs').select('*').eq('vendor_id', id).order('created_at', { ascending: true }),
    supabase.from('exceptions').select('*').eq('vendor_id', id).order('created_at', { ascending: false }),
  ]);

  if (vendorRes.error) throw new Error(vendorRes.error.message);
  if (!vendorRes.data) throw new Error('Vendor not found');

  return {
    ...vendorRes.data,
    checklist: checklistRes.data || [],
    fraud_flags: fraudRes.data || [],
    audit_log: auditRes.data || [],
    exceptions: exceptionsRes.data || [],
  };
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const vendors = await getVendors();

  const active_count = vendors.filter(
    (v) => v.workflow_status === 'active' || v.workflow_status === 'processing'
  ).length;

  const completed_count = vendors.filter(
    (v) => v.workflow_status === 'complete' || v.workflow_status === 'completed'
  ).length;

  const flagged_count = vendors.filter(
    (v) => v.workflow_status === 'escalated' || v.workflow_status === 'halted'
  ).length;

  return {
    total_vendors: vendors.length,
    active_count,
    completed_count,
    flagged_count,
    vendors,
  };
}

// ── Create / Update Vendors ─────────────────────────────────────────────────

export async function createVendor(data: NewVendor): Promise<Vendor> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      vendor_name: data.vendor_name,
      industry: data.industry,
      contact_email: data.contact_email || null,
      contact_name: data.contact_name || null,
      workflow_status: 'pending',
      created_by: session?.user?.id || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return vendor;
}

export async function updateVendorStatus(
  id: string,
  status: string,
  step: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('vendors')
    .update({ workflow_status: status, current_step: step })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ── Audit Logs ──────────────────────────────────────────────────────────────

export async function getAuditLogs(filters?: AuditFilters): Promise<AuditLog[]> {
  const supabase = createClient();

  // We join vendor_name by fetching from audit_logs and vendors
  let query = supabase
    .from('audit_logs')
    .select('*, vendors!inner(vendor_name)')
    .order('created_at', { ascending: false });

  if (filters?.vendorId) {
    query = query.eq('vendor_id', filters.vendorId);
  }

  if (filters?.agent && filters.agent !== 'All Agents') {
    query = query.eq('agent', filters.agent);
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Flatten the joined vendor_name
  return (data || []).map((row: any) => ({
    id: row.id,
    vendor_id: row.vendor_id,
    agent: row.agent,
    action: row.action,
    reason: row.reason,
    details: row.details,
    created_at: row.created_at,
    vendor_name: row.vendors?.vendor_name || '',
  }));
}

export async function insertAuditLog(
  vendorId: string,
  agent: string,
  action: string,
  reason?: string,
  details?: object
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('audit_logs').insert({
    vendor_id: vendorId,
    agent,
    action,
    reason: reason || null,
    details: details || {},
  });

  if (error) throw new Error(error.message);
}

// ── Health Dashboard ────────────────────────────────────────────────────────

export async function getHealthDashboard(): Promise<HealthVendor[]> {
  const supabase = createClient();

  // Get all vendors that have been through at least some processing
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('*')
    .in('workflow_status', ['active', 'processing', 'complete', 'completed', 'escalated', 'halted'])
    .order('last_monitored', { ascending: false });

  if (error) throw new Error(error.message);
  if (!vendors || vendors.length === 0) return [];

  // Fetch related data for each vendor in parallel
  const vendorIds = vendors.map((v) => v.id);

  const [checklistRes, fraudRes, auditRes] = await Promise.all([
    supabase.from('checklist_items').select('*').in('vendor_id', vendorIds),
    supabase.from('fraud_flags').select('*').in('vendor_id', vendorIds),
    supabase.from('audit_logs').select('*').in('vendor_id', vendorIds).order('created_at', { ascending: true }),
  ]);

  // Group by vendor_id
  const checklistByVendor = groupBy(checklistRes.data || [], 'vendor_id');
  const fraudByVendor = groupBy(fraudRes.data || [], 'vendor_id');
  const auditByVendor = groupBy(auditRes.data || [], 'vendor_id');

  return vendors.map((v) => ({
    ...v,
    checklist: checklistByVendor[v.id] || [],
    fraud_flags: fraudByVendor[v.id] || [],
    audit_log: auditByVendor[v.id] || [],
  }));
}

// ── Fraud Flags ─────────────────────────────────────────────────────────────

export async function insertFraudFlag(data: NewFraudFlag): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('fraud_flags').insert({
    vendor_id: data.vendor_id,
    checklist_item_id: data.checklist_item_id || null,
    doc_name: data.doc_name,
    flag_type: data.flag_type,
    description: data.description || null,
    severity: data.severity || 'high',
  });

  if (error) throw new Error(error.message);
}

// ── Utility ─────────────────────────────────────────────────────────────────

function groupBy<T extends Record<string, any>>(
  array: T[],
  key: string
): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const group = item[key];
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
