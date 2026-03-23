import { Clock } from 'lucide-react';

export default function VendorRequestCard({ vendor, isSelected, onClick }) {
  const getStatusBadge = (status) => {
    const map = {
      active: 'bg-blue-100 text-blue-700 border-blue-200', 
      complete: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      stalled: 'bg-amber-100 text-amber-700 border-amber-200',
      escalated: 'bg-red-100 text-red-700 border-red-200', 
      halted: 'bg-red-100 text-red-800 border-red-300',
    };
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider font-mono border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`;
  };

  const getStatusLabel = (status) => {
    if (status === 'escalated') return 'Exceptions Found';
    if (status === 'pending') return 'Awaiting Supplier';
    if (status === 'active') return 'In Progress';
    if (status === 'complete') return 'Complete';
    return status;
  };

  const currentStep = vendor.current_step || 1;
  const progressPercent = Math.round((currentStep / 14) * 100);

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer nexus-card-hover ${
        isSelected ? 'border-accent bg-blue-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <span className="font-syne font-bold text-base text-navy">{vendor.vendor_name}</span>
          <span className="inline-block mt-1 bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-max">
            {vendor.industry}
          </span>
        </div>
        <span className={getStatusBadge(vendor.workflow_status)}>
          {getStatusLabel(vendor.workflow_status)}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
          <span>Step {currentStep} of 14 — Processing</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-teal-500 h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center text-[11px] text-slate-400 font-medium">
        <Clock className="w-3 h-3 mr-1.5 opacity-70" />
        Started 4 hrs ago
      </div>
    </div>
  );
}
