/**
 * Client-side performance monitoring utility
 * Captures key metrics and optionally sends them to the server
 */

// Types for performance metrics
export interface PerformanceMetrics {
  // Page load metrics
  navigationStart?: number;
  loadTime?: number;
  domContentLoaded?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  
  // Runtime metrics
  memoryUsage?: {
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
  };
  
  // Custom timing marks
  marks?: Record<string, number>;
  
  // Custom measurements
  measures?: Record<string, number>;
  
  // Additional context
  url?: string;
  userAgent?: string;
  timestamp?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

/**
 * Create a mark in the performance timeline
 * 
 * @param name Name of the mark
 */
export function mark(name: string): void {
  try {
    performance.mark(name);
  } catch (err) {
    console.error('Error creating performance mark:', err);
  }
}

/**
 * Create a measure between two marks
 * 
 * @param name Name of the measure
 * @param startMark Start mark name
 * @param endMark End mark name
 * @returns Duration of the measure in milliseconds
 */
export function measure(name: string, startMark: string, endMark: string): number | undefined {
  try {
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name, 'measure');
    return entries.length > 0 ? entries[0].duration : undefined;
  } catch (err) {
    console.error('Error creating performance measure:', err);
    return undefined;
  }
}

/**
 * Clear performance marks and measures
 * 
 * @param markName Optional specific mark to clear
 */
export function clearMarks(markName?: string): void {
  try {
    if (markName) {
      performance.clearMarks(markName);
    } else {
      performance.clearMarks();
    }
  } catch (err) {
    console.error('Error clearing performance marks:', err);
  }
}

/**
 * Collect core web vital metrics
 * Based on the Web Vitals library patterns
 */
export function collectWebVitals(): Partial<PerformanceMetrics> {
  const metrics: Partial<PerformanceMetrics> = {
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  // Basic navigation timing
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    
    metrics.navigationStart = timing.navigationStart;
    metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
    metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
  }

  // Modern performance API
  if (window.performance && window.performance.getEntriesByType) {
    // Paint metrics
    const paintEntries = performance.getEntriesByType('paint');
    for (const entry of paintEntries) {
      if (entry.name === 'first-paint') {
        metrics.firstContentfulPaint = entry.startTime;
      }
    }
    
    // Navigation metrics
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
      metrics.loadTime = navEntry.loadEventEnd - navEntry.startTime;
      metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.startTime;
    }
  }

  // Memory usage (Chrome only)
  const memory = (performance as any).memory;
  if (memory) {
    metrics.memoryUsage = {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
    };
  }

  // Connection info (if available)
  const connection = (navigator as any).connection;
  if (connection) {
    metrics.connection = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    };
  }

  // Custom marks and measures
  const marks: Record<string, number> = {};
  const measures: Record<string, number> = {};
  
  const markEntries = performance.getEntriesByType('mark');
  for (const entry of markEntries) {
    marks[entry.name] = entry.startTime;
  }
  
  const measureEntries = performance.getEntriesByType('measure');
  for (const entry of measureEntries) {
    measures[entry.name] = entry.duration;
  }
  
  if (Object.keys(marks).length > 0) {
    metrics.marks = marks;
  }
  
  if (Object.keys(measures).length > 0) {
    metrics.measures = measures;
  }

  return metrics;
}

/**
 * Send performance metrics to the server
 */
export async function reportPerformanceMetrics(): Promise<void> {
  try {
    const metrics = collectWebVitals();
    await fetch('/api/metrics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
      // Use keepalive to ensure the request completes even if page is unloading
      keepalive: true,
    });
  } catch (err) {
    console.error('Error reporting performance metrics:', err);
  }
}

/**
 * Initialize performance monitoring
 * - Sets up listeners for key events
 * - Configures automatic reporting
 */
export function initPerformanceMonitoring(): void {
  // Mark navigation start
  mark('app:init');
  
  // Report metrics when page finishes loading
  window.addEventListener('load', () => {
    mark('app:loaded');
    measure('app:initialization', 'app:init', 'app:loaded');
    
    // Delay reporting slightly to include load metrics
    setTimeout(() => {
      reportPerformanceMetrics();
    }, 1000);
  });
  
  // Report metrics on page unload
  window.addEventListener('beforeunload', () => {
    mark('app:unload');
    reportPerformanceMetrics();
  });
  
  // Setup periodic reporting
  const REPORTING_INTERVAL = 60000; // 1 minute
  setInterval(() => {
    reportPerformanceMetrics();
  }, REPORTING_INTERVAL);
} 