import { useEffect, useRef, useCallback } from 'react';
import { realtimeService, RealtimeEvent, EventHandler } from '../services/realtimeService';

// Hook for subscribing to notifications
export function useRealtimeNotifications(handler: EventHandler<any>) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to notifications
    unsubscribeRef.current = realtimeService.subscribeToNotifications(handler);

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [handler]);

  return {
    isConnected: realtimeService.getConnectionStatus(),
    activeChannels: realtimeService.getActiveChannels()
  };
}

// Hook for subscribing to session updates
export function useRealtimeSessions(handler: EventHandler<any>) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to sessions
    unsubscribeRef.current = realtimeService.subscribeToSessions(handler);

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [handler]);

  return {
    isConnected: realtimeService.getConnectionStatus(),
    activeChannels: realtimeService.getActiveChannels()
  };
}

// Hook for subscribing to reflections
export function useRealtimeReflections(handler: EventHandler<any>) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to reflections
    unsubscribeRef.current = realtimeService.subscribeToReflections(handler);

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [handler]);

  return {
    isConnected: realtimeService.getConnectionStatus(),
    activeChannels: realtimeService.getActiveChannels()
  };
}

// Hook for subscribing to coach notes (for coaches)
export function useRealtimeCoachNotes(handler: EventHandler<any>) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to coach notes
    unsubscribeRef.current = realtimeService.subscribeToCoachNotes(handler);

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [handler]);

  return {
    isConnected: realtimeService.getConnectionStatus(),
    activeChannels: realtimeService.getActiveChannels()
  };
}

// Hook for subscribing to shared coach notes (for clients)
export function useRealtimeSharedCoachNotes(handler: EventHandler<any>) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to shared coach notes
    unsubscribeRef.current = realtimeService.subscribeToSharedCoachNotes(handler);

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [handler]);

  return {
    isConnected: realtimeService.getConnectionStatus(),
    activeChannels: realtimeService.getActiveChannels()
  };
}

// Generic hook for subscribing to any table
export function useRealtimeTable<T>(
  tableName: string,
  filter: string | null,
  handler: EventHandler<T>,
  channelSuffix?: string
) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to table
    unsubscribeRef.current = realtimeService.subscribeToTable(
      tableName,
      filter,
      handler,
      channelSuffix
    );

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [tableName, filter, handler, channelSuffix]);

  return {
    isConnected: realtimeService.getConnectionStatus(),
    activeChannels: realtimeService.getActiveChannels()
  };
}

// Hook for getting real-time service status
export function useRealtimeStatus() {
  const getStatus = useCallback(() => ({
    isConnected: realtimeService.getConnectionStatus(),
    activeSubscriptions: realtimeService.getActiveSubscriptionsCount(),
    activeChannels: realtimeService.getActiveChannels()
  }), []);

  return getStatus();
}

// Hook for managing real-time connection
export function useRealtimeConnection() {
  const disconnect = useCallback(() => {
    realtimeService.forceDisconnect();
  }, []);

  return {
    disconnect,
    status: useRealtimeStatus()
  };
} 