import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  loadTime: number;
  apiCallDuration: number;
  memoryUsage?: number;
  cacheHitRate: number;
  errorCount: number;
}

interface PerformanceEntry {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: any;
}

interface UsePerformanceMonitorOptions {
  enableMemoryTracking?: boolean;
  enableDetailedTracking?: boolean;
  maxEntries?: number;
}

export function usePerformanceMonitor(
  componentName: string,
  options: UsePerformanceMonitorOptions = {}
) {
  const {
    enableMemoryTracking = true,
    enableDetailedTracking = false,
    maxEntries = 100
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    loadTime: 0,
    apiCallDuration: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    errorCount: 0
  });

  const [performanceEntries, setPerformanceEntries] = useState<PerformanceEntry[]>([]);
  const renderStartTime = useRef<number>(Date.now());
  const apiCallTimes = useRef<Map<string, number>>(new Map());
  const cacheStats = useRef({ hits: 0, misses: 0 });
  const errorCount = useRef(0);

  // Track component mount and render time
  useEffect(() => {
    const renderTime = Date.now() - renderStartTime.current;
    
    setMetrics(prev => ({
      ...prev,
      renderTime
    }));

    if (enableDetailedTracking) {
      addPerformanceEntry('component_render', renderTime, true);
    }

    // Mark performance
    if (performance.mark) {
      performance.mark(`${componentName}-render-complete`);
    }
  }, [componentName, enableDetailedTracking]);

  // Memory usage tracking
  useEffect(() => {
    if (!enableMemoryTracking || !(performance as any).memory) return;

    const updateMemoryUsage = () => {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage
      }));
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [enableMemoryTracking]);

  // Update cache hit rate
  useEffect(() => {
    const total = cacheStats.current.hits + cacheStats.current.misses;
    const hitRate = total > 0 ? (cacheStats.current.hits / total) * 100 : 0;
    
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: hitRate,
      errorCount: errorCount.current
    }));
  }, []);

  const addPerformanceEntry = useCallback((
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ) => {
    const entry: PerformanceEntry = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
      metadata
    };

    setPerformanceEntries(prev => {
      const newEntries = [...prev, entry];
      // Keep only the last maxEntries
      return newEntries.slice(-maxEntries);
    });
  }, [maxEntries]);

  // Track API call performance
  const trackApiCall = useCallback((endpoint: string) => {
    const startTime = Date.now();
    const callId = `${endpoint}-${startTime}`;
    apiCallTimes.current.set(callId, startTime);

    return {
      success: (responseTime?: number) => {
        const endTime = responseTime || Date.now();
        const duration = endTime - startTime;
        apiCallTimes.current.delete(callId);
        
        setMetrics(prev => ({
          ...prev,
          apiCallDuration: (prev.apiCallDuration + duration) / 2 // Running average
        }));

        if (enableDetailedTracking) {
          addPerformanceEntry(`api_call_${endpoint}`, duration, true);
        }
      },
      error: (error?: any) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        apiCallTimes.current.delete(callId);
        errorCount.current++;
        
        setMetrics(prev => ({
          ...prev,
          errorCount: errorCount.current,
          apiCallDuration: (prev.apiCallDuration + duration) / 2
        }));

        if (enableDetailedTracking) {
          addPerformanceEntry(`api_call_${endpoint}`, duration, false, { error });
        }
      }
    };
  }, [enableDetailedTracking, addPerformanceEntry]);

  // Track cache operations
  const trackCacheHit = useCallback(() => {
    cacheStats.current.hits++;
    updateCacheHitRate();
  }, []);

  const trackCacheMiss = useCallback(() => {
    cacheStats.current.misses++;
    updateCacheHitRate();
  }, []);

  const updateCacheHitRate = useCallback(() => {
    const total = cacheStats.current.hits + cacheStats.current.misses;
    const hitRate = total > 0 ? (cacheStats.current.hits / total) * 100 : 0;
    
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: hitRate
    }));
  }, []);

  // Track custom operation
  const trackOperation = useCallback((name: string, operation: () => Promise<any>) => {
    const startTime = Date.now();
    
    return operation()
      .then(result => {
        const duration = Date.now() - startTime;
        if (enableDetailedTracking) {
          addPerformanceEntry(name, duration, true);
        }
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        errorCount.current++;
        setMetrics(prev => ({ ...prev, errorCount: errorCount.current }));
        
        if (enableDetailedTracking) {
          addPerformanceEntry(name, duration, false, { error });
        }
        throw error;
      });
  }, [enableDetailedTracking, addPerformanceEntry]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const recentEntries = performanceEntries.slice(-20); // Last 20 entries
    const successRate = recentEntries.length > 0 
      ? (recentEntries.filter(e => e.success).length / recentEntries.length) * 100 
      : 100;

    const avgDuration = recentEntries.length > 0
      ? recentEntries.reduce((sum, e) => sum + e.duration, 0) / recentEntries.length
      : 0;

    return {
      ...metrics,
      successRate,
      avgOperationDuration: avgDuration,
      totalOperations: performanceEntries.length,
      recentOperations: recentEntries.length
    };
  }, [metrics, performanceEntries]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({
      renderTime: 0,
      loadTime: 0,
      apiCallDuration: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      errorCount: 0
    });
    setPerformanceEntries([]);
    cacheStats.current = { hits: 0, misses: 0 };
    errorCount.current = 0;
    renderStartTime.current = Date.now();
  }, []);

  // Log performance to console (development only)
  const logPerformance = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚀 Performance Metrics - ${componentName}`);
      console.table(getPerformanceSummary());
      if (enableDetailedTracking && performanceEntries.length > 0) {
        console.log('Recent Operations:', performanceEntries.slice(-10));
      }
      console.groupEnd();
    }
  }, [componentName, getPerformanceSummary, enableDetailedTracking, performanceEntries]);

  // Export metrics to external monitoring service
  const exportMetrics = useCallback(() => {
    const summary = getPerformanceSummary();
    
    // This could be sent to analytics service
    return {
      component: componentName,
      timestamp: Date.now(),
      metrics: summary,
      entries: enableDetailedTracking ? performanceEntries : []
    };
  }, [componentName, getPerformanceSummary, enableDetailedTracking, performanceEntries]);

  return {
    metrics,
    performanceEntries,
    trackApiCall,
    trackCacheHit,
    trackCacheMiss,
    trackOperation,
    getPerformanceSummary,
    resetMetrics,
    logPerformance,
    exportMetrics
  };
}

// Global performance tracker for critical metrics
class GlobalPerformanceTracker {
  private static instance: GlobalPerformanceTracker;
  private metrics: Map<string, PerformanceEntry[]> = new Map();
  private readonly MAX_ENTRIES_PER_COMPONENT = 50;

  static getInstance(): GlobalPerformanceTracker {
    if (!GlobalPerformanceTracker.instance) {
      GlobalPerformanceTracker.instance = new GlobalPerformanceTracker();
    }
    return GlobalPerformanceTracker.instance;
  }

  trackComponentPerformance(componentName: string, entry: PerformanceEntry) {
    const entries = this.metrics.get(componentName) || [];
    entries.push(entry);
    
    // Keep only recent entries
    if (entries.length > this.MAX_ENTRIES_PER_COMPONENT) {
      entries.splice(0, entries.length - this.MAX_ENTRIES_PER_COMPONENT);
    }
    
    this.metrics.set(componentName, entries);
  }

  getComponentMetrics(componentName: string): PerformanceEntry[] {
    return this.metrics.get(componentName) || [];
  }

  getAllMetrics(): Record<string, PerformanceEntry[]> {
    const result: Record<string, PerformanceEntry[]> = {};
    this.metrics.forEach((entries, componentName) => {
      result[componentName] = entries;
    });
    return result;
  }

  getPerformanceReport(): {
    totalComponents: number;
    totalOperations: number;
    avgSuccessRate: number;
    slowestOperations: Array<{ component: string; operation: string; duration: number; }>;
  } {
    let totalOperations = 0;
    let successfulOperations = 0;
    const allOperations: Array<{ component: string; operation: string; duration: number; success: boolean; }> = [];

    this.metrics.forEach((entries, componentName) => {
      entries.forEach(entry => {
        totalOperations++;
        if (entry.success) successfulOperations++;
        allOperations.push({
          component: componentName,
          operation: entry.operation,
          duration: entry.duration,
          success: entry.success
        });
      });
    });

    const avgSuccessRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 100;
    const slowestOperations = allOperations
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(({ component, operation, duration }) => ({ component, operation, duration }));

    return {
      totalComponents: this.metrics.size,
      totalOperations,
      avgSuccessRate,
      slowestOperations
    };
  }

  clear() {
    this.metrics.clear();
  }
}

export const globalPerformanceTracker = GlobalPerformanceTracker.getInstance();

// Hook to use global performance tracking
export function useGlobalPerformanceTracking(componentName: string) {
  const trackGlobal = useCallback((operation: string, duration: number, success: boolean) => {
    globalPerformanceTracker.trackComponentPerformance(componentName, {
      timestamp: Date.now(),
      operation,
      duration,
      success
    });
  }, [componentName]);

  return { trackGlobal };
} 