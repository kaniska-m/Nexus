import { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Users, ChevronRight, AlertTriangle } from 'lucide-react';
import { getHealthDashboard } from '../api/nexusApi';
import HealthScoreBadge from '../components/HealthScoreBadge';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import VendorHealthDrawer from '../components/VendorHealthDrawer';

export default function VendorHealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDrawerVendor, setSelectedDrawerVendor] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res = await getHealthDashboard();
        setHealthData(res.data || res);
      } catch (err) {
        setHealthData({ summary: { total: 0, critical: 0, avg_score: 0 }, vendors: [] });
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const vendors = healthData?.vendors || [];
  
  // Create mock trend data for the sparkline
  const generateTrendData = (score) => {
     let base = score;
     return Array.from({length: 10}).map((_, i) => ({
       value: Math.max(0, Math.min(100, base + (Math.random() * 20 - 10)))
     }));
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in relative">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-syne font-bold text-navy">Continuous Monitoring</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time risk scoring and alert generation for active vendors.</p>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_2px_12px_rgba(15,31,61,0.04)] flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
             <Users className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-medium">Total Vendors Monitored</p>
             <p className="text-2xl font-syne font-bold text-navy">{vendors.length || '0'}</p>
           </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_2px_12px_rgba(15,31,61,0.04)] flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
             <ShieldAlert className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-medium">Critical Alerts</p>
             <p className="text-2xl font-syne font-bold text-red-600">
                {vendors.filter(v => v.health_status === 'red').length || '0'}
             </p>
           </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_2px_12px_rgba(15,31,61,0.04)] flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
             <Activity className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-medium">Avg Health Score</p>
              <p className="text-2xl font-syne font-bold text-teal-600">
                 {vendors.length > 0 
                   ? Math.round(vendors.reduce((acc, v) => acc + (Number(v.risk_score) || 0), 0) / vendors.length) 
                   : '0'}
              </p>
           </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_12px_rgba(15,31,61,0.04)] flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor Name</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Industry</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Health Score</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">30-Day Trend</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Alerts</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Scan</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading monitoring data...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">No vendors currently being monitored.</td></tr>
              ) : (
                vendors.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 font-semibold text-navy">{v.vendor_name}</td>
                    <td className="p-4 text-sm text-slate-600">{v.industry}</td>
                    <td className="p-4">
                       <div className="flex justify-center">
                         <HealthScoreBadge score={v.risk_score || 85} status={v.health_status} />
                       </div>
                    </td>
                    <td className="p-4 w-32">
                       <div className="h-8 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={generateTrendData(v.risk_score || 85)}>
                             <YAxis domain={[0, 100]} hide />
                             <Line 
                               type="monotone" 
                               dataKey="value" 
                               stroke={v.health_status === 'red' ? '#dc2626' : v.health_status === 'amber' ? '#d97706' : '#0d9488'} 
                               strokeWidth={2} 
                               dot={false} 
                               isAnimationActive={false} 
                             />
                           </LineChart>
                         </ResponsiveContainer>
                       </div>
                    </td>
                    <td className="p-4">
                      {v.health_status === 'red' ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          2 High
                        </span>
                      ) : v.health_status === 'amber' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          1 Med
                        </span>
                      ) : (
                         <span className="text-sm text-slate-400">None</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-500 font-mono">
                      {v.last_monitored ? new Date(v.last_monitored).toLocaleString() : 'Just now'}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { setSelectedDrawerVendor(v); setIsDrawerOpen(true); }}
                        className="inline-flex items-center gap-1 text-accent font-medium text-sm hover:text-blue-700 transition-colors"
                      >
                        View Details <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VendorHealthDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        vendor={selectedDrawerVendor} 
      />
    </div>
  );
}
