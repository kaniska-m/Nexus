// ============================================================================
// Nexus — AgentActivityFeed (Realtime)
// Dual data sources: SSE stream (during pipeline) + Supabase Realtime (after).
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, Bot, Zap, Shield, FileSearch } from 'lucide-react';
import { useRealtime } from './RealtimeProvider';

// Agent pill colors — semantic pastel backgrounds
const AGENT_PILL_STYLES = {
  Orchestrator:    { bg: '#dbeafe', color: '#1e40af', cls: 'agent-pill-orchestrator' },
  Collector:       { bg: '#ccfbf1', color: '#0f766e', cls: 'agent-pill-collector' },
  Verifier:        { bg: '#fef3c7', color: '#92400e', cls: 'agent-pill-verifier' },
  'Risk Scorer':   { bg: '#fee2e2', color: '#991b1b', cls: 'agent-pill-risk-scorer' },
  'Audit Agent':   { bg: '#f3e8ff', color: '#6b21a8', cls: 'agent-pill-audit-agent' },
  Monitor:         { bg: '#dcfce7', color: '#166534', cls: 'agent-pill-monitor' },
  'Supplier Portal': { bg: '#f1f5f9', color: '#475569', cls: '' },
};

// Context-aware icon selection based on action text
function getEntryIcon(entry) {
  const action = (entry.action || '').toLowerCase();

  if (action.includes('fail') || action.includes('critical') || action.includes('halted') || action.includes('error'))
    return { Icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' };

  if (action.includes('fraud') || action.includes('escalat') || action.includes('flag'))
    return { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' };

  if (action.includes('high') && (action.includes('risk') || action.includes('score')))
    return { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' };

  if (action.includes('amber') || action.includes('warning') || (action.includes('medium') && action.includes('risk')))
    return { Icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };

  if (action.includes('verified') || action.includes('approved') || action.includes('complete') || action.includes('passed') || action.includes('compiled'))
    return { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };

  if (action.includes('low') && action.includes('risk'))
    return { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };

  if (action.includes('received') || action.includes('submitted') || action.includes('collection') || action.includes('sent'))
    return { Icon: FileSearch, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };

  if (action.includes('initiated') || action.includes('generated') || action.includes('started'))
    return { Icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };

  if (action.includes('monitor') || action.includes('health check'))
    return { Icon: Shield, color: 'text-teal-500', bg: 'bg-teal-50 border-teal-200' };

  return { Icon: Bot, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' };
}

function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  try {
    return new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'Just now';
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-5 py-3 text-sm text-slate-500">
      <Bot className="w-4 h-4 text-slate-400" />
      <span>Agent processing</span>
      <span className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
    </div>
  );
}

function LiveIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="live-dot" />
      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">LIVE</span>
    </div>
  );
}

export default function AgentActivityFeed({ 
  auditLog = [], 
  isLive = false, 
  vendorId = null,
  sseActive = false,       // true when SSE stream is running
  sseEntries = [],         // entries from SSE stream
}) {
  const containerRef = useRef(null);
  const { subscribeToAuditLogs } = useRealtime();
  const [realtimeEntries, setRealtimeEntries] = useState([]);
  const [newEntryIds, setNewEntryIds] = useState(new Set());

  // Merge all sources: audit_log (initial) + SSE entries + realtime entries
  const allEntries = [...auditLog];
  
  // Add SSE entries (dedup by timestamp+action)
  sseEntries.forEach(entry => {
    const exists = allEntries.some(e => 
      e.timestamp === entry.timestamp && e.action === entry.action && e.agent === entry.agent
    );
    if (!exists) allEntries.push(entry);
  });

  // Add realtime entries (dedup)
  realtimeEntries.forEach(entry => {
    const exists = allEntries.some(e => 
      e.timestamp === entry.timestamp && e.action === entry.action && e.agent === entry.agent
    );
    if (!exists) allEntries.push(entry);
  });

  // Sort by timestamp desc (newest first)
  const entries = allEntries.sort((a, b) => {
    const ta = new Date(a.timestamp || 0).getTime();
    const tb = new Date(b.timestamp || 0).getTime();
    return tb - ta;
  });

  // Subscribe to Supabase Realtime audit_logs INSERT (when not in SSE mode)
  useEffect(() => {
    if (sseActive || !vendorId) return;

    const unsub = subscribeToAuditLogs(vendorId, (newLog) => {
      setRealtimeEntries(prev => [newLog, ...prev]);
      // Mark as new for slide-in animation
      const entryKey = `${newLog.timestamp}-${newLog.agent}-${newLog.action}`;
      setNewEntryIds(prev => new Set([...prev, entryKey]));
      // Remove animation marker after 800ms
      setTimeout(() => {
        setNewEntryIds(prev => {
          const next = new Set(prev);
          next.delete(entryKey);
          return next;
        });
      }, 800);
    });

    return unsub;
  }, [vendorId, sseActive, subscribeToAuditLogs]);

  // Auto-scroll to top when new entries arrive in live mode
  useEffect(() => {
    if (containerRef.current && (isLive || sseActive)) {
      containerRef.current.scrollTop = 0;
    }
  }, [entries.length, isLive, sseActive]);

  if (entries.length === 0 && !sseActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
        <Bot className="w-10 h-10 mb-3 text-slate-200" />
        <p className="text-sm font-semibold text-slate-500">No agent activity yet</p>
        <p className="text-xs mt-1">Click <strong>Run Pipeline</strong> to deploy agents.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Live / SSE Status Bar */}
      {(isLive || sseActive) && (
        <div className="px-5 py-2.5 border-b border-slate-100 bg-emerald-50/50 flex items-center justify-between">
          <LiveIndicator />
          {sseActive && (
            <span className="text-[10px] font-mono text-slate-400">
              {sseEntries.length} events received
            </span>
          )}
        </div>
      )}

      {/* Processing indicator */}
      {sseActive && <TypingIndicator />}

      {/* Entries */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {entries.map((entry, i) => {
          const entryKey = `${entry.timestamp}-${entry.agent}-${entry.action}`;
          const isNew = newEntryIds.has(entryKey);
          const isMostRecent = i === 0 && (isLive || sseActive);
          const pillStyle = AGENT_PILL_STYLES[entry.agent] || { bg: '#f1f5f9', color: '#64748b', cls: '' };
          const { Icon, color, bg } = getEntryIcon(entry);

          return (
            <div 
              key={`${entryKey}-${i}`} 
              className={`relative flex gap-3 ${isNew ? 'animate-slide-in-top' : ''} ${isMostRecent ? 'animate-slide-down' : ''}`}
            >
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
                  <span 
                    className={`agent-pill ${pillStyle.cls}`}
                    style={!pillStyle.cls ? { backgroundColor: pillStyle.bg, color: pillStyle.color } : {}}
                  >
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
    </div>
  );
}
