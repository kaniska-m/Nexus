'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Plus, Loader2, ChevronRight,
  Building2, FileCheck, AlertTriangle, TrendingUp, Zap, Search, Clock, Bot, X, ShieldCheck,
  Copy, CheckCircle, BarChart3, Play, Sparkles
} from 'lucide-react';
import { onboardVendor, listVendors, monitorVendor } from '@/lib/api';
import { useRealtime } from '@/components/RealtimeProvider';
import TimeSavedCounter from '@/components/TimeSavedCounter';
import AgentActivityFeed from '@/components/AgentActivityFeed';
import VendorRequestCard from '@/components/VendorRequestCard';
import VendorDetailDrawer from '@/components/VendorDetailDrawer';

const INDUSTRIES = ['MedTech', 'FinTech', 'GovTech', 'SaaS', 'E-commerce', 'Logistics', 'IT', 'Pharma'];

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

export default function DashboardPage() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineVendorId, setPipelineVendorId] = useState(null);
  const [sseEvents, setSseEvents] = useState([]);
  const [onboardStep, setOnboardStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [flashingVendorId, setFlashingVendorId] = useState(null);
  const [demoDismissed, setDemoDismissed] = useState(true);
  const [demoRunning, setDemoRunning] = useState(false);
  const [form, setForm] = useState({ vendor_name: '', industry: 'MedTech', contact_email: '', urgency: 'normal' });
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscribeToVendors } = useRealtime();
  const esRef = useRef(null);

  // Check localStorage for demo banner
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('nexus_demo_dismissed');
      setDemoDismissed(dismissed === 'true');
    }
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowOnboard(true);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  // Initial fetch
  useEffect(() => {
    async function init() {
      try {
        const res = await listVendors();
        const data = res?.data || res;
        const vendorList = Array.isArray(data) ? data : (data?.vendors || []);
        setVendors(vendorList);
        if (vendorList.length > 0 && !selectedVendor) setSelectedVendor(vendorList[0]);
      } catch (err) {
        console.error('Init Error:', err);
      } finally {
        setInitialLoading(false);
      }
    }
    init();
  }, []);

  // Supabase Realtime: subscribe to vendor changes
  useEffect(() => {
    const unsubscribe = subscribeToVendors((payload) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        const updated = payload.new;
        setVendors((prev) =>
          prev.map((v) => (v.id === updated.id || v.vendor_id === updated.id) ? { ...v, ...updated, vendor_id: updated.id } : v)
        );
        // Flash animation
        setFlashingVendorId(updated.id);
        setTimeout(() => setFlashingVendorId(null), 800);

        // Update selected vendor if it's the same
        setSelectedVendor((prev) => {
          if (prev && (prev.id === updated.id || prev.vendor_id === updated.id)) {
            return { ...prev, ...updated, vendor_id: updated.id };
          }
          return prev;
        });
      } else if (payload.eventType === 'INSERT' && payload.new) {
        const newVendor = { ...payload.new, vendor_id: payload.new.id };
        setVendors((prev) => [newVendor, ...prev]);
      }
    });

    return unsubscribe;
  }, [subscribeToVendors]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, []);

  const handleOnboard = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await onboardVendor(form);
      const vendorData = res?.data || res;
      if (!vendorData || !vendorData.vendor_id) {
        throw new Error('Invalid vendor data returned from backend');
      }
      setSelectedVendor(vendorData);
      setVendors((prev) => (Array.isArray(prev) ? [vendorData, ...prev] : [vendorData]));
      setShowOnboard(false);
      setOnboardStep(1);
      setForm({ vendor_name: '', industry: 'MedTech', contact_email: '', urgency: 'normal' });
      toast.success('Vendor onboarding initiated!');
    } catch (err) {
      toast.error('Onboarding failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [form]);

  // Run Pipeline with SSE streaming
  const handleRunPipeline = useCallback(async (vendorId) => {
    const targetId = vendorId || selectedVendor?.vendor_id;
    if (!targetId) return;

    // Close previous EventSource if any
    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    setPipelineLoading(true);
    setPipelineVendorId(targetId);
    setSseEvents([]);

    try {
      const response = await fetch(`/api/pipeline/${targetId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Pipeline Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
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
                  // Update vendor with final state
                  const finalData = parsed.data;
                  setSelectedVendor((prev) => prev?.vendor_id === targetId || prev?.id === targetId ? { ...prev, ...finalData } : prev);
                  setVendors((prev) => prev.map((v) => (v.vendor_id === targetId || v.id === targetId) ? { ...v, ...finalData } : v));
                } else {
                  setSseEvents((prev) => [...prev, parsed]);
                }
              } catch { /* skip malformed */ }
            }
          }
        }
      }

      toast.success('Pipeline completed!');
    } catch (err) {
      toast.error('Pipeline failed: ' + err.message);
    } finally {
      setPipelineLoading(false);
      setPipelineVendorId(null);
    }
  }, [selectedVendor]);

  // Run Full Demo
  const handleRunDemo = async () => {
    setDemoRunning(true);
    const vendorIds = vendors.map((v) => v.vendor_id || v.id).filter(Boolean);
    for (const vid of vendorIds) {
      try {
        setSelectedVendor(vendors.find((v) => (v.vendor_id || v.id) === vid));
        await handleRunPipeline(vid);
      } catch { /* continue */ }
    }
    setDemoRunning(false);
  };

  const dismissDemo = () => {
    setDemoDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_demo_dismissed', 'true');
    }
  };

  const filteredVendors = Array.isArray(vendors)
    ? vendors.filter((v) => {
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

  const totalVendors = Array.isArray(vendors) ? vendors.length : 0;
  const activeCount = vendors.filter((v) => v.workflow_status === 'active' || v.workflow_status === 'processing').length;
  const completedCount = vendors.filter((v) => v.workflow_status === 'complete' || v.workflow_status === 'completed').length;
  const flaggedCount = vendors.filter((v) => v.workflow_status === 'escalated' || v.workflow_status === 'halted' || (v.fraud_flags && v.fraud_flags.length > 0)).length;

  const handleCopyLink = (vendorId) => {
    const url = `${window.location.origin}/supplier/${vendorId}`;
    navigator.clipboard.writeText(url);
    toast.success('Supplier portal link copied!');
  };

  const isVendorPipelineRunning = (vendorId) => pipelineLoading && pipelineVendorId === vendorId;

  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      <main className="max-w-[1400px] w-full mx-auto px-6 py-6 flex-1 flex flex-col">

        {/* Demo Mode Banner */}
        {!demoDismissed && (
          <div className="mb-6 p-0.5 rounded-xl bg-gradient-to-r from-blue-500 via-teal-400 to-blue-500 animate-slide-down">
            <div className="bg-white rounded-[11px] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100">
                  <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0f1f3d]">🎯 Hackathon Demo — 3 AI-verified vendors loaded | Run Pipeline to see agents in action</p>
                  <p className="text-xs text-slate-500 mt-0.5">Automated pipeline demonstrates full end-to-end multi-agent orchestration.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
              <button
                onClick={handleRunDemo}
                disabled={demoRunning || vendors.length === 0}
                className="nexus-btn-teal px-4 py-2 text-xs"
              >
                {demoRunning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running Demo...</> : <><Play className="w-3.5 h-3.5" /> Run Full Demo</>}
              </button>
              <button onClick={dismissDemo} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {initialLoading ? (
            <>
              <div className="nexus-card h-[90px] skeleton rounded-xl p-4" />
              <div className="nexus-card h-[90px] skeleton rounded-xl p-4" style={{ animationDelay: '150ms' }} />
              <div className="nexus-card h-[90px] skeleton rounded-xl p-4" style={{ animationDelay: '300ms' }} />
              <div className="nexus-card h-[90px] skeleton rounded-xl p-4" style={{ animationDelay: '450ms' }} />
            </>
          ) : (
            <>
              <StatCard icon={Building2} label="Total Vendors" value={totalVendors} color="blue" />
              <StatCard icon={Loader2} label="Active Pipelines" value={activeCount} color="teal" />
              <StatCard icon={CheckCircle} label="Completed" value={completedCount} color="emerald" />
              <StatCard icon={AlertTriangle} label="Flagged / Escalated" value={flaggedCount} color="red" />
            </>
          )}
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
            <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
              {initialLoading ? (
                // Skeleton loading for vendor cards
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="nexus-card p-4 flex gap-4 border-slate-100 skeleton h-[100px] rounded-xl" style={{ animationDelay: `${i * 150}ms` }} />
                ))
              ) : filteredVendors.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 animate-fade-in text-slate-400">
                  <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-50 bg-opacity-50 rounded-full animate-ping opacity-20" />
                    <div className="absolute inset-2 bg-blue-100 rounded-full flex items-center justify-center opacity-60" />
                    <Bot className="w-10 h-10 text-blue-500 relative z-10 animate-pulse-glow rounded-full bg-white p-2 shadow-sm" />
                    <Building2 className="w-6 h-6 text-slate-300 absolute -bottom-1 -right-1 z-20 bg-white rounded-full p-1" />
                  </div>
                  <h3 className="font-syne text-lg font-bold text-[#0f1f3d] mb-2">{searchTerm ? 'No matching vendors' : 'Ready for AI Onboarding'}</h3>
                  <p className="text-sm text-slate-500 max-w-[250px] mx-auto mb-6">
                    {searchTerm ? 'Try a different search term to find what you are looking for.' : 'Onboard your first vendor to see Nexus AI multi-agent orchestration in action.'}
                  </p>
                  {!searchTerm && (
                    <button onClick={() => setShowOnboard(true)} className="nexus-btn-primary shadow-blue-500/20 px-6 py-2.5 rounded-full text-xs animate-slide-up hover:scale-105 active:scale-95 transition-transform duration-200">
                      <Plus className="w-4 h-4" /> Start Onboarding
                    </button>
                  )}
                </div>
              ) : (
                filteredVendors.map((v, i) => {
                  const vid = v.vendor_id || v.id;
                  const isFlashing = flashingVendorId === vid || flashingVendorId === v.id;
                  return (
                    <div
                      key={vid || i}
                      className={`transition-all duration-300 ${isFlashing ? 'ring-2 ring-teal-400 rounded-xl' : ''}`}
                      style={{ animationDelay: `${i * 100}ms`, animation: 'slideUp 0.4s ease-out forwards', opacity: 0 }}
                    >
                      <VendorRequestCard
                        vendor={v}
                        isSelected={selectedVendor?.vendor_id === vid || selectedVendor?.id === vid}
                        onClick={() => { setSelectedVendor(v); setSseEvents([]); }}
                        onCopyLink={() => handleCopyLink(vid)}
                        onViewDetails={() => setDrawerVendor(v)}
                        onRunPipeline={() => handleRunPipeline(vid)}
                        isPipelineRunning={isVendorPipelineRunning(vid)}
                      />
                    </div>
                  );
                })
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
                    onClick={() => handleRunPipeline(selectedVendor.vendor_id || selectedVendor.id)}
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
                    isLive={pipelineLoading && (pipelineVendorId === (selectedVendor.vendor_id || selectedVendor.id))}
                    vendorId={selectedVendor.vendor_id || selectedVendor.id}
                    sseEvents={pipelineVendorId === (selectedVendor.vendor_id || selectedVendor.id) ? sseEvents : []}
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
                    <input type="text" value={form.vendor_name} onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))} placeholder="e.g. MedEquip Solutions Pvt Ltd" className="nexus-input" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Industry</label>
                      <select value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} className="nexus-input">
                        {INDUSTRIES.map((ind) => (<option key={ind} value={ind}>{ind}</option>))}
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
                    <input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} placeholder="compliance@company.in" className="nexus-input" required />
                  </div>
                  <div className="pt-4">
                    <button type="button" onClick={() => setOnboardStep(2)} className="w-full nexus-btn-primary py-3 flex justify-center items-center gap-2">
                      Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-slide-in">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Verification Urgency</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Standard', 'High', 'Overnight'].map((urg) => (
                        <button
                          key={urg}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, urgency: urg.toLowerCase() }))}
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
