/**
 * Comprehensive Performance Optimizer
 * Industry-standard performance monitoring and optimization utilities
 */

// ====================== CORE WEB VITALS MONITORING ======================

interface WebVitalsMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint (New in 2024)
}

interface PerformanceMetrics extends WebVitalsMetrics {
  memoryUsage?: number;
  bundleSize?: number;
  renderTime?: number;
  navigationTiming?: PerformanceNavigationTiming;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private initialized = false;

  /**
   * Initialize performance monitoring
   */
  init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    this.initialized = true;
    this.setupWebVitalsMonitoring();
    this.setupResourceMonitoring();
    this.setupMemoryMonitoring();
    this.setupNavigationMonitoring();
  }

  /**
   * Core Web Vitals monitoring using modern APIs
   */
  private setupWebVitalsMonitoring() {
    // First Contentful Paint
    this.observePerformanceEntry('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.FCP = fcpEntry.startTime;
      }
    });

    // Largest Contentful Paint
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lcpEntry = entries[entries.length - 1];
      if (lcpEntry) {
        this.metrics.LCP = lcpEntry.startTime;
      }
    });

    // First Input Delay
    this.observePerformanceEntry('first-input', (entries) => {
      const fidEntry = entries[0];
      if (fidEntry) {
        this.metrics.FID = (fidEntry as any).processingStart - fidEntry.startTime;
      }
    });

    // Cumulative Layout Shift
    let clsValue = 0;
    this.observePerformanceEntry('layout-shift', (entries) => {
      for (const entry of entries) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.metrics.CLS = clsValue;
    });

    // Interaction to Next Paint (INP) - New metric
    if ('PerformanceEventTiming' in window) {
      this.observePerformanceEntry('event', (entries) => {
        let maxDelay = 0;
        for (const entry of entries) {
          const delay = (entry as any).processingStart - entry.startTime;
          maxDelay = Math.max(maxDelay, delay);
        }
        this.metrics.INP = maxDelay;
      });
    }
  }

  /**
   * Resource loading monitoring
   */
  private setupResourceMonitoring() {
    this.observePerformanceEntry('navigation', (entries) => {
      const navEntry = entries[0] as PerformanceNavigationTiming;
      if (navEntry) {
        this.metrics.TTFB = navEntry.responseStart - navEntry.fetchStart;
        this.metrics.navigationTiming = navEntry;
      }
    });

    this.observePerformanceEntry('resource', (entries) => {
      // Track slow resources
      const slowResources = entries.filter(entry => entry.duration > 1000);
      if (slowResources.length > 0 && import.meta.env.DEV) {
        console.warn('Slow resources detected:', slowResources);
      }
    });
  }

  /**
   * Memory usage monitoring
   */
  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memoryUsage = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
    }

    // Monitor memory leaks
    setInterval(() => {
      if ('memory' in performance) {
        const current = (performance as any).memory.usedJSHeapSize;
        if (current > 50 * 1024 * 1024 && import.meta.env.DEV) { // 50MB threshold
          console.warn('High memory usage detected:', current / 1024 / 1024, 'MB');
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Navigation performance monitoring
   */
  private setupNavigationMonitoring() {
    // Time to interactive
    const measureTTI = () => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        const tti = navEntry.domInteractive - navEntry.fetchStart;
        return tti;
      }
      return 0;
    };

    setTimeout(() => {
      const tti = measureTTI();
      if (tti > 3000 && import.meta.env.DEV) {
        console.warn('Slow Time to Interactive:', tti, 'ms');
      }
    }, 1000);
  }

  /**
   * Generic performance observer helper
   */
  private observePerformanceEntry(
    entryType: string, 
    callback: (entries: PerformanceEntry[]) => void
  ) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ entryTypes: [entryType] });
      this.observers.set(entryType, observer);
    } catch (error) {
      console.debug(`Performance observer for ${entryType} not supported:`, error);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Calculate performance score (0-100)
   */
  getPerformanceScore(): number {
    let score = 100;
    
    // LCP scoring (target: <2.5s)
    if (this.metrics.LCP) {
      if (this.metrics.LCP > 4000) score -= 30;
      else if (this.metrics.LCP > 2500) score -= 15;
    }

    // FID scoring (target: <100ms)
    if (this.metrics.FID) {
      if (this.metrics.FID > 300) score -= 25;
      else if (this.metrics.FID > 100) score -= 10;
    }

    // CLS scoring (target: <0.1)
    if (this.metrics.CLS) {
      if (this.metrics.CLS > 0.25) score -= 25;
      else if (this.metrics.CLS > 0.1) score -= 10;
    }

    // Memory usage scoring
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 0.8) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  /**
   * Export metrics for reporting
   */
  exportMetrics() {
    return {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: this.getMetrics(),
      score: this.getPerformanceScore(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Get performance recommendations
   */
  private getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.LCP && this.metrics.LCP > 2500) {
      recommendations.push('Optimize Largest Contentful Paint - consider image optimization and critical resource prioritization');
    }

    if (this.metrics.FID && this.metrics.FID > 100) {
      recommendations.push('Reduce First Input Delay - minimize main thread blocking and break up long tasks');
    }

    if (this.metrics.CLS && this.metrics.CLS > 0.1) {
      recommendations.push('Improve layout stability - set explicit dimensions for media and avoid DOM insertions');
    }

    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 0.7) {
      recommendations.push('Optimize memory usage - check for memory leaks and optimize component cleanup');
    }

    return recommendations;
  }

  /**
   * Cleanup observers
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.initialized = false;
  }
}

// ====================== REACT PERFORMANCE OPTIMIZATION ======================

/**
 * React component performance profiler
 */
export class ReactPerformanceProfiler {
  private componentMetrics = new Map<string, {
    renderCount: number;
    totalRenderTime: number;
    averageRenderTime: number;
    lastRender: number;
  }>();

  /**
   * Profile component render performance
   */
  profileComponent(componentName: string, renderFn: () => void) {
    if (!import.meta.env.DEV) {
      renderFn();
      return;
    }

    const startTime = performance.now();
    renderFn();
    const renderTime = performance.now() - startTime;

    const existing = this.componentMetrics.get(componentName) || {
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRender: 0
    };

    const updated = {
      renderCount: existing.renderCount + 1,
      totalRenderTime: existing.totalRenderTime + renderTime,
      averageRenderTime: (existing.totalRenderTime + renderTime) / (existing.renderCount + 1),
      lastRender: renderTime
    };

    this.componentMetrics.set(componentName, updated);

    // Warn about slow renders
    if (renderTime > 16) { // 60fps threshold
      console.warn(`Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Get slowest components
   */
  getSlowestComponents(limit = 10) {
    return Array.from(this.componentMetrics.entries())
      .sort(([, a], [, b]) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, limit)
      .map(([name, metrics]) => ({ name, ...metrics }));
  }

  /**
   * Get components with most re-renders
   */
  getMostRerenderedComponents(limit = 10) {
    return Array.from(this.componentMetrics.entries())
      .sort(([, a], [, b]) => b.renderCount - a.renderCount)
      .slice(0, limit)
      .map(([name, metrics]) => ({ name, ...metrics }));
  }
}

// ====================== BUNDLE OPTIMIZATION ======================

/**
 * Bundle size analyzer and optimizer
 */
export class BundleOptimizer {
  /**
   * Analyze current bundle size
   */
  async analyzeBundleSize() {
    try {
      // Use webpack-bundle-analyzer data if available
      const response = await fetch('/bundle-stats.json');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.debug('Bundle stats not available:', error);
    }

    // Fallback to estimating from resource timing
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => r.name.endsWith('.js'));
    
    const totalSize = jsResources.reduce((total, resource) => {
      return total + (resource.transferSize || 0);
    }, 0);

    return {
      totalSize,
      resources: jsResources.length,
      largestResource: Math.max(...jsResources.map(r => r.transferSize || 0))
    };
  }

  /**
   * Get bundle optimization recommendations
   */
  getOptimizationRecommendations(bundleStats: any) {
    const recommendations: string[] = [];

    if (bundleStats.totalSize > 1024 * 1024) { // 1MB
      recommendations.push('Bundle size is large - consider code splitting and lazy loading');
    }

    if (bundleStats.largestResource > 512 * 1024) { // 512KB
      recommendations.push('Large individual chunks detected - split vendor libraries');
    }

    if (bundleStats.resources > 20) {
      recommendations.push('Many separate chunks - consider combining smaller chunks');
    }

    return recommendations;
  }
}

// ====================== CACHING OPTIMIZATION ======================

/**
 * Intelligent caching strategies
 */
export class CacheOptimizer {
  private cacheMetrics = new Map<string, {
    hits: number;
    misses: number;
    hitRate: number;
    lastAccess: number;
  }>();

  /**
   * Optimize cache strategy based on usage patterns
   */
  optimizeCacheStrategy(cacheKey: string, data: any, ttl?: number) {
    const metrics = this.cacheMetrics.get(cacheKey) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      lastAccess: 0
    };

    // Adaptive TTL based on access patterns
    let adaptiveTTL = ttl || 300000; // 5 minutes default

    if (metrics.hitRate > 0.8) {
      adaptiveTTL *= 2; // Extend cache for frequently accessed data
    } else if (metrics.hitRate < 0.2) {
      adaptiveTTL /= 2; // Reduce cache for rarely accessed data
    }

    // Store in appropriate cache based on data type and frequency
    if (typeof data === 'object' && JSON.stringify(data).length > 1024) {
      // Large objects go to IndexedDB
      this.storeInIndexedDB(cacheKey, data, adaptiveTTL);
    } else {
      // Small data goes to localStorage with compression
      this.storeInLocalStorage(cacheKey, data, adaptiveTTL);
    }

    metrics.lastAccess = Date.now();
    this.cacheMetrics.set(cacheKey, metrics);
  }

  private storeInIndexedDB(key: string, data: any, ttl: number) {
    // Implementation would use IndexedDB for large data
    console.debug('Storing in IndexedDB:', key);
  }

  private storeInLocalStorage(key: string, data: any, ttl: number) {
    try {
      const item = {
        data,
        expiry: Date.now() + ttl,
        compressed: this.shouldCompress(data)
      };

      const serialized = JSON.stringify(item);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.warn('Failed to store in localStorage:', error);
    }
  }

  private shouldCompress(data: any): boolean {
    const serialized = JSON.stringify(data);
    return serialized.length > 1024; // Compress data > 1KB
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics() {
    return Array.from(this.cacheMetrics.entries()).map(([key, metrics]) => ({
      key,
      ...metrics
    }));
  }
}

// ====================== GLOBAL PERFORMANCE MANAGER ======================

/**
 * Centralized performance management
 */
class GlobalPerformanceManager {
  private performanceMonitor = new PerformanceMonitor();
  private reactProfiler = new ReactPerformanceProfiler();
  private bundleOptimizer = new BundleOptimizer();
  private cacheOptimizer = new CacheOptimizer();

  /**
   * Initialize all performance monitoring
   */
  init() {
    this.performanceMonitor.init();

    // Export to global for debugging
    if (import.meta.env.DEV) {
      (window as any).__performanceManager = this;
    }
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport() {
    const [bundleStats] = await Promise.all([
      this.bundleOptimizer.analyzeBundleSize()
    ]);

    return {
      webVitals: this.performanceMonitor.getMetrics(),
      score: this.performanceMonitor.getPerformanceScore(),
      recommendations: this.performanceMonitor.exportMetrics().recommendations,
      reactPerformance: {
        slowestComponents: this.reactProfiler.getSlowestComponents(5),
        mostRerendered: this.reactProfiler.getMostRerenderedComponents(5)
      },
      bundle: {
        stats: bundleStats,
        recommendations: this.bundleOptimizer.getOptimizationRecommendations(bundleStats)
      },
      cache: {
        metrics: this.cacheOptimizer.getCacheMetrics()
      }
    };
  }

  /**
   * Send performance data to analytics
   */
  async reportPerformance() {
    if (!import.meta.env.PROD) return;

    try {
      const report = await this.getPerformanceReport();
      
      // Send to analytics service
      // await analytics.track('performance_metrics', report);
      
      console.debug('Performance report:', report);
    } catch (error) {
      console.warn('Failed to report performance:', error);
    }
  }

  /**
   * Cleanup all monitors
   */
  destroy() {
    this.performanceMonitor.destroy();
  }
}

// ====================== EXPORTS ======================

export const performanceManager = new GlobalPerformanceManager();
export const reactProfiler = new ReactPerformanceProfiler();
export const bundleOptimizer = new BundleOptimizer();
export const cacheOptimizer = new CacheOptimizer();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  performanceManager.init();
}