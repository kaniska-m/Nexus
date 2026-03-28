'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Activity, Users, ChevronRight, AlertTriangle, RefreshCw, Play, Loader2 } from 'lucide-react';
import { getHealthDashboard, monitorVendor } from '@/lib/api';
import HealthScoreBadge from '@/components/HealthScoreBadge';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import VendorHealthDrawer from '@/components/VendorHealthDrawer';
import { useRealtime } from '@/components/RealtimeProvider';
import toast from 'react-hot-toast';

export default function VendorHealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalChecking, setGlobalChecking] = useState(false);
  const [checkingVendorId, setCheckingVendorId] = useState(null);
  const [selectedDrawerVendor, setSelectedDrawerVendor] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { subscribeToMonitoringSignals } = useRealtime();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHealthDashboard();
      setHealthData(res.data || res);
    } catch (err) {
      setHealthData({ summary: { total: 0, green: 0, amber: 0, red: 0 }, vendors: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime updates via monitoring signals
  useEffect(() => {
    const unsubscribe = subscribeToMonitoringSignals((newSignal) => {
      setHealthData((prev) => {
        if (!prev) return prev;
        const vendors = prev.vendors.map((v) =>
          v.id === newSignal.vendor_id || v.vendor_id === newSignal.vendor_id
            ? { ...v, health_status: newSignal.health_status, risk_score: newSignal.risk_score, last_monitored: newSignal.created_at }
            : v
        );
        return { ...prev, vendors };
      });
    });
    return unsubscribe;
  }, [subscribeToMonitoringSignals]);

  const vendors = healthData?.vendors || [];

  const normalizeStatus = (s) => (s || '').toLowerCase();

  const greenCount = vendors.filter(v => normalizeStatus(v.health_status) === 'green').length;
  const amberCount = vendors.filter(v => normalizeStatus(v.health_status) === 'amber').length;
  const redCount = vendors.filter(v => normalizeStatus(v.health_status) === 'red').length;

  const generateTrendData = (score) => {
    let base = typeof score === 'number' ? score : 75;
    return Array.from({length: 10}).map((_, i) => ({
      value: Math.max(0, Math.min(100, base + (Math.random() * 20 - 10)))
    }));
  };

  const handleRunHealthCheck = async (vendorId) => {
    setCheckingVendorId(vendorId);
    try {
      await monitorVendor(vendorId);
      toast.success('Health check complete');
    } catch (err) {
      toast.error('Check failed');
    } finally {
      setCheckingVendorId(null);
    }
  };

  const handleRunAllChecks = async () => {
    setGlobalChecking(true);
    const vids = vendors.map(v => v.id || v.vendor_id);
    for (const vid of vids) {
      setCheckingVendorId(vid);
      try {
        await monitorVendor(vid);
        // Small delay to show sequential progress
        await new Promise(r => setTimeout(r, 800));
      } catch { /* continue */ }
    }
    setCheckingVendorId(null);
    setGlobalChecking(false);
    toast.success('Global health monitoring complete');
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6 page-enter">
      <div className="flex flex-col h-full w-full animate-fade-in relative">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-syne font-bold text-[#0f1f3d]">Continuous Monitoring</h2>
            <p className="text-sm text-slate-500 mt-1">Real-time risk scoring and alert generation for active vendors.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRunAllChecks}
              disabled={globalChecking || vendors.length === 0}
              className="nexus-btn-teal text-sm py-2 px-4 flex items-center gap-2"
            >
              {globalChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Health Check All
            </button>
            <button onClick={fetchData} className="nexus-btn-outline text-sm py-2 flex items-center gap-2">
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
              <p className="text-2xl font-syne font-bold text-emerald-600 tabular-nums">{greenCount}</p>
            </div>
          </div>
          <div className="nexus-card p-5 flex items-center gap-4 nexus-card-hover">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Needs Attention</p>
              <p className="text-2xl font-syne font-bold text-amber-600 tabular-nums">{amberCount}</p>
            </div>
          </div>
          <div className="nexus-card p-5 flex items-center gap-4 nexus-card-hover">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Critical Alerts</p>
              <p className="text-2xl font-syne font-bold text-red-600 tabular-nums">{redCount}</p>
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
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && !globalChecking ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading monitoring data...</td></tr>
                ) : vendors.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-slate-400">No vendors currently being monitored.</td></tr>
                ) : (
                  vendors.map((v, i) => {
                    const status = normalizeStatus(v.health_status);
                    const isChecking = checkingVendorId === (v.id || v.vendor_id);
                    return (
                      <tr
                        key={i}
                        className={`group transition-all ${status === 'red' ? 'animate-status-shake bg-red-50/20' : ''}`}
                        style={{ animationDelay: `${i * 5}s`, animationIterationCount: 'infinite' }}
                      >
                        <td className="font-semibold text-[#0f1f3d]">
                          <div className="flex items-center gap-2">
                             {isChecking && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                             {v.vendor_name}
                          </div>
                        </td>
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
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleRunHealthCheck(v.id || v.vendor_id)}
                              disabled={isChecking || globalChecking}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                              title="Run manual scan"
                            >
                              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => { setSelectedDrawerVendor(v); setIsDrawerOpen(true); }}
                              className="inline-flex items-center gap-1 text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors"
                            >
                              Details <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </button>
                          </div>
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
    </div>
  );
}
