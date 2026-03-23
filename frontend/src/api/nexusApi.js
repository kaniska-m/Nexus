// ============================================================================
// Nexus — API Client
// Centralized API calls to the FastAPI backend.
// ============================================================================

const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error: ${res.status}`);
  }
  return res.json();
}

// Health check
export const getHealth = () => fetchJSON('/health');

// Vendor onboarding
export const onboardVendor = (data) =>
  fetchJSON(`${API_BASE}/vendor/onboard`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Vendor status
export const getVendorStatus = (vendorId) =>
  fetchJSON(`${API_BASE}/vendor/${vendorId}/status`);

// List all vendors
export const listVendors = () => fetchJSON(`${API_BASE}/vendors`);

// Run full pipeline
export const runPipeline = (vendorId) =>
  fetchJSON(`${API_BASE}/vendor/${vendorId}/run-pipeline`, { method: 'POST' });

// Monitor vendor
export const monitorVendor = (vendorId) =>
  fetchJSON(`${API_BASE}/vendor/${vendorId}/monitor`, { method: 'POST' });

// Buyer dashboard
export const getBuyerDashboard = () => fetchJSON(`${API_BASE}/buyer/dashboard`);

// Buyer exceptions
export const getExceptions = () => fetchJSON(`${API_BASE}/buyer/exceptions`);

// Supplier form
export const getSupplierForm = (vendorId) =>
  fetchJSON(`${API_BASE}/supplier/${vendorId}/form`);

// Supplier status
export const getSupplierStatus = (vendorId) =>
  fetchJSON(`${API_BASE}/supplier/${vendorId}/status`);

// Submit document
export const submitDocument = (vendorId, formData) => {
  return fetch(`${API_BASE}/supplier/${vendorId}/submit-document`, {
    method: 'POST',
    body: formData, // Do NOT set Content-Type header manually for FormData
  }).then(async res => {
      if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || `API Error: ${res.status}`);
      }
      return res.json();
  });
};

// Monitor health dashboard
export const getHealthDashboard = () =>
  fetchJSON(`${API_BASE}/monitor/health-dashboard`);
