'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Download, Filter, Calendar, FileText, Bot, CheckCircle, AlertTriangle, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { listVendors } from '@/lib/api';
import { useRealtime } from '@/components/RealtimeProvider';

const AGENT_COLORS = {
  Orchestrator: 'bg-[#0f1f3d] text-white',
  Collector: 'bg-blue-600 text-white',
  Verifier: 'bg-teal-600 text-white',
  'Risk Scorer': 'bg-amber-500 text-white',
  'Audit Agent': 'bg-purple-600 text-white',
  Monitor: 'bg-green-600 text-white',
  'Supplier Portal': 'bg-slate-600 text-white',
};

const ITEMS_PER_PAGE = 25;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('All Agents');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const searchRef = useRef(null);
  const { subscribeToAuditLogs } = useRealtime();

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await listVendors();
        const data = res.data || res;
        const vendorList = Array.isArray(data) ? data : (data?.vendors || []);
        const allLogs = vendorList.flatMap((v) =>
          (v.audit_log || v.audit_logs || []).map((log, idx) => ({
            ...log,
            vendor_name: v.vendor_name,
            vendor_id: v.vendor_id || v.id,
            _id: `${v.vendor_id || v.id}-${idx}`,
          }))
        );
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

  // Keyboard shortcut Ctrl+K to search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Realtime updates for audit logs
  useEffect(() => {
    const unsubscribe = subscribeToAuditLogs(null, (newLog) => {
      setLogs((prev) => {
        const logWithMeta = { ...newLog, _id: `rt-${Date.now()}`, _isNew: true };
        return [logWithMeta, ...prev];
      });
    });
    return unsubscribe;
  }, [subscribeToAuditLogs]);

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

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const currentLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
    <div className="max-w-[1400px] mx-auto px-6 py-6 page-enter">
      <div className="flex flex-col h-full w-full animate-fade-in">
        <div className="relative mb-6 p-4 -ml-4 rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-teal-400/5 to-purple-500/5 blur-md animate-pulse -z-10 rounded-2xl" />
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-syne font-bold text-[#0f1f3d]">Chain-of-Custody Audit Trail</h2>
              <p className="text-sm text-slate-500 mt-1">Immutable record of every AI agent action and decision.</p>
            </div>
            <button onClick={handleExport} className="nexus-btn-outline flex items-center gap-2 text-sm bg-white">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search (Ctrl+K)..."
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
              {uniqueAgents.map(a => (<option key={a}>{a}</option>))}
            </select>
          </div>
        </div>

        {/* Pagination & Stats */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="text-xs font-mono text-slate-400">
            Showing {currentLogs.length} of {filteredLogs.length} entries (Page {currentPage}/{totalPages || 1})
          </span>
          <div className="flex gap-2">
             <button
               onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
               disabled={currentPage === 1}
               className="p-1 px-2 border border-slate-200 rounded text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
             >
               <ChevronLeft className="w-3 h-3" /> Prev
             </button>
             <button
               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
               disabled={currentPage === totalPages || totalPages === 0}
               className="p-1 px-2 border border-slate-200 rounded text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
             >
               Next <ChevronRight className="w-3 h-3" />
             </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="nexus-card flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="nexus-table w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="w-8"></th>
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
                ) : currentLogs.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400">No logs found matching your filters.</td></tr>
                ) : (
                  currentLogs.map((log, i) => {
                    const isExpanded = expandedId === log._id;
                    return (
                      <>
                        <tr
                          key={log._id || i}
                          onClick={() => setExpandedId(isExpanded ? null : log._id)}
                          className={`cursor-pointer group hover:bg-slate-50/50 transition-colors ${log._isNew ? 'animate-slide-in-top' : ''}`}
                        >
                          <td className="px-2">
                             {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                          </td>
                          <td className="font-mono text-slate-500 text-xs whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="font-bold text-[#0f1f3d]">{log.vendor_name || 'System'}</td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                              AGENT_COLORS[log.agent] || 'bg-slate-500 text-white'
                            }`}>
                              {log.agent}
                            </span>
                          </td>
                          <td className="text-slate-700 max-w-xs truncate" title={log.action}>{log.action}</td>
                          <td>
                            {log.reason ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <AlertTriangle className="w-3 h-3" /> Warning
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <CheckCircle className="w-3 h-3" /> OK
                              </span>
                            )}
                          </td>
                          <td className="text-xs font-mono text-slate-400">
                            #{(log.vendor_id || (log._id || '').split('-')[0] || '').slice(0, 8).toUpperCase()}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan="7" className="p-4 border-b border-slate-100 shadow-inner">
                               <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-blue-300 overflow-x-auto">
                                  <pre>{JSON.stringify({
                                    agent: log.agent,
                                    action: log.action,
                                    result: log.reason || 'Success',
                                    timestamp: log.timestamp,
                                    vendor: log.vendor_name,
                                    vendor_id: log.vendor_id
                                  }, null, 2)}</pre>
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
      </div>
    </div>
  );
}
