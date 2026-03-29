// ============================================================================
// Nexus — Buyer Dashboard (Realtime)
// Supabase Realtime subscriptions, SSE pipeline streaming, demo mode.
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Plus, Loader2, ChevronRight,
  Building2, FileCheck, AlertTriangle, TrendingUp, Zap, Search, Clock, Bot, X, ShieldCheck,
  Copy, CheckCircle, BarChart3, Play, Sparkles
} from 'lucide-react';
import { onboardVendor, runPipeline, getVendorStatus, listVendors } from '../api/nexusApi';
import { useRealtime } from '../components/RealtimeProvider';
import TimeSavedCounter from '../components/TimeSavedCounter';
import AgentActivityFeed from '../components/AgentActivityFeed';
import VendorRequestCard from '../components/VendorRequestCard';
import VendorDetailDrawer from '../components/VendorDetailDrawer';
import VendorHealthPage from './VendorHealthPage';
import AuditLogsPage from './AuditLogsPage';

const INDUSTRIES = ['MedTech', 'FinTech', 'GovTech', 'SaaS', 'E-commerce', 'Logistics', 'IT', 'Pharma'];

const API_BASE = '/api';

function StatCard({ icon: Icon, label, value, color = 'blue', suffix = '' }) {
  return (
    <div className="nexus-card p-4 flex items-center gap-4 group nexus-card-hover">
      <div className={`w-11 h-11 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-[#0f1f3d] font-syne tabular-nums animate-count">
          {value}{suffix}
        </p>
      </div>
    </div>
  );
}

function DemoBanner({ onRunDemo, demoRunning }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('nexus_demo_dismissed') === 'true'; } catch { return false; }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('nexus_demo_dismissed', 'true'); } catch {}
  };

  return (
    <div className="demo-banner rounded-xl px-5 py-3.5 mb-5 flex items-center justify-between gap-4 animate-slide-down">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0f1f3d]">Hackathon Demo</p>
          <p className="text-xs text-slate-500 truncate">
            3 AI-verified vendors loaded · Click Run Pipeline to see all 6 agents in action
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRunDemo}
          disabled={demoRunning}
          className="nexus-btn-teal py-1.5 px-3 text-xs disabled:opacity-50"
        >
          {demoRunning ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running Demo...</>
          ) : (
            <><Play className="w-3.5 h-3.5" /> Run Full Demo</>
          )}
        </button>
        <button onClick={handleDismiss} className="p-1.5 hover:bg-slate-200/60 rounded-lg transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}

function OnboardingTab() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ vendor_name: '', industry: 'MedTech', contact_email: '', urgency: 'normal' });
  const [flashingVendorIds, setFlashingVendorIds] = useState(new Set());
  const [demoRunning, setDemoRunning] = useState(false);
  const [sseActive, setSseActive] = useState(false);
  const [sseEntries, setSseEntries] = useState([]);
  const eventSourceRef = useRef(null);

  const location = useLocation();
  const { subscribeToVendors } = useRealtime();

  useEffect(() => {
    if (location.search === '?new=true') {
      setShowOnboard(true);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  // ── Supabase Realtime: vendor updates ─────────────────────────────
  useEffect(() => {
    const unsub = subscribeToVendors((newVendor, oldVendor) => {
      setVendors(prev => {
        const idx = prev.findIndex(v => v.vendor_id === newVendor.vendor_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...newVendor };
          return updated;
        }
        return [...prev, newVendor];
      });

      // Flash animation when workflow_status changes
      if (oldVendor && newVendor.workflow_status !== oldVendor.workflow_status) {
        setFlashingVendorIds(prev => new Set([...prev, newVendor.vendor_id]));
        setTimeout(() => {
          setFlashingVendorIds(prev => {
            const next = new Set(prev);
            next.delete(newVendor.vendor_id);
            return next;
          });
        }, 800);
      }

      // Update selected vendor if it's the one that changed
      setSelectedVendor(prev => {
        if (prev?.vendor_id === newVendor.vendor_id) {
          return { ...prev, ...newVendor };
        }
        return prev;
      });
    });

    return unsub;
  }, [subscribeToVendors]);

  // ── Initial vendor load ───────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const res = await listVendors();
        const data = res?.data || res;
        const vendorList = Array.isArray(data) ? data : (data?.vendors || []);
        setVendors(vendorList);
        if (vendorList.length > 0 && !selectedVendor) setSelectedVendor(vendorList[0]);
      } catch (err) {
        console.error("Init Error:", err);
      }
    }
    init();
  }, []);

  // ── Fallback polling for vendor status (works without Supabase) ───
  useEffect(() => {
    if (!selectedVendor?.vendor_id) return;
    const poll = async () => {
      try {
        const res = await getVendorStatus(selectedVendor.vendor_id);
        const data = res.data || res;
        setSelectedVendor(data);
        setVendors(prev => prev.map(v => v.vendor_id === data.vendor_id ? data : v));
        if (data.workflow_status === 'completed' || data.workflow_status === 'complete' || data.workflow_status === 'failed') {
          setPipelineLoading(false);
        }
      } catch (e) {
        console.error("Poller Error:", e);
      }
    };
    const interval = setInterval(poll, 5000); // slower since we have realtime
    return () => clearInterval(interval);
  }, [selectedVendor?.vendor_id]);

  // ── SSE Pipeline Stream ───────────────────────────────────────────
  const startSSEStream = useCallback((vendorId) => {
    // Close any existing stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setSseActive(true);
    setSseEntries([]);

    const es = new EventSource(`${API_BASE}/vendor/${vendorId}/run-pipeline`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data);
        setSseEntries(prev => [...prev, entry]);
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setSseActive(false);
      // Pipeline ended, switch to realtime for future updates
    };

    es.addEventListener('complete', () => {
      es.close();
      eventSourceRef.current = null;
      setSseActive(false);
      setPipelineLoading(false);
      toast.success('Pipeline complete!');
    });
  }, []);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleOnboard = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await onboardVendor(form);
      const vendorData = res?.data || res;
      if (!vendorData || !vendorData.vendor_id) {
        throw new Error("Invalid vendor data returned from backend");
      }
      setSelectedVendor(vendorData);
      setVendors(prev => (Array.isArray(prev) ? [...prev, vendorData] : [vendorData]));
      setShowOnboard(false);
      setOnboardStep(1);
      setForm({ vendor_name: '', industry: 'MedTech', contact_email: '', urgency: 'normal' });
      toast.success("Vendor onboarding initiated!");
    } catch (err) {
      toast.error('Onboarding failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleRunPipeline = useCallback(async () => {
    if (!selectedVendor?.vendor_id) return;
    setPipelineLoading(true);
    try {
      // Try SSE first, fall back to regular POST
      startSSEStream(selectedVendor.vendor_id);
      toast.success(`Agents deployed for ${selectedVendor.vendor_name}`);
    } catch (err) {
      // Fallback: regular POST
      try {
        await runPipeline(selectedVendor.vendor_id);
        toast.success(`Agents deployed for ${selectedVendor.vendor_name}`);
      } catch (e2) {
        toast.error('Pipeline failed: ' + e2.message);
        setPipelineLoading(false);
      }
    }
  }, [selectedVendor, startSSEStream]);

  const handleRunDemo = useCallback(async () => {
    setDemoRunning(true);
    try {
      for (const vendor of vendors) {
        if (!vendor.vendor_id) continue;
        try {
          await runPipeline(vendor.vendor_id);
          // Small delay between vendors
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.warn(`Demo pipeline failed for ${vendor.vendor_name}:`, err);
        }
      }
      toast.success('Demo pipeline complete for all vendors!');
    } catch (err) {
      toast.error('Demo run failed: ' + err.message);
    } finally {
      setDemoRunning(false);
    }
  }, [vendors]);

  // Filter vendors based on search term
  const filteredVendors = Array.isArray(vendors) 
    ? vendors.filter(v => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          (v.vendor_name || '').toLowerCase().includes(term) ||
          (v.industry || '').toLowerCase().includes(term) ||
          (v.workflow_status || '').toLowerCase().includes(term) ||
          (v.vendor_id || '').toLowerCase().includes(term)
        );
      })
    : [];

  // Stats
  const totalVendors = Array.isArray(vendors) ? vendors.length : 0;
  const activeCount = vendors.filter(v => v.workflow_status === 'active' || v.workflow_status === 'processing').length;
  const completedCount = vendors.filter(v => v.workflow_status === 'complete' || v.workflow_status === 'completed').length;
  const flaggedCount = vendors.filter(v => v.workflow_status === 'escalated' || v.workflow_status === 'halted' || (v.fraud_flags && v.fraud_flags.length > 0)).length;

  const handleCopyLink = (vendorId) => {
    const url = `${window.location.origin}/supplier/${vendorId}`;
    navigator.clipboard.writeText(url);
    toast.success('Supplier portal link copied!');
  };

  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      <main className="max-w-[1400px] w-full mx-auto px-6 py-6 flex-1 flex flex-col">
        {/* Demo Mode Banner */}
        <DemoBanner onRunDemo={handleRunDemo} demoRunning={demoRunning} />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Building2} label="Total Vendors" value={totalVendors} color="blue" />
          <StatCard icon={Loader2} label="Active Pipelines" value={activeCount} color="teal" />
          <StatCard icon={CheckCircle} label="Completed" value={completedCount} color="emerald" />
          <StatCard icon={AlertTriangle} label="Flagged / Escalated" value={flaggedCount} color="red" />
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Vendor List Panel */}
          <div className="w-[55%] flex flex-col nexus-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search vendors by name, industry, or status..." 
                  className="nexus-input pl-9 pr-4 py-2 text-sm bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <span className="text-xs text-slate-400 font-mono whitespace-nowrap">{filteredVendors.length} results</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredVendors.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
                   <Users className="w-12 h-12 mb-3 text-slate-200" />
                   <p className="text-sm font-medium text-slate-500">{searchTerm ? 'No matching vendors' : 'No vendors yet'}</p>
                   <p className="text-xs mt-1">{searchTerm ? 'Try a different search term.' : 'Click "New Vendor" to start.'}</p>
                 </div>
              ) : (
                filteredVendors.map((v, i) => (
                  <div 
                    key={v.vendor_id || i}
                    className={`animate-stagger-in ${flashingVendorIds.has(v.vendor_id) ? 'animate-flash-border' : ''}`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <VendorRequestCard 
                      vendor={v}
                      isSelected={selectedVendor?.vendor_id === v.vendor_id}
                      onClick={() => setSelectedVendor(v)}
                      onCopyLink={() => handleCopyLink(v.vendor_id)}
                      onViewDetails={() => setDrawerVendor(v)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Agent Activity Panel */}
          <div className="w-[45%] flex flex-col gap-5">
            {selectedVendor ? (
              <div className="flex-1 flex flex-col nexus-card overflow-hidden relative">
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30 flex justify-between items-center shrink-0">
                  <h3 className="font-syne font-bold text-[#0f1f3d] flex items-center gap-3 text-sm">
                    <span className="status-dot-active" />
                    Agent Activity
                    <span className="text-[10px] font-bold text-slate-400 ml-1 font-mono uppercase tracking-wider">
                      {selectedVendor.vendor_name}
                    </span>
                  </h3>
                  <button
                    onClick={handleRunPipeline}
                    disabled={pipelineLoading}
                    className="nexus-btn-teal py-1.5 px-3 text-xs disabled:opacity-50"
                  >
                    {pipelineLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
                    ) : (
                      <><Zap className="w-3.5 h-3.5" /> Run Pipeline</>
                    )}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                   <AgentActivityFeed 
                     auditLog={selectedVendor.audit_log || []} 
                     isLive={pipelineLoading} 
                     vendorId={selectedVendor.vendor_id}
                     sseActive={sseActive}
                     sseEntries={sseEntries}
                   />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center nexus-card text-slate-400 p-8 text-center">
                 <Zap className="w-12 h-12 text-slate-200 mb-4" />
                 <p className="font-syne text-lg text-slate-600 font-bold">No Vendor Selected</p>
                 <p className="text-sm mt-2">Select a vendor from the list to view real-time agent activity.</p>
              </div>
            )}
          </div>
        </div>

        {/* Time Saved Counter */}
        <div className="mt-6">
           <TimeSavedCounter 
             hours={totalVendors * 4.5} 
             completedSteps={Array.isArray(vendors) ? vendors.reduce((acc, v) => acc + (v.current_step || 0), 0) : 0} 
           />
        </div>
      </main>

      {/* Onboarding Modal */}
      {showOnboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1f3d]/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-slide-up border border-slate-200">
            <div className="nexus-gradient-subtle border-b border-slate-100 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-syne font-bold text-[#0f1f3d]">New Vendor Request</h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">Step {onboardStep} of 2</p>
              </div>
              <button onClick={() => { setShowOnboard(false); setOnboardStep(1); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleOnboard} className="p-8">
              {onboardStep === 1 ? (
                <div className="space-y-5 animate-slide-in">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={form.vendor_name}
                      onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
                      placeholder="e.g. MedEquip Solutions Pvt Ltd"
                      className="nexus-input"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Industry</label>
                      <select
                        value={form.industry}
                        onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                        className="nexus-input"
                      >
                        {INDUSTRIES.map(ind => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Primary Region</label>
                      <select className="nexus-input">
                        <option>India (Domestic)</option>
                        <option>APAC</option>
                        <option>EMEA</option>
                        <option>Americas</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                      placeholder="compliance@company.in"
                      className="nexus-input"
                      required
                    />
                  </div>
                  <div className="pt-4">
                    <button 
                      type="button" 
                      onClick={() => setOnboardStep(2)}
                      className="w-full nexus-btn-primary py-3 flex justify-center items-center gap-2"
                    >
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-slide-in">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Verification Urgency</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Standard', 'High', 'Overnight'].map(urg => (
                        <button
                          key={urg}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, urgency: urg.toLowerCase() }))}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            form.urgency === urg.toLowerCase() 
                              ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          <p className="text-xs font-bold uppercase tracking-wide">{urg}</p>
                          <p className="text-[10px] mt-1 opacity-70">
                            {urg === 'Standard' ? '48 hrs' : urg === 'High' ? '12 hrs' : '3 hrs'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 flex gap-3">
                    <Bot className="w-5 h-5 text-teal-600 shrink-0" />
                    <p className="text-xs text-teal-800">
                      Nexus AI will automatically generate a custom <strong>{form.industry}</strong> compliance checklist based on your selection.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setOnboardStep(1)} className="nexus-btn-outline flex-1">Previous</button>
                    <button type="submit" disabled={loading} className="nexus-btn-teal flex-[2]">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      {loading ? 'Initializing Agents…' : 'Start Onboarding'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Vendor Detail Drawer */}
      <VendorDetailDrawer
        isOpen={!!drawerVendor}
        onClose={() => setDrawerVendor(null)}
        vendor={drawerVendor}
      />
    </div>
  );
}

export default function BuyerDashboard() {
  return (
    <Routes>
      <Route path="/" element={<OnboardingTab />} />
      <Route path="health" element={
        <div className="max-w-[1400px] mx-auto px-6 py-6 page-enter">
          <VendorHealthPage />
        </div>
      } />
      <Route path="audit" element={
        <div className="max-w-[1400px] mx-auto px-6 py-6 page-enter">
          <AuditLogsPage />
        </div>
      } />
    </Routes>
  );
}
