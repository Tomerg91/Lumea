import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TimerStatus,
  DurationAdjustmentData,
  startSessionTimer,
  stopSessionTimer,
  pauseSessionTimer,
  resumeSessionTimer,
  adjustSessionDuration,
  getSessionTimingData,
} from '../services/sessionService';

interface UseSessionTimerOptions {
  sessionId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  onTimerUpdate?: (timerData: TimerStatus) => void;
  onError?: (error: Error) => void;
}

interface UseSessionTimerReturn {
  timerData: TimerStatus | null;
  isLoading: boolean;
  error: string | null;
  
  // Timer controls
  startTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  adjustDuration: (adjustmentData: DurationAdjustmentData) => Promise<void>;
  
  // Utility functions
  refreshTimerData: () => Promise<void>;
  formatDuration: (seconds: number) => string;
  isTimerActive: boolean;
  canControlTimer: boolean;
}

export const useSessionTimer = ({
  sessionId,
  autoRefresh = true,
  refreshInterval = 1000, // 1 second
  onTimerUpdate,
  onError,
}: UseSessionTimerOptions): UseSessionTimerReturn => {
  const [timerData, setTimerData] = useState<TimerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for managing intervals and preventing memory leaks
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Format duration from seconds to MM:SS or HH:MM:SS format
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Fetch timer data from the server
  const refreshTimerData = useCallback(async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getSessionTimingData(sessionId);
      
      if (mountedRef.current) {
        setTimerData(data);
        onTimerUpdate?.(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch timer data';
      if (mountedRef.current) {
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sessionId, onTimerUpdate, onError]);

  // Timer control functions
  const startTimer = useCallback(async () => {
    try {
      setError(null);
      const data = await startSessionTimer(sessionId);
      if (mountedRef.current) {
        setTimerData(data);
        onTimerUpdate?.(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start timer';
      if (mountedRef.current) {
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      }
    }
  }, [sessionId, onTimerUpdate, onError]);

  const stopTimer = useCallback(async () => {
    try {
      setError(null);
      const data = await stopSessionTimer(sessionId);
      if (mountedRef.current) {
        setTimerData(data);
        onTimerUpdate?.(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop timer';
      if (mountedRef.current) {
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      }
    }
  }, [sessionId, onTimerUpdate, onError]);

  const pauseTimer = useCallback(async () => {
    try {
      setError(null);
      const data = await pauseSessionTimer(sessionId);
      if (mountedRef.current) {
        setTimerData(data);
        onTimerUpdate?.(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause timer';
      if (mountedRef.current) {
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      }
    }
  }, [sessionId, onTimerUpdate, onError]);

  const resumeTimer = useCallback(async () => {
    try {
      setError(null);
      const data = await resumeSessionTimer(sessionId);
      if (mountedRef.current) {
        setTimerData(data);
        onTimerUpdate?.(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume timer';
      if (mountedRef.current) {
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      }
    }
  }, [sessionId, onTimerUpdate, onError]);

  const adjustDuration = useCallback(async (adjustmentData: DurationAdjustmentData) => {
    try {
      setError(null);
      const data = await adjustSessionDuration(sessionId, adjustmentData);
      if (mountedRef.current) {
        setTimerData(data);
        onTimerUpdate?.(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to adjust duration';
      if (mountedRef.current) {
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      }
    }
  }, [sessionId, onTimerUpdate, onError]);

  // Computed properties
  const isTimerActive = timerData?.timerStatus === 'running' || timerData?.timerStatus === 'paused';
  const canControlTimer = timerData?.hasTimer !== false; // Can control if timer exists or can be created

  // Set up auto-refresh interval
  useEffect(() => {
    if (autoRefresh && isTimerActive) {
      refreshIntervalRef.current = setInterval(() => {
        refreshTimerData();
      }, refreshInterval);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, isTimerActive, refreshInterval, refreshTimerData]);

  // Initial data fetch
  useEffect(() => {
    refreshTimerData();
  }, [refreshTimerData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    timerData,
    isLoading,
    error,
    
    // Timer controls
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    adjustDuration,
    
    // Utility functions
    refreshTimerData,
    formatDuration,
    isTimerActive,
    canControlTimer,
  };
}; 