import { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  connectionType: string;
  isSlowConnection: boolean;
  memoryUsage?: number;
  effectiveType?: string;
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
    addEventListener?: (type: string, listener: EventListener) => void;
    removeEventListener?: (type: string, listener: EventListener) => void;
  };
}

export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    connectionType: 'unknown',
    isSlowConnection: false,
  });
  
  const [isSlowDevice, setIsSlowDevice] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  // Detect connection type and quality
  const getConnectionInfo = useCallback(() => {
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      const isSlowConnection = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
      
      return {
        connectionType: effectiveType,
        isSlowConnection,
        effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    
    return {
      connectionType: 'unknown',
      isSlowConnection: false,
      effectiveType: 'unknown',
    };
  }, []);

  // Measure page load performance
  const measureLoadPerformance = useCallback(() => {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      const renderTime = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      
      return { loadTime, renderTime };
    }
    
    return { loadTime: 0, renderTime: 0 };
  }, []);

  // Measure memory usage (Chrome only)
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }, []);

  // Detect slow device based on hardware concurrency and performance
  const detectSlowDevice = useCallback(() => {
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const isLowMemoryDevice = 'deviceMemory' in navigator && (navigator as any).deviceMemory <= 2;
    
    // Consider device slow if it has few CPU cores or low memory
    return hardwareConcurrency <= 2 || isLowMemoryDevice;
  }, []);

  // Check for reduced motion preference
  const checkReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Measure component render time
  const measureRenderTime = useCallback((componentName: string, renderFn: () => void) => {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Log slow renders (>16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`[Performance] Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
    
    return renderTime;
  }, []);

  // Create performance observer for long tasks
  const observeLongTasks = useCallback(() => {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`);
            }
          });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
        return observer;
      } catch (error) {
        console.warn('[Performance] Long task observer not supported');
      }
    }
    return null;
  }, []);

  // Monitor Core Web Vitals
  const measureWebVitals = useCallback(() => {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          const lcp = lastEntry.startTime;
          
          if (lcp > 2500) {
            console.warn(`[Performance] Poor LCP: ${lcp.toFixed(2)}ms`);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('[Performance] LCP observer not supported');
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const fidEntry = entry as any; // FID entries have processingStart property
            const fid = fidEntry.processingStart - entry.startTime;
            if (fid > 100) {
              console.warn(`[Performance] Poor FID: ${fid.toFixed(2)}ms`);
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('[Performance] FID observer not supported');
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          
          if (clsValue > 0.1) {
            console.warn(`[Performance] Poor CLS: ${clsValue.toFixed(3)}`);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('[Performance] CLS observer not supported');
      }
    }
  }, []);

  // Get optimization recommendations
  const getOptimizationRecommendations = useCallback(() => {
    const recommendations = [];
    
    if (metrics.isSlowConnection) {
      recommendations.push('Enable data-saver mode');
      recommendations.push('Reduce image quality');
      recommendations.push('Disable auto-play media');
    }
    
    if (isSlowDevice) {
      recommendations.push('Reduce animations');
      recommendations.push('Enable virtualization for lists');
      recommendations.push('Lazy load non-critical components');
    }
    
    if (shouldReduceMotion) {
      recommendations.push('Disable transitions and animations');
    }
    
    if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Clear cached data');
      recommendations.push('Reduce component complexity');
    }
    
    return recommendations;
  }, [metrics, isSlowDevice, shouldReduceMotion]);

  // Initialize performance monitoring
  useEffect(() => {
    console.log('[Performance] Initializing performance monitoring...');
    
    // Measure initial metrics
    const connectionInfo = getConnectionInfo();
    const loadMetrics = measureLoadPerformance();
    const memoryInfo = measureMemoryUsage();
    
    setMetrics(prev => ({
      ...prev,
      ...connectionInfo,
      ...loadMetrics,
      memoryUsage: memoryInfo?.used || 0,
    }));
    
    // Detect device capabilities
    setIsSlowDevice(detectSlowDevice());
    setShouldReduceMotion(checkReducedMotion());
    
    // Start monitoring
    const longTaskObserver = observeLongTasks();
    measureWebVitals();
    
    // Listen for connection changes
    const handleConnectionChange = () => {
      const newConnectionInfo = getConnectionInfo();
      setMetrics(prev => ({ ...prev, ...newConnectionInfo }));
    };
    
    const nav = navigator as NavigatorWithConnection;
    if (nav.connection) {
      nav.connection.addEventListener?.('change', handleConnectionChange);
    }
    
    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(e.matches);
    };
    mediaQuery.addListener(handleMotionChange);
    
    return () => {
      longTaskObserver?.disconnect();
      if (nav.connection) {
        nav.connection.removeEventListener?.('change', handleConnectionChange);
      }
      mediaQuery.removeListener(handleMotionChange);
    };
  }, [getConnectionInfo, measureLoadPerformance, measureMemoryUsage, detectSlowDevice, checkReducedMotion, observeLongTasks, measureWebVitals]);

  return {
    metrics,
    isSlowDevice,
    shouldReduceMotion,
    measureRenderTime,
    getOptimizationRecommendations,
  };
}; 