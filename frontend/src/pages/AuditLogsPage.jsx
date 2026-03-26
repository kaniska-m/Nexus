import { useState, useEffect, useMemo } from 'react';
import { Search, Download, Filter, Calendar, FileText, Bot, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { listVendors } from '../api/nexusApi';

const AGENT_COLORS = {
  Orchestrator: 'bg-[#0f1f3d] text-white',
  Collector: 'bg-blue-600 text-white',
  Verifier: 'bg-teal-600 text-white',
  'Risk Scorer': 'bg-amber-500 text-white',
  'Audit Agent': 'bg-purple-600 text-white',
  Monitor: 'bg-emerald-600 text-white',
  'Supplier Portal': 'bg-slate-600 text-white',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('All Agents');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await listVendors();
        const data = res.data || res;
        // Handle both {vendors: [...]} and flat array
        const vendorList = Array.isArray(data) ? data : (data?.vendors || []);
        // Flatten all audit logs from all vendors into one list
        const allLogs = vendorList.flatMap(v => (v.audit_log || []).map(log => ({
          ...log,
          vendor_name: v.vendor_name,
          vendor_id: v.vendor_id
        })));
        // Sort by timestamp desc
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

  // Apply all filters
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        (log.vendor_name || '').toLowerCase().includes(term) ||
        (log.agent || '').toLowerCase().includes(term) ||
        (log.action || '').toLowerCase().includes(term)
      );
    }

    // Agent filter
    if (agentFilter !== 'All Agents') {
      result = result.filter(log => log.agent === agentFilter);
    }

    // Date filter
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

  // Unique agents for dropdown
  const uniqueAgents = useMemo(() => {
    const agents = new Set(logs.map(l => l.agent).filter(Boolean));
    return ['All Agents', ...Array.from(agents)];
  }, [logs]);

  const handleExport = () => {
    // Create a simple CSV export
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
            type="text" 
            placeholder="Search by vendor, agent, or action..." 
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

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-xs font-mono text-slate-400">
          Showing {filteredLogs.length} of {logs.length} entries
        </span>
      </div>

      {/* Logs Table */}
      <div className="nexus-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="nexus-table w-full text-left border-collapse">
            <thead>
              <tr>
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
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading audit trail...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No logs found matching your filters.</td></tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <tr key={i}>
                    <td className="font-mono text-slate-500 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="font-bold text-[#0f1f3d]">{log.vendor_name}</td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                        AGENT_COLORS[log.agent] || 'bg-slate-500 text-white'
                      }`}>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
