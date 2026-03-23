import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Plus, Loader2, ChevronRight,
  Building2, FileCheck, AlertTriangle, TrendingUp, Zap, Search, Clock, Bot, X, ShieldCheck
} from 'lucide-react';
import { onboardVendor, runPipeline, getVendorStatus, listVendors } from '../api/nexusApi';
import TimeSavedCounter from '../components/TimeSavedCounter';
import AgentActivityFeed from '../components/AgentActivityFeed';
import VendorRequestCard from '../components/VendorRequestCard';
import VendorHealthPage from './VendorHealthPage';
import AuditLogsPage from './AuditLogsPage';

const INDUSTRIES = ['MedTech', 'FinTech', 'GovTech', 'SaaS', 'E-commerce', 'Logistics'];

function OnboardingTab() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [onboardStep, setOnboardStep] = useState(1);
  const [form, setForm] = useState({ vendor_name: '', industry: 'MedTech', contact_email: '', urgency: 'normal' });
  const location = useLocation();

  useEffect(() => {
    if (location.search === '?new=true') {
      setShowOnboard(true);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  const handleOnboard = useCallback(async (e) => {
    e.preventDefault();
    console.log("Starting Onboarding with form:", form);
    setLoading(true);
    try {
      const res = await onboardVendor(form);
      console.log("Onboarding Response:", res);
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
      console.error("Onboarding Error:", err);
      toast.error('Onboarding failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleRunPipeline = useCallback(async () => {
    if (!selectedVendor?.vendor_id) return;
    setPipelineLoading(true);
    try {
      await runPipeline(selectedVendor.vendor_id);
      toast.success(`Agents deployed for ${selectedVendor.vendor_name}`);
    } catch (err) {
      toast.error('Pipeline failed: ' + err.message);
      setPipelineLoading(false);
    }
  }, [selectedVendor]);

  useEffect(() => {
    if (!selectedVendor?.vendor_id) return;
    const poll = async () => {
      try {
        const res = await getVendorStatus(selectedVendor.vendor_id);
        const data = res.data || res;
        setSelectedVendor(data);
        setVendors(prev => prev.map(v => v.vendor_id === data.vendor_id ? data : v));
        if (data.workflow_status === 'completed' || data.workflow_status === 'failed') {
          setPipelineLoading(false);
        } else if (data.workflow_status === 'processing' || data.workflow_status === 'halted') {
          setPipelineLoading(true);
        }
      } catch (e) {
        console.error("Poller Error:", e);
      }
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [selectedVendor?.vendor_id]);

  useEffect(() => {
    async function init() {
      try {
        console.log("Fetching vendors list...");
        const res = await listVendors();
        console.log("List Vendors Response:", res);
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

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      <main className="max-w-[1400px] w-full mx-auto px-6 py-6 flex-1 flex flex-col">
        <div className="flex gap-6 flex-1 min-h-0">
          <div className="w-[60%] flex flex-col bg-white rounded-xl shadow-[0_2px_12px_rgba(15,31,61,0.08)] border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search vendors..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {!Array.isArray(vendors) || vendors.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400">
                   <Users className="w-12 h-12 mb-3 text-slate-300" />
                   <p className="text-sm font-medium text-slate-500">No vendors yet</p>
                   <p className="text-xs mt-1">Click "New Vendor Request" to start.</p>
                 </div>
              ) : (
                vendors.map((v, i) => (
                  <VendorRequestCard 
                    key={v.vendor_id || i}
                    vendor={v}
                    isSelected={selectedVendor?.vendor_id === v.vendor_id}
                    onClick={() => setSelectedVendor(v)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="w-[40%] flex flex-col gap-6">
            {selectedVendor ? (
              <div className="flex-1 flex flex-col bg-white rounded-xl shadow-[0_2px_12px_rgba(15,31,61,0.08)] border border-slate-200 overflow-hidden relative">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                  <h3 className="font-syne font-bold text-navy flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Agent Activity
                    <span className="text-xs font-normal text-slate-500 ml-2 font-dm">Agents running</span>
                  </h3>
                  <button
                    onClick={handleRunPipeline}
                    disabled={pipelineLoading}
                    className="nexus-btn-primary py-1.5 px-3 text-xs disabled:opacity-50"
                  >
                    {pipelineLoading ? 'Running...' : 'Run Pipeline'}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                   <AgentActivityFeed auditLog={selectedVendor.audit_log || []} isLive={pipelineLoading} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl shadow-[0_2px_12px_rgba(15,31,61,0.08)] border border-slate-200 text-slate-400 p-8 text-center">
                 <Zap className="w-12 h-12 text-slate-200 mb-4" />
                 <p className="font-syne text-lg text-slate-600 font-bold">No Vendor Selected</p>
                 <p className="text-sm mt-2">Select a vendor from the request list to view real-time agent activity and compliance status.</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6">
           <TimeSavedCounter 
             hours={(Array.isArray(vendors) ? vendors.length : 0) * 4.5} 
             completedSteps={Array.isArray(vendors) ? vendors.reduce((acc, v) => acc + (v.current_step || 0), 0) : 0} 
           />
        </div>
      </main>

      {showOnboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-slide-up">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-syne font-bold text-navy">New Vendor Request</h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">Step {onboardStep} of 2</p>
              </div>
              <button onClick={() => setShowOnboard(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
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
                              ? 'border-accent bg-blue-50 text-accent' 
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
                      Nexus AI will automatically generate a custom {form.industry} compliance checklist based on this selection.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setOnboardStep(1)} className="nexus-btn-outline flex-1 justify-center">Previous</button>
                    <button type="submit" disabled={loading} className="nexus-btn-teal flex-[2] justify-center">
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
    </div>
  );
}

export default function BuyerDashboard() {
  return (
    <Routes>
      <Route path="/" element={<OnboardingTab />} />
      <Route path="health" element={<VendorHealthPage />} />
      <Route path="audit" element={<AuditLogsPage />} />
    </Routes>
  );
}
