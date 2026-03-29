// ============================================================================
// Nexus — Vendor Detail Drawer
// ============================================================================

import { useState } from 'react';
import { X, FileText, CheckCircle, AlertTriangle, ShieldCheck, ShieldAlert, ShieldX, ExternalLink, Copy, XCircle, Info, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:   { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  verified:  { label: 'Verified', className: 'bg-emerald-100 text-emerald-700' },
  failed:    { label: 'Failed', className: 'bg-red-100 text-red-700' },
};

const RISK_CONFIG = {
  Low:    { icon: ShieldCheck, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Low Risk' },
  low:    { icon: ShieldCheck, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Low Risk' },
  Medium: { icon: ShieldAlert, gradient: 'from-amber-400 to-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Medium Risk' },
  medium: { icon: ShieldAlert, gradient: 'from-amber-400 to-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Medium Risk' },
  High:   { icon: ShieldX, gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-700', label: 'High Risk' },
  high:   { icon: ShieldX, gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-700', label: 'High Risk' },
};

export default function VendorDetailDrawer({ isOpen, onClose, vendor }) {
  const [tab, setTab] = useState('overview');
  const [downloading, setDownloading] = useState(false);

  if (!vendor) return null;

  const risk = RISK_CONFIG[vendor.risk_score] || RISK_CONFIG.Low;
  const RiskIcon = risk.icon;
  const checklist = vendor.checklist || [];
  const fraudFlags = vendor.fraud_flags || [];
  const exceptions = vendor.exceptions || [];
  const auditLog = vendor.audit_log || [];
  const verified = checklist.filter(c => c.status === 'verified').length;
  const total = checklist.length;
  const progressPct = total > 0 ? Math.round((verified / total) * 100) : 0;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/supplier/${vendor.vendor_id}`);
    toast.success("Link copied!");
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const resp = await fetch(`/api/vendor/${vendor.vendor_id}/audit-pdf`);
      if (!resp.ok) throw new Error("Report not available yet.");
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_pack_${vendor.vendor_id.slice(0,8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Audit report downloaded.");
    } catch (e) {
      toast.error(e.message || "Failed to download audit report.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-[#0f1f3d]/40 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className="fixed top-0 right-0 h-full bg-slate-50 shadow-2xl z-[70] flex flex-col"
        style={{ 
          width: isOpen ? '480px' : '0px', 
          overflow: 'hidden',
          transition: 'width 240ms ease-out' 
        }}
      >
        <div className="w-[480px] h-full flex flex-col">
          {/* Header */}
          <div className="bg-white p-5 flex items-start justify-between shrink-0">
            <div className="min-w-0">
              <h2 className="text-xl font-syne font-bold text-[#0f1f3d] truncate">{vendor.vendor_name}</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-slate-400 font-mono">#{vendor.vendor_id?.slice(0, 12)}</span>
                {vendor.industry && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium tracking-wide">{vendor.industry}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Tab Indicator */}
          <div className="flex bg-white relative shrink-0">
            <button onClick={() => setTab('overview')} className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${tab === 'overview' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Overview</button>
            <button onClick={() => setTab('audit')} className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${tab === 'audit' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Audit Trail</button>
            <div 
              className="absolute bottom-0 h-0.5 bg-blue-600 transition-all duration-200 ease-out w-1/2"
              style={{ left: tab === 'overview' ? '0%' : '50%' }}
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 scroll-smooth">
            {tab === 'overview' && (
              <div className="space-y-5 animate-fade-in">
                {/* Risk Score Card */}
                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 animate-slide-in-top">
                  <div className={`bg-gradient-to-r ${risk.gradient} p-4 text-white flex items-center gap-4`}>
                    <RiskIcon className="w-9 h-9" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-80 font-mono">Risk Assessment</p>
                      <p className="text-xl font-syne font-bold">{risk.label}</p>
                    </div>
                  </div>
                  {vendor.risk_rationale && (
                    <div className={`p-4 ${risk.bg}`}>
                      <p className={`text-sm leading-relaxed ${risk.text}`}>{vendor.risk_rationale}</p>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="nexus-card p-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Document Compliance</p>
                    <span className="text-sm font-syne font-bold nexus-gradient-text">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">{verified} of {total} documents verified</p>
                </div>

                {/* Fraud Flags */}
                {fraudFlags.length > 0 && (
                  <div className="nexus-card overflow-hidden border-red-200">
                    <div className="p-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
                      <h3 className="text-sm font-syne font-bold text-red-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        Fraud Flags
                      </h3>
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{fraudFlags.length} FLAG{fraudFlags.length > 1 ? 'S' : ''}</span>
                    </div>
                    <div className="divide-y divide-red-100 bg-red-50/30">
                      {fraudFlags.map((flag, i) => (
                        <div key={i} className="p-4 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-800">{flag.doc_name}</p>
                            <p className="text-xs text-red-600 mt-0.5">{flag.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] font-bold text-red-500 uppercase">{flag.flag_type?.replace('_', ' ')}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Severity: {flag.severity}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exceptions */}
                {exceptions.length > 0 && (
                  <div className="nexus-card overflow-hidden border-amber-200">
                    <div className="p-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                      <h3 className="text-sm font-syne font-bold text-amber-800 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        Exceptions Requiring Review
                      </h3>
                    </div>
                    <div className="divide-y divide-amber-100 bg-amber-50/30">
                      {exceptions.map((exc, i) => (
                        <div key={i} className="p-4 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <Info className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">{exc.exception_type?.replace('_', ' ')}</p>
                            <p className="text-sm text-slate-700 mt-1">{exc.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checklist Table */}
                <div className="nexus-card overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-syne font-bold text-[#0f1f3d]">Task Compliance Checklist</h3>
                  </div>
                  <div className="divide-y divide-slate-100 bg-white">
                    {checklist.map((item, i) => {
                      const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                      return (
                        <div key={i} className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              item.status === 'verified' ? 'bg-emerald-100 text-emerald-600' :
                              item.status === 'submitted' ? 'bg-blue-100 text-blue-600' :
                              item.status === 'failed' ? 'bg-red-100 text-red-600' :
                              'bg-slate-100 text-slate-400'
                            }`}>
                              {item.status === 'verified' ? <CheckCircle className="w-3.5 h-3.5" /> :
                               item.status === 'failed' ? <XCircle className="w-3.5 h-3.5" /> :
                               <FileText className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#0f1f3d] truncate">{item.document_name}</p>
                              <p className="text-[10px] text-slate-400">{item.category}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusConf.className}`}>
                            {statusConf.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === 'audit' && (
              <div className="animate-fade-in pl-4">
                <div className="border-l border-teal-100 py-2 space-y-6 relative">
                  {auditLog.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 ml-4">No audit events generated yet.</p>
                  ) : (
                    auditLog.map((entry, i) => (
                      <div key={i} className="relative pl-6">
                        {/* Dot indicator */}
                        <div 
                          className="absolute w-2.5 h-2.5 bg-teal-400 rounded-full border-2 border-white" 
                          style={{ left: '-5px', top: '5px' }} 
                        />
                        <div className="animate-slide-in-top" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                          <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mb-1">
                            {new Date(entry.timestamp).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </p>
                          <p className="text-sm font-bold text-[#0f1f3d] mb-0.5">
                            <span className="text-blue-600">{entry.agent}</span> — {entry.action}
                          </p>
                          {entry.reason && <p className="text-xs text-slate-500 leading-relaxed">{entry.reason}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex gap-3 mb-3">
              <button 
                onClick={handleDownloadPdf} 
                disabled={downloading}
                className="nexus-btn-primary flex-1 py-2.5 flex justify-center items-center gap-2 text-sm disabled:opacity-50"
              >
                {downloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
                ) : (
                  <><Download className="w-4 h-4" /> Download Audit Report</>
                )}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCopyLink} className="nexus-btn-outline flex-[1] text-xs py-2 flex items-center justify-center gap-2 text-slate-500">
                <Copy className="w-3 h-3" /> Copy URL
              </button>
              <a 
                href={`/supplier/${vendor.vendor_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="nexus-btn-outline flex-[2] text-xs py-2 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 border-blue-200"
              >
                Open Supplier Portal <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
