'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, Bot, Zap, Shield, FileSearch } from 'lucide-react';
import { useRealtime } from '@/components/RealtimeProvider';

// ── Agent Colors (pastel pills) ─────────────────────────────────────────────

const AGENT_PILLS = {
  Orchestrator: 'bg-blue-100 text-blue-800',
  Collector: 'bg-teal-100 text-teal-800',
  Verifier: 'bg-amber-100 text-amber-800',
  'Risk Scorer': 'bg-red-100 text-red-800',
  'Audit Agent': 'bg-purple-100 text-purple-800',
  Monitor: 'bg-green-100 text-green-800',
  'Supplier Portal': 'bg-slate-100 text-slate-700',
};

// ── Smart icon logic based on action content ────────────────────────────────

function getEntryIcon(entry) {
  const action = (entry.action || '').toLowerCase();

  if (action.includes('fail') || action.includes('critical') || action.includes('halted') || action.includes('error')) {
    return { Icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' };
  }
  if (action.includes('fraud') || action.includes('escalat') || action.includes('flag')) {
    return { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' };
  }
  if (action.includes('high') && (action.includes('risk') || action.includes('score'))) {
    return { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' };
  }
  if (action.includes('amber') || action.includes('warning') || (action.includes('medium') && action.includes('risk'))) {
    return { Icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
  }
  if (action.includes('verified') || action.includes('approved') || action.includes('complete') || action.includes('passed')) {
    return { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };
  }
  if (action.includes('low') && action.includes('risk')) {
    return { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };
  }
  if (action.includes('received') || action.includes('submitted') || action.includes('collection') || action.includes('sent')) {
    return { Icon: FileSearch, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
  }
  if (action.includes('initiated') || action.includes('generated') || action.includes('started')) {
    return { Icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
  }
  if (action.includes('monitor') || action.includes('health check')) {
    return { Icon: Shield, color: 'text-teal-500', bg: 'bg-teal-50 border-teal-200' };
  }
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

// ════════════════════════════════════════════════════════════════════════════
// MAIN FEED COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function AgentActivityFeed({ auditLog = [], isLive = false, vendorId = null, sseEvents = [] }) {
  const [entries, setEntries] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [processingAgent, setProcessingAgent] = useState(null);
  const containerRef = useRef(null);
  const { subscribeToAuditLogs } = useRealtime();

  // Merge audit_log prop + SSE events
  useEffect(() => {
    const base = [...(auditLog || [])].map((e, i) => ({ ...e, _id: `log-${i}` }));
    const sse = (sseEvents || []).map((e, i) => ({ ...e, _id: `sse-${i}` }));
    // Combine & de-dupe by action text
    const combined = [...base];
    for (const s of sse) {
      if (!combined.some((c) => c.action === s.action && c.agent === s.agent)) {
        combined.push(s);
      }
    }
    setEntries(combined);
    setIsStreaming(sseEvents.length > 0 && isLive);

    // Determine which agent is currently processing
    if (sseEvents.length > 0 && isLive) {
      const lastEvent = sseEvents[sseEvents.length - 1];
      setProcessingAgent(lastEvent?.agent || null);
    } else {
      setProcessingAgent(null);
    }
  }, [auditLog, sseEvents, isLive]);

  // Subscribe to Supabase Realtime for new audit logs (after pipeline)
  useEffect(() => {
    if (!vendorId) return;

    const unsubscribe = subscribeToAuditLogs(vendorId, (newLog) => {
      setEntries((prev) => {
        if (prev.some((e) => e.action === newLog.action && e.agent === newLog.agent)) return prev;
        return [...prev, {
          agent: newLog.agent,
          action: newLog.action,
          reason: newLog.reason,
          timestamp: newLog.created_at,
          _id: `rt-${Date.now()}`,
          _isNew: true,
        }];
      });
    });

    return unsubscribe;
  }, [vendorId, subscribeToAuditLogs]);

  // Scroll to top on new entries when streaming
  useEffect(() => {
    if (containerRef.current && (isStreaming || isLive)) {
      containerRef.current.scrollTop = 0;
    }
  }, [entries.length, isStreaming, isLive]);

  // Newest at top
  const sortedEntries = [...entries].reverse();

  if (sortedEntries.length === 0 && !isLive) {
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
      {/* Live Indicator */}
      {(isLive || isStreaming) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 mb-2">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <div className="absolute w-5 h-5 rounded-full border-2 border-emerald-400/40 animate-pulse" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">LIVE</span>
          {processingAgent && (
            <span className="text-[10px] text-emerald-600 ml-1">— {processingAgent} processing</span>
          )}
        </div>
      )}

      {/* Processing indicator */}
      {isLive && processingAgent && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100 animate-pulse-slow">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs font-semibold text-blue-600">Agent processing...</span>
        </div>
      )}

      {sortedEntries.map((entry, i) => {
        const isMostRecent = i === 0 && (isLive || isStreaming);
        const pillClass = AGENT_PILLS[entry.agent] || 'bg-slate-100 text-slate-700';
        const { Icon, color, bg } = getEntryIcon(entry);

        return (
          <div
            key={entry._id || i}
            className={`relative flex gap-3 ${
              isMostRecent ? 'animate-slide-down' : ''
            } ${entry._isNew ? 'animate-slide-in' : ''}`}
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
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${pillClass}`}>
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
