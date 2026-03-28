'use client';

import { FileText, Download } from 'lucide-react';

/**
 * AuditTrailViewer — Tabular view of every agent decision with timestamp.
 * For regulators and compliance officers reviewing the full decision trail.
 */
export default function AuditTrailViewer({ auditLog = [], vendorId }) {
  if (auditLog.length === 0) {
    return (
      <div className="nexus-card p-6">
        <h3 className="font-syne font-bold text-slate-800 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" />
          Audit Trail
        </h3>
        <p className="text-sm text-slate-400 text-center py-6">No audit entries recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="nexus-card overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-syne font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-500" />
          Audit Trail
          <span className="text-xs font-mono text-slate-400 font-normal ml-2">{auditLog.length} entries</span>
        </h3>
        {vendorId && (
          <button 
            onClick={() => window.open(`/api/vendor/${vendorId}/audit-pdf`, '_blank')}
            className="nexus-btn-outline text-xs py-1.5 px-3"
            title="Download PDF Audit Pack"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download PDF
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-white text-xs font-syne uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Timestamp</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.map((entry, i) => (
              <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                  {entry.timestamp ? entry.timestamp.slice(0, 19).replace('T', ' ') : ''}
                </td>
                <td className="px-4 py-2.5 font-semibold text-nexus-600 whitespace-nowrap">{entry.agent}</td>
                <td className="px-4 py-2.5 text-slate-700">{entry.action}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{entry.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
