import { useState, useEffect } from 'react';
import { Search, Download, Filter, Calendar, FileText, Bot } from 'lucide-react';
import { listVendors } from '../api/nexusApi';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await listVendors();
        const data = res.data || res;
        // Flatten all audit logs from all vendors into one list
        const allLogs = data.flatMap(v => (v.audit_log || []).map(log => ({
          ...log,
          vendor_name: v.vendor_name,
          vendor_id: v.vendor_id
        })));
        // Sort by timestamp desc
        const sorted = allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(sorted);
        setFilteredLogs(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  useEffect(() => {
    const filtered = logs.filter(log => 
      log.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLogs(filtered);
  }, [searchTerm, logs]);

  const handleExport = () => {
    alert('Exporting Audit Log as PDF...');
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-syne font-bold text-navy">Chain-of-Custody Audit Trail</h2>
          <p className="text-sm text-slate-500 mt-1">Immutable record of every AI agent action and decision.</p>
        </div>
        <button 
          onClick={handleExport}
          className="nexus-btn-outline flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export PDF Report
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
          <select className="nexus-input pl-10 h-11 appearance-none">
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>All Time</option>
          </select>
        </div>
        <div className="relative">
          <Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select className="nexus-input pl-10 h-11 appearance-none">
            <option>All Agents</option>
            <option>Orchestrator</option>
            <option>Collector</option>
            <option>Verifier</option>
            <option>Risk Scorer</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_12px_rgba(15,31,61,0.04)] flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agent</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ref ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading audit trail...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No logs found matching your filters.</td></tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-bold text-navy">{log.vendor_name}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter bg-slate-100 border border-slate-200 text-slate-600">
                        {log.agent}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-700">{log.action}</td>
                    <td className="p-4">
                      {log.reason ? (
                        <span className="text-xs text-amber-600 font-medium">Flagged: {log.reason}</span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Verified</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-400">
                      #{Math.random().toString(36).substring(2, 8).toUpperCase()}
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
