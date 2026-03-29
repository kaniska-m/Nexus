// ============================================================================
// Nexus — RealtimeProvider
// Context for Supabase Realtime: connection status, vendor/audit subscriptions.
// ============================================================================

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import supabase from '../lib/supabase/client';

const RealtimeContext = createContext({
  connectionStatus: 'disconnected',
  subscribeToVendors: () => () => {},
  subscribeToAuditLogs: () => () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export default function RealtimeProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const channelsRef = useRef(new Map());

  // Monitor connection status
  useEffect(() => {
    // Try to establish realtime connection
    const channel = supabase.channel('connection-monitor');
    
    channel
      .on('system', {}, (payload) => {
        if (payload.extension === 'realtime' && payload.status === 'ok') {
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
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subscribeToVendors = useCallback((callback) => {
    const channelName = 'vendors-realtime';
    
    // Remove existing channel if any
    if (channelsRef.current.has(channelName)) {
      supabase.removeChannel(channelsRef.current.get(channelName));
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vendors' },
        (payload) => {
          callback(payload.new, payload.old);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vendors' },
        (payload) => {
          callback(payload.new, null);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        else if (status === 'CHANNEL_ERROR') setConnectionStatus('disconnected');
      });

    channelsRef.current.set(channelName, channel);

    return () => {
      supabase.removeChannel(channel);
      channelsRef.current.delete(channelName);
    };
  }, []);

  const subscribeToAuditLogs = useCallback((vendorId, callback) => {
    const channelName = `audit-logs-${vendorId || 'all'}`;
    
    if (channelsRef.current.has(channelName)) {
      supabase.removeChannel(channelsRef.current.get(channelName));
    }

    const filter = vendorId
      ? { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `vendor_id=eq.${vendorId}` }
      : { event: 'INSERT', schema: 'public', table: 'audit_logs' };

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', filter, (payload) => {
        callback(payload.new);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        else if (status === 'CHANNEL_ERROR') setConnectionStatus('disconnected');
      });

    channelsRef.current.set(channelName, channel);

    return () => {
      supabase.removeChannel(channel);
      channelsRef.current.delete(channelName);
    };
  }, []);

  const subscribeToMonitoringSignals = useCallback((callback) => {
    const channelName = 'monitoring-signals';
    
    if (channelsRef.current.has(channelName)) {
      supabase.removeChannel(channelsRef.current.get(channelName));
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'monitoring_signals' },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
      });

    channelsRef.current.set(channelName, channel);

    return () => {
      supabase.removeChannel(channel);
      channelsRef.current.delete(channelName);
    };
  }, []);

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
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
