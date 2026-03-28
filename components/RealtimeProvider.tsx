'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const RealtimeContext = createContext({
  connectionStatus: 'disconnected' as string,
  subscribeToVendors: (_cb: any) => () => {},
  subscribeToAuditLogs: (_vendorId: any, _cb: any) => () => {},
  subscribeToMonitoringSignals: (_cb: any) => () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const supabaseRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;

    // Create a presence channel to track connection status
    const statusChannel = supabase.channel('realtime-status');
    statusChannel
      .on('system', {}, (payload) => {
        if (payload?.extension === 'postgres_changes') {
          setConnectionStatus('connected');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('reconnecting');
        } else {
          setConnectionStatus('reconnecting');
        }
      });

    channelRef.current = statusChannel;

    // Set connected after initial connection attempt
    const timer = setTimeout(() => {
      setConnectionStatus((prev) => prev === 'disconnected' ? 'connected' : prev);
    }, 2000);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(statusChannel);
    };
  }, []);

  const subscribeToVendors = useCallback((callback) => {
    const supabase = supabaseRef.current;
    if (!supabase) return () => {};

    const channel = supabase
      .channel('vendors-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vendors',
      }, (payload) => {
        callback(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subscribeToAuditLogs = useCallback((vendorId, callback) => {
    const supabase = supabaseRef.current;
    if (!supabase) return () => {};

    const filter = vendorId ? `vendor_id=eq.${vendorId}` : undefined;
    const channel = supabase
      .channel(`audit-logs-${vendorId || 'all'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs',
        ...(filter ? { filter } : {}),
      }, (payload) => {
        callback(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subscribeToMonitoringSignals = useCallback((callback) => {
    const supabase = supabaseRef.current;
    if (!supabase) return () => {};

    const channel = supabase
      .channel('monitoring-signals')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'monitoring_signals',
      }, (payload) => {
        callback(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{
      connectionStatus,
      subscribeToVendors,
      subscribeToAuditLogs,
      subscribeToMonitoringSignals,
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}
