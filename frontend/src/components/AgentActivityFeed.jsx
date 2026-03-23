import { useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

const AGENT_PILLS = {
  Orchestrator: 'bg-navy text-white border-navy',
  Collector: 'bg-blue-600 text-white border-blue-600',
  Verifier: 'bg-teal-600 text-white border-teal-600',
  'Risk Scorer': 'bg-amber-500 text-white border-amber-500',
  'Audit Agent': 'bg-purple-600 text-white border-purple-600',
  Monitor: 'bg-emerald-600 text-white border-emerald-600',
  'Supplier Portal': 'bg-slate-600 text-white border-slate-600',
};

function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  try {
    const time = new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return time;
  } catch {
    return timestamp.slice(11, 16);
  }
}

export default function AgentActivityFeed({ auditLog = [], isLive = false }) {
  const containerRef = useRef(null);
  
  // Newest at top
  const entries = [...auditLog].reverse();

  // The wrapper in BuyerDashboard handles the header. We just render the feed.
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
         <Clock className="w-8 h-8 mb-3 opacity-50" />
         <p className="text-sm">No agent activity yet.</p>
         <p className="text-xs mt-1">Start the pipeline to see actions appear.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto p-5 relative space-y-0" style={{ 
      backgroundImage: 'linear-gradient(to bottom, #e2e8f0 100%, transparent 0)', 
      backgroundSize: '2px 100%', 
      backgroundPosition: '28px 20px', 
      backgroundRepeat: 'no-repeat' 
    }}>
      {entries.map((entry, i) => {
        const isMostRecent = i === 0 && isLive;
        const pillClass = AGENT_PILLS[entry.agent] || 'bg-slate-500 text-white border-slate-500';
        
        let StatusIcon = CheckCircle;
        let iconColor = 'text-green-500';
        
        if (entry.status === 'error' || entry.action.toLowerCase().includes('fail')) {
          StatusIcon = XCircle;
          iconColor = 'text-red-500';
        } else if (entry.status === 'warning' || entry.action.toLowerCase().includes('flag') || entry.reason) {
          StatusIcon = AlertTriangle;
          iconColor = 'text-amber-500';
        }

        return (
          <div key={i} className={`relative flex gap-4 pr-2 pb-6 ${isMostRecent ? 'animate-fade-in' : ''}`}>
             <div className="relative shrink-0 flex flex-col items-center mt-1">
               <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-white border-2 border-slate-200 z-10 
                 ${isMostRecent ? 'ring-4 ring-teal-500/20 shadow-[0_0_12px_rgba(13,148,136,0.6)] animate-pulse' : ''}
               `}>
                 <StatusIcon className={`w-3.5 h-3.5 ${iconColor}`} />
               </div>
             </div>
             
             <div className="flex-1 min-w-0 bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
               <div className="flex justify-between items-start mb-2">
                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm ${pillClass}`}>
                   {entry.agent}
                 </span>
                 <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                   <Clock className="w-3 h-3" />
                   {formatTime(entry.timestamp)}
                 </span>
               </div>
               <p className="text-sm text-slate-700 leading-snug">{entry.action}</p>
               {entry.reason && (
                 <p className="text-xs text-slate-500 mt-1.5 border-l-2 border-slate-200 pl-2">
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
