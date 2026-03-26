import { useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, Bot, Zap, Shield, FileSearch } from 'lucide-react';

const AGENT_PILLS = {
  Orchestrator: 'bg-[#0f1f3d] text-white',
  Collector: 'bg-blue-600 text-white',
  Verifier: 'bg-teal-600 text-white',
  'Risk Scorer': 'bg-amber-500 text-white',
  'Audit Agent': 'bg-purple-600 text-white',
  Monitor: 'bg-emerald-600 text-white',
  'Supplier Portal': 'bg-slate-600 text-white',
};

// Smarter icon logic based on action text content, not just presence of reason
function getEntryIcon(entry) {
  const action = (entry.action || '').toLowerCase();
  const reason = (entry.reason || '').toLowerCase();
  
  // Failure / Error
  if (action.includes('fail') || action.includes('critical') || action.includes('halted') || action.includes('error')) {
    return { Icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' };
  }
  
  // Fraud / Escalation
  if (action.includes('fraud') || action.includes('escalat') || action.includes('flag')) {
    return { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' };
  }

  // High risk
  if (action.includes('high') && (action.includes('risk') || action.includes('score'))) {
    return { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' };
  }

  // Warning level — amber/medium
  if (action.includes('amber') || action.includes('warning') || (action.includes('medium') && action.includes('risk'))) {
    return { Icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
  }

  // Verification success
  if (action.includes('verified') || action.includes('approved') || action.includes('complete') || action.includes('passed') || action.includes('compiled')) {
    return { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };
  }
  
  // Low risk = good
  if (action.includes('low') && action.includes('risk')) {
    return { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };
  }

  // Collection / receipt
  if (action.includes('received') || action.includes('submitted') || action.includes('collection') || action.includes('sent')) {
    return { Icon: FileSearch, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
  }

  // Workflow initiated / generated
  if (action.includes('initiated') || action.includes('generated') || action.includes('started')) {
    return { Icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
  }

  // Monitoring
  if (action.includes('monitor') || action.includes('health check')) {
    return { Icon: Shield, color: 'text-teal-500', bg: 'bg-teal-50 border-teal-200' };
  }

  // Default: neutral
  return { Icon: Bot, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' };
}

function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  try {
    return new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

export default function AgentActivityFeed({ auditLog = [], isLive = false }) {
  const containerRef = useRef(null);
  
  // Newest at top
  const entries = [...auditLog].reverse();

  useEffect(() => {
    if (containerRef.current && isLive) {
      containerRef.current.scrollTop = 0;
    }
  }, [entries.length, isLive]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
         <Bot className="w-10 h-10 mb-3 text-slate-200" />
         <p className="text-sm font-semibold text-slate-500">No agent activity yet</p>
         <p className="text-xs mt-1">Click <strong>Run Pipeline</strong> to deploy agents.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto p-5 space-y-3">
      {entries.map((entry, i) => {
        const isMostRecent = i === 0 && isLive;
        const pillClass = AGENT_PILLS[entry.agent] || 'bg-slate-500 text-white';
        const { Icon, color, bg } = getEntryIcon(entry);

        return (
          <div key={i} className={`relative flex gap-3 ${isMostRecent ? 'animate-slide-down' : ''}`}>
             {/* Icon */}
             <div className="shrink-0 mt-1">
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${bg} ${
                 isMostRecent ? 'ring-2 ring-teal-400/40 shadow-[0_0_10px_rgba(13,148,136,0.4)]' : ''
               }`}>
                 <Icon className={`w-4 h-4 ${color}`} />
               </div>
             </div>
             
             {/* Content */}
             <div className="flex-1 min-w-0 bg-white rounded-xl p-3.5 shadow-[0_1px_3px_rgba(15,31,61,0.04)] border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group">
               <div className="flex justify-between items-center mb-1.5">
                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${pillClass}`}>
                   {entry.agent}
                 </span>
                 <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                   <Clock className="w-3 h-3" />
                   {formatTime(entry.timestamp)}
                 </span>
               </div>
               <p className="text-sm text-slate-800 leading-snug font-medium">{entry.action}</p>
               {entry.reason && (
                 <p className="text-xs text-slate-500 mt-1.5 pl-2 border-l-2 border-slate-200 leading-relaxed">
                   {entry.reason}
                 </p>
               )}
             </div>
          </div>
        );
      })}
    </div>
  );
}
