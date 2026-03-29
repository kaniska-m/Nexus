'use client';

import { Building2, ChevronRight, Copy, AlertTriangle, CheckCircle, Loader2, Zap } from 'lucide-react';

const STATUS_CONFIG = {
  active:    { label: 'Active',    className: 'badge-active' },
  processing:{ label: 'Processing',className: 'badge-active' },
  complete:  { label: 'Complete',  className: 'badge-complete' },
  completed: { label: 'Complete',  className: 'badge-complete' },
  escalated: { label: 'Escalated', className: 'badge-escalated' },
  halted:    { label: 'Halted',    className: 'badge-halted' },
  stalled:   { label: 'Stalled',   className: 'badge-stalled' },
  pending:   { label: 'Pending',   className: 'badge-pending' },
};

const RISK_CONFIG = {
  Low:    { className: 'risk-low', label: 'Low Risk' },
  low:    { className: 'risk-low', label: 'Low Risk' },
  Medium: { className: 'risk-medium', label: 'Medium' },
  medium: { className: 'risk-medium', label: 'Medium' },
  High:   { className: 'risk-high', label: 'High Risk' },
  high:   { className: 'risk-high', label: 'High Risk' },
};

export default function VendorRequestCard({ vendor, isSelected, onClick, onCopyLink, onViewDetails, onRunPipeline, isPipelineRunning }) {
  const status = vendor.workflow_status || 'pending';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const riskConfig = RISK_CONFIG[vendor.risk_score] || null;
  const hasFraud = vendor.fraud_flags && vendor.fraud_flags.length > 0;
  const checklist = vendor.checklist || [];
  const verified = checklist.filter(c => c.status === 'verified').length;
  const total = checklist.length;

  return (
    <div
      onClick={onClick}
      className={`group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500/60 bg-blue-50/40 shadow-[0_0_0_3px_rgba(37,99,235,0.08)]' 
          : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50/50 hover:shadow-sm'
      }`}
    >
      {/* Top Row: Name + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'
          } transition-colors`}>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[#0f1f3d] truncate">{vendor.vendor_name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-400 font-mono">{vendor.vendor_id?.slice(0, 12)}...</span>
              {vendor.industry && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                  {vendor.industry}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`nexus-badge text-[10px] shrink-0 ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Bottom Row: Risk, Progress, Fraud, Copy Link */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/80">
        <div className="flex items-center gap-2 flex-wrap">
          {riskConfig && (
            <span className={`nexus-badge text-[10px] ${riskConfig.className}`}>
              {riskConfig.label}
            </span>
          )}
          {total > 0 && (
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              {verified}/{total} docs
            </span>
          )}
          {hasFraud && (
            <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" /> {vendor.fraud_flags.length} flag{vendor.fraud_flags.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRunPipeline && (
            <button
              onClick={(e) => { e.stopPropagation(); onRunPipeline(); }}
              disabled={isPipelineRunning}
              className={`p-1.5 rounded-md transition-colors ${
                isPipelineRunning
                  ? 'text-blue-400 bg-blue-50 cursor-not-allowed'
                  : 'text-slate-300 hover:text-teal-600 hover:bg-teal-50'
              }`}
              title={isPipelineRunning ? 'Pipeline running...' : 'Run Pipeline'}
            >
              {isPipelineRunning
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Zap className="w-3.5 h-3.5" />}
            </button>
          )}
          {onCopyLink && (
            <button 
              onClick={(e) => { e.stopPropagation(); onCopyLink(); }} 
              className="p-1.5 rounded-md text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="Copy Supplier Portal Link"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}
            className="p-1.5 rounded-md text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
            title="View Details"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${
              isSelected ? 'text-blue-500 translate-x-0.5' : 'group-hover:translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
}
