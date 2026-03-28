'use client';

import { X, TrendingUp, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, ExternalLink, FileText, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';

const RISK_CONFIG = {
  Low:    { icon: ShieldCheck, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Low Risk', score: 92 },
  low:    { icon: ShieldCheck, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Low Risk', score: 92 },
  Medium: { icon: ShieldAlert, gradient: 'from-amber-400 to-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Medium Risk', score: 65 },
  medium: { icon: ShieldAlert, gradient: 'from-amber-400 to-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Medium Risk', score: 65 },
  High:   { icon: ShieldX, gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-700', label: 'High Risk', score: 28 },
  high:   { icon: ShieldX, gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-700', label: 'High Risk', score: 28 },
};

const HEALTH_CONFIG = {
  green: { color: 'emerald', label: 'Healthy', icon: ShieldCheck },
  amber: { color: 'amber', label: 'Needs Attention', icon: ShieldAlert },
  red:   { color: 'red', label: 'Critical', icon: ShieldX },
};

function normalizeHealth(s) { return (s || '').toLowerCase(); }

export default function VendorHealthDrawer({ isOpen, onClose, vendor }) {
  if (!vendor) return null;
  const risk = RISK_CONFIG[vendor.risk_score] || RISK_CONFIG.Low;
  const RiskIcon = risk.icon;
  const healthStatus = normalizeHealth(vendor.health_status);
  const health = HEALTH_CONFIG[healthStatus] || HEALTH_CONFIG.green;
  const HealthIcon = health.icon;
  const checklist = vendor.checklist || [];
  const fraudFlags = vendor.fraud_flags || [];
  const auditLog = vendor.audit_log || [];
  const verified = checklist.filter(c => c.status === 'verified').length;
  const total = checklist.length;

  return (
    <>
      <div className={`fixed inset-0 bg-[#0f1f3d]/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-xl bg-slate-50 shadow-2xl z-[70] transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="bg-white border-b border-slate-200 p-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-syne font-bold text-[#0f1f3d]">{vendor.vendor_name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{vendor.industry} • Health Profile</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className={`rounded-xl bg-${health.color}-50 border border-${health.color}-200 p-4 flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-full bg-${health.color}-100 flex items-center justify-center`}><HealthIcon className={`w-6 h-6 text-${health.color}-600`} /></div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider text-${health.color}-600`}>Current Health</p>
              <p className={`text-xl font-syne font-bold text-${health.color}-800`}>{health.label}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="nexus-card overflow-hidden"><div className={`bg-gradient-to-r ${risk.gradient} p-3 text-white flex items-center gap-3`}><RiskIcon className="w-6 h-6" /><div><p className="text-[10px] uppercase tracking-wider opacity-80">Risk</p><p className="text-lg font-syne font-bold">{risk.label}</p></div></div></div>
            <div className="nexus-card p-4 flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-blue-600" /></div><div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Documents</p><p className="text-lg font-syne font-bold text-[#0f1f3d]">{verified}/{total}</p></div></div>
          </div>
          {checklist.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50"><FileText className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-syne font-bold text-[#0f1f3d]">Compliance Documents</h3></div>
              <div className="divide-y divide-slate-100">
                {checklist.map((item, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${item.status === 'verified' ? 'bg-emerald-100 text-emerald-600' : item.status === 'failed' ? 'bg-red-100 text-red-600' : item.status === 'submitted' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {item.status === 'verified' ? <CheckCircle className="w-3.5 h-3.5" /> : item.status === 'failed' ? <XCircle className="w-3.5 h-3.5" /> : <FileText className="w-3 h-3" />}
                      </div>
                      <div><p className="text-sm font-medium text-[#0f1f3d]">{item.document_name}</p><p className="text-[10px] text-slate-400">{item.category}</p></div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : item.status === 'failed' ? 'bg-red-100 text-red-700' : item.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {fraudFlags.length > 0 && (
            <section className="bg-white rounded-xl border border-red-200 overflow-hidden">
              <div className="p-4 border-b border-red-100 bg-red-50/50 flex items-center justify-between">
                <h3 className="text-sm font-syne font-bold text-red-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Active Fraud Flags</h3>
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{fraudFlags.length}</span>
              </div>
              <div className="divide-y divide-red-100">
                {fraudFlags.map((flag, i) => (<div key={i} className="p-4"><p className="text-sm font-bold text-red-800">{flag.doc_name}</p><p className="text-xs text-red-600 mt-0.5">{flag.description}</p><div className="flex gap-3 mt-2"><span className="text-[10px] font-bold text-red-500 uppercase">{flag.flag_type?.replace('_', ' ')}</span><span className="text-[10px] text-slate-400">Severity: {flag.severity}</span></div></div>))}
              </div>
            </section>
          )}
          {vendor.risk_rationale && (<section className="bg-white rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-syne font-bold text-[#0f1f3d] mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-500" />Risk Assessment Notes</h3><p className="text-sm text-slate-600 leading-relaxed">{vendor.risk_rationale}</p></section>)}
          {auditLog.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between"><h3 className="text-sm font-syne font-bold text-[#0f1f3d] flex items-center gap-2"><Clock className="w-4 h-4 text-purple-500" />Recent Agent Activity</h3><span className="text-[10px] text-slate-400 font-mono">{auditLog.length} entries</span></div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {[...auditLog].reverse().slice(0, 5).map((entry, i) => (<div key={i} className="px-4 py-3"><div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-blue-600 uppercase">{entry.agent}</span><span className="text-[10px] text-slate-400 font-mono">{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span></div><p className="text-sm text-slate-700">{entry.action}</p></div>))}
              </div>
            </section>
          )}
        </div>
        <div className="bg-white border-t border-slate-200 p-5 shrink-0">
          <a href={`/supplier/${vendor.vendor_id}`} target="_blank" rel="noopener noreferrer" className="w-full nexus-btn-primary py-3 flex items-center justify-center gap-2"><ExternalLink className="w-4 h-4" /> Open Supplier Portal</a>
        </div>
      </div>
    </>
  );
}
