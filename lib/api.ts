// ============================================================================
// Nexus — API Client (TypeScript)
// Centralized API calls to Next.js API routes with Supabase auth.
// ============================================================================

import { createClient } from '@/lib/supabase/client';

const API_BASE = '/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

async function fetchJSON(url: string, options: RequestInit = {}): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers as Record<string, string>,
    },
    ...options,
  });

  if (res.status === 401) {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Session expired. Redirecting to login...');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// ── Health Check ────────────────────────────────────────────────────────────

export const getHealth = () => fetchJSON(`${API_BASE}/health`);

// ── Vendor Onboarding (Orchestrator Agent) ──────────────────────────────────

export const onboardVendor = (data: any) =>
  fetchJSON(`${API_BASE}/onboard`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ── Vendor Status (single vendor detail) ────────────────────────────────────

export const getVendorStatus = (vendorId: string) =>
  fetchJSON(`${API_BASE}/vendors/${vendorId}`);

// ── List All Vendors ────────────────────────────────────────────────────────

export const listVendors = () => fetchJSON(`${API_BASE}/vendors`);

// ── Run Pipeline (SSE stream — returns EventSource-like handling) ───────────

export const runPipeline = async (vendorId: string): Promise<any> => {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/pipeline/${vendorId}`, {
    method: 'POST',
    headers: { ...authHeaders },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.error || `Pipeline Error: ${res.status}`);
  }

  // Read SSE stream and return all events + final vendor state
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  const events: any[] = [];
  let finalData: any = null;

  if (reader) {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const dataMatch = line.match(/^data: (.+)$/m);
        if (dataMatch) {
          try {
            const parsed = JSON.parse(dataMatch[1]);
            if (parsed.type === 'pipeline_complete') {
              finalData = parsed.data;
            } else {
              events.push(parsed);
            }
          } catch { /* skip malformed */ }
        }
      }
    }
  }

  return { data: finalData, events };
};

// ── Monitor Vendor ──────────────────────────────────────────────────────────

export const monitorVendor = (vendorId: string) =>
  fetchJSON(`${API_BASE}/monitor/${vendorId}`, { method: 'POST' });

// ── Buyer Dashboard (alias for vendors list) ────────────────────────────────

export const getBuyerDashboard = () => fetchJSON(`${API_BASE}/vendors`);

// ── Buyer Exceptions (embedded in vendor data) ──────────────────────────────

export const getExceptions = async () => {
  const res = await fetchJSON(`${API_BASE}/vendors`);
  const vendors = res?.data || [];
  const exceptions = vendors.flatMap((v: any) =>
    (v.exceptions || []).map((e: any) => ({ ...e, vendor_name: v.vendor_name }))
  );
  return { data: exceptions };
};

// ── Supplier Form (returns vendor checklist for supplier portal) ─────────────

export const getSupplierForm = (vendorId: string) =>
  fetchJSON(`${API_BASE}/vendors/${vendorId}`);

// ── Supplier Status ─────────────────────────────────────────────────────────

export const getSupplierStatus = (vendorId: string) =>
  fetchJSON(`${API_BASE}/vendors/${vendorId}`);

// ── Submit Document ─────────────────────────────────────────────────────────

export const submitDocument = (vendorId: string, formData: FormData): Promise<any> => {
  return (async () => {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/suppliers/${vendorId}/submit-document`, {
      method: 'POST',
      headers: { ...authHeaders },
      body: formData,
    });

    if (res.status === 401) {
      const supabase = createClient();
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Session expired.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Upload Error: ${res.status}`);
    }
    return res.json();
  })();
};

// ── Health Dashboard (uses vendors + monitor data) ──────────────────────────

export const getHealthDashboard = async () => {
  const res = await fetchJSON(`${API_BASE}/vendors`);
  const vendors = res?.data || [];
  // Filter to vendors that have been through the pipeline
  const monitored = vendors.filter((v: any) =>
    ['active', 'processing', 'complete', 'completed', 'escalated', 'halted'].includes(v.workflow_status)
  );
  return { data: { vendors: monitored } };
};
