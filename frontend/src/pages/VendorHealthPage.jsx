// ============================================================================
// Nexus — Vendor Health Page (Realtime)
// Supabase Realtime monitoring_signals + shake animation for red rows.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, Activity, Users, ChevronRight, AlertTriangle, RefreshCw, Play, Loader2 } from 'lucide-react';
import { getHealthDashboard, monitorVendor } from '../api/nexusApi';
import { useRealtime } from '../components/RealtimeProvider';
import HealthScoreBadge from '../components/HealthScoreBadge';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import VendorHealthDrawer from '../components/VendorHealthDrawer';

export default function VendorHealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDrawerVendor, setSelectedDrawerVendor] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);
  const [vendorCheckState, setVendorCheckState] = useState({}); // { vendorId: 'idle' | 'running' | 'done' }
  const [shakeRows, setShakeRows] = useState(new Set());

  const { subscribeToMonitoringSignals } = useRealtime();
  const shakeIntervalRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getHealthDashboard();
      setHealthData(res.data || res);
    } catch (err) {
      setHealthData({ summary: { total: 0, green: 0, amber: 0, red: 0 }, vendors: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const vendors = healthData?.vendors || [];
  
  const normalizeStatus = (s) => (s || '').toLowerCase();

  const greenCount = vendors.filter(v => normalizeStatus(v.health_status) === 'green').length;
  const amberCount = vendors.filter(v => normalizeStatus(v.health_status) === 'amber').length;
  const redCount = vendors.filter(v => normalizeStatus(v.health_status) === 'red').length;

  // Subscribe to realtime monitoring_signals
  useEffect(() => {
    const unsub = subscribeToMonitoringSignals((newSignal) => {
      // Update vendor health data in place when new signal arrives
      setHealthData(prev => {
        if (!prev) return prev;
        const updatedVendors = (prev.vendors || []).map(v => {
          if (v.vendor_id === newSignal.vendor_id) {
            return {
              ...v,
              health_status: newSignal.health_status || v.health_status,
              risk_score: newSignal.risk_score || v.risk_score,
              last_monitored: newSignal.created_at || new Date().toISOString(),
            };
          }
          return v;
        });
        return { ...prev, vendors: updatedVendors };
      });
    });

    return unsub;
  }, [subscribeToMonitoringSignals]);

  // Auto-refresh timer
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          fetchData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progressDeg = ((60 - timeLeft) / 60) * 360;

  // Run health check for all vendors
  const handleRunAllHealthChecks = useCallback(async () => {
    setHealthCheckRunning(true);
    
    // Initialize states
    const initialState = {};
    vendors.forEach(v => { initialState[v.vendor_id] = 'idle'; });
    setVendorCheckState(initialState);

    for (const vendor of vendors) {
      if (!vendor.vendor_id) continue;
      
      setVendorCheckState(prev => ({ ...prev, [vendor.vendor_id]: 'running' }));
      
      try {
        await monitorVendor(vendor.vendor_id);
        setVendorCheckState(prev => ({ ...prev, [vendor.vendor_id]: 'done' }));
      } catch (err) {
        console.warn(`Health check failed for ${vendor.vendor_name}:`, err);
        setVendorCheckState(prev => ({ ...prev, [vendor.vendor_id]: 'error' }));
      }
      
      // Small delay between checks  
      await new Promise(r => setTimeout(r, 300));
    }
    
    // Refresh data after all checks
    await fetchData();
    setHealthCheckRunning(false);
    setVendorCheckState({});
  }, [vendors]);

  // Mock trend data for sparkline
  const generateTrendData = (score) => {
     let base = typeof score === 'number' ? score : 75;
     return Array.from({length: 10}).map((_, i) => ({
       value: Math.max(0, Math.min(100, base + (Math.random() * 20 - 10)))
     }));
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in relative">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-syne font-bold text-[#0f1f3d]">Continuous Monitoring</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time risk scoring and alert generation for active vendors.</p>
        </div>
        <div className="flex items-center gap-4">
          
          <div className="flex items-center gap-2 mr-2">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Auto-refresh {timeLeft}s</span>
            <div className="w-4 h-4 rounded-full relative bg-slate-200 flex items-center justify-center">
              <div 
                className="absolute inset-[0px] rounded-full transition-all duration-1000 linear" 
                style={{ background: `conic-gradient(#0d9488 ${progressDeg}deg, transparent ${progressDeg}deg)` }}
              />
              <div className="absolute inset-[2px] bg-[#f8fafc] rounded-full" />
            </div>
          </div>

          <button 
            onClick={handleRunAllHealthChecks} 
            disabled={healthCheckRunning}
            className={`nexus-btn-teal text-sm py-2 flex items-center gap-2 ${healthCheckRunning ? 'animate-scan cursor-not-allowed opacity-80' : ''}`}
          >
             <Play className="w-4 h-4" /> Run Health Check All
          </button>
          <button onClick={() => { fetchData(); setTimeLeft(60); }} className="nexus-btn-outline text-sm py-2 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="nexus-card p-5 flex items-center gap-4 nexus-card-hover">
           <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
             <Users className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-medium">Healthy</p>
             <p className="text-2xl font-syne font-bold text-emerald-600 tabular-nums animate-count">{greenCount}</p>
           </div>
        </div>
        <div className="nexus-card p-5 flex items-center gap-4 nexus-card-hover">
           <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
             <AlertTriangle className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-medium">Needs Attention</p>
             <p className="text-2xl font-syne font-bold text-amber-600 tabular-nums animate-count">{amberCount}</p>
           </div>
        </div>
        <div className="nexus-card p-5 flex items-center gap-4 nexus-card-hover">
           <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
             <ShieldAlert className="w-6 h-6" />
           </div>
           <div>
             <p className="text-sm text-slate-500 font-medium">Critical Alerts</p>
             <p className="text-2xl font-syne font-bold text-red-600 tabular-nums animate-count">{redCount}</p>
           </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="nexus-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="nexus-table w-full text-left border-collapse">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Industry</th>
                <th className="text-center">Health</th>
                <th>30-Day Trend</th>
                <th>Active Alerts</th>
                <th>Last Scan</th>
                <th className="text-center">Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-400">Loading monitoring data...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-400">No vendors currently being monitored.</td></tr>
              ) : (
                vendors.map((v, i) => {
                  const status = normalizeStatus(v.health_status);
                  const isRed = status === 'red';
                  const checkState = vendorCheckState[v.vendor_id];
                  
                  return (
                    <tr 
                      key={v.vendor_id || i} 
                      className={`group ${isRed ? 'bg-red-50/30 animate-shake' : ''}`}
                      style={isRed ? { animationDelay: `${i * 0.3}s`, animationIterationCount: 'infinite', animationDuration: '5s' } : {}}
                    >
                      <td className="font-semibold text-[#0f1f3d]">{v.vendor_name}</td>
                      <td className="text-slate-600">{v.industry}</td>
                      <td>
                         <div className="flex justify-center">
                           <HealthScoreBadge score={({Low: 92, low: 92, Medium: 65, medium: 65, High: 28, high: 28}[v.risk_score]) || 75} status={status} />
                         </div>
                      </td>
                      <td className="w-32">
                         <div className="h-8 w-full">
                           <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={generateTrendData(v.risk_score || 85)}>
                               <YAxis domain={[0, 100]} hide />
                               <Line 
                                 type="monotone" 
                                 dataKey="value" 
                                 stroke={status === 'red' ? '#dc2626' : status === 'amber' ? '#d97706' : '#0d9488'} 
                                 strokeWidth={2} 
                                 dot={false} 
                                 isAnimationActive={false} 
                               />
                             </LineChart>
                           </ResponsiveContainer>
                         </div>
                      </td>
                      <td>
                        {status === 'red' ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium border border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Critical
                          </span>
                        ) : status === 'amber' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Warning
                          </span>
                        ) : (
                           <span className="text-sm text-slate-400">None</span>
                        )}
                      </td>
                      <td className="text-sm text-slate-500 font-mono">
                        {v.last_monitored ? new Date(v.last_monitored).toLocaleString() : 'Just now'}
                      </td>
                      <td className="text-center">
                        {checkState === 'running' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking
                          </span>
                        ) : checkState === 'done' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            ✓ Done
                          </span>
                        ) : checkState === 'error' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                            ✗ Error
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button 
                          onClick={() => { setSelectedDrawerVendor(v); setIsDrawerOpen(true); }}
                          className="inline-flex items-center gap-1 text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors"
                        >
                          Details <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
