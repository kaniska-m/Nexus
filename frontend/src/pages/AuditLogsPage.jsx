// ============================================================================
// Nexus — Audit Logs Page (Realtime)
// Supabase Realtime, Cmd+K search, row expand, pagination.
// ============================================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Download, Filter, Calendar, FileText, Bot, CheckCircle, AlertTriangle, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { listVendors } from '../api/nexusApi';
import { useRealtime } from '../components/RealtimeProvider';

const AGENT_PILL_STYLES = {
  Orchestrator:    { bg: '#dbeafe', color: '#1e40af' },
  Collector:       { bg: '#ccfbf1', color: '#0f766e' },
  Verifier:        { bg: '#fef3c7', color: '#92400e' },
  'Risk Scorer':   { bg: '#fee2e2', color: '#991b1b' },
  'Audit Agent':   { bg: '#f3e8ff', color: '#6b21a8' },
  Monitor:         { bg: '#dcfce7', color: '#166534' },
  'Supplier Portal': { bg: '#f1f5f9', color: '#475569' },
};

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('All Agents');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [newLogIds, setNewLogIds] = useState(new Set());

  const searchRef = useRef(null);
  const { subscribeToAuditLogs } = useRealtime();

  // ── Keyboard shortcut: Ctrl/Cmd + K → focus search ───────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Initial data load ────────────────────────────────────────────
  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await listVendors();
        const data = res.data || res;
        const vendorList = Array.isArray(data) ? data : (data?.vendors || []);
        const allLogs = vendorList.flatMap(v => (v.audit_log || []).map(log => ({
          ...log,
          vendor_name: v.vendor_name,
          vendor_id: v.vendor_id,
          _id: `${v.vendor_id}-${log.timestamp}-${log.agent}-${log.action}`,
        })));
        const sorted = allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  // ── Supabase Realtime: audit_logs INSERT ─────────────────────────
  useEffect(() => {
    const unsub = subscribeToAuditLogs(null, (newLog) => {
      const logWithId = {
        ...newLog,
        _id: `${newLog.vendor_id}-${newLog.timestamp}-${newLog.agent}-${newLog.action}`,
      };
      
      setLogs(prev => [logWithId, ...prev]);
      
      // Mark as new for slide-in animation
      setNewLogIds(prev => new Set([...prev, logWithId._id]));
      setTimeout(() => {
        setNewLogIds(prev => {
          const next = new Set(prev);
          next.delete(logWithId._id);
          return next;
        });
      }, 800);

      // Reset to page 1 when new log arrives  
      setCurrentPage(1);
    });

    return unsub;
  }, [subscribeToAuditLogs]);

  // ── Filtering ────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        (log.vendor_name || '').toLowerCase().includes(term) ||
        (log.agent || '').toLowerCase().includes(term) ||
        (log.action || '').toLowerCase().includes(term)
      );
    }

    if (agentFilter !== 'All Agents') {
      result = result.filter(log => log.agent === agentFilter);
    }

    if (dateFilter !== 'All Time') {
      const now = new Date();
      let cutoff;
      if (dateFilter === 'Last 24 Hours') cutoff = new Date(now - 24 * 60 * 60 * 1000);
      else if (dateFilter === 'Last 7 Days') cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
      else if (dateFilter === 'Last 30 Days') cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
      if (cutoff) {
        result = result.filter(log => new Date(log.timestamp) >= cutoff);
      }
    }

    return result;
  }, [logs, searchTerm, agentFilter, dateFilter]);

  // ── Pagination ───────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, agentFilter, dateFilter]);

  // ── Row expand/collapse ──────────────────────────────────────────
  const toggleRow = useCallback((logId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }, []);

  // Unique agents for dropdown
  const uniqueAgents = useMemo(() => {
    const agents = new Set(logs.map(l => l.agent).filter(Boolean));
    return ['All Agents', ...Array.from(agents)];
  }, [logs]);

  const handleExport = () => {
    const csvContent = [
      'Timestamp,Vendor,Agent,Action,Result',
      ...filteredLogs.map(log => 
        `"${log.timestamp}","${log.vendor_name}","${log.agent}","${log.action}","${log.reason || 'Verified'}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-audit-trail-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-syne font-bold text-[#0f1f3d]">Chain-of-Custody Audit Trail</h2>
          <p className="text-sm text-slate-500 mt-1">Immutable record of every AI agent action and decision.</p>
        </div>
        <button 
          onClick={handleExport}
          className="nexus-btn-outline flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            ref={searchRef}
            type="text" 
            placeholder="Search by vendor, agent, or action... (⌘K)" 
            className="nexus-input pl-10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select 
            className="nexus-input pl-10 h-11 appearance-none"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option>All Time</option>
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>
        <div className="relative">
          <Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select 
            className="nexus-input pl-10 h-11 appearance-none"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            {uniqueAgents.map(a => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats + Pagination Info */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-slate-400">
          Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length} entries
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="nexus-btn-outline py-1 px-2.5 text-xs disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <span className="text-xs font-mono text-slate-500 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="nexus-btn-outline py-1 px-2.5 text-xs disabled:opacity-40"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="nexus-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="nexus-table w-full text-left border-collapse">
            <thead>
              <tr>
                <th style={{ width: '20px' }}></th>
                <th>Timestamp</th>
                <th>Vendor</th>
                <th>Agent</th>
                <th>Action</th>
                <th>Result</th>
                <th>Ref ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading audit trail...</td></tr>
              ) : paginatedLogs.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">No logs found matching your filters.</td></tr>
              ) : (
                paginatedLogs.map((log, i) => {
                  const logId = log._id || `${i}`;
                  const isNew = newLogIds.has(logId);
                  const isExpanded = expandedRows.has(logId);
                  const pillStyle = AGENT_PILL_STYLES[log.agent] || { bg: '#f1f5f9', color: '#64748b' };
                  
                  return (
                    <>
                      <tr 
                        key={logId} 
                        className={`cursor-pointer ${isNew ? 'animate-slide-in-top' : ''}`}
                        onClick={() => toggleRow(logId)}
                      >
                        <td className="px-2">
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </td>
                        <td className="font-mono text-slate-500 text-xs whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="font-bold text-[#0f1f3d]">{log.vendor_name}</td>
                        <td>
                          <span 
                            className="agent-pill"
                            style={{ backgroundColor: pillStyle.bg, color: pillStyle.color }}
                          >
                            {log.agent}
                          </span>
                        </td>
                        <td className="text-slate-700">{log.action}</td>
                        <td>
                          {log.reason ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                              <AlertTriangle className="w-3 h-3" /> {log.reason}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle className="w-3 h-3" /> OK
                            </span>
                          )}
                        </td>
                        <td className="text-xs font-mono text-slate-400">
                          #{(log.vendor_id || '').slice(0, 8).toUpperCase()}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${logId}-details`} className="animate-expand-row">
                          <td colSpan="7" className="bg-slate-50/80 px-8 py-4 border-l-4 border-blue-400">
                            <div className="text-xs font-mono">
                              <p className="font-bold text-slate-600 mb-2">Full Entry Details</p>
                              <pre className="bg-white rounded-lg p-4 border border-slate-200 text-slate-700 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify({
  timestamp: log.timestamp,
  vendor_id: log.vendor_id,
  vendor_name: log.vendor_name,
  agent: log.agent,
  action: log.action,
  reason: log.reason || null,
  details: log.details || null,
}, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Pagination */}
      {filteredLogs.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="nexus-btn-outline py-1.5 px-3 text-xs disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    page === currentPage
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="nexus-btn-outline py-1.5 px-3 text-xs disabled:opacity-40"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
