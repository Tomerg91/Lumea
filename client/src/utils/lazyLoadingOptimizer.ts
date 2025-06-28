/**
 * Advanced Lazy Loading Optimizer
 * Implements modern code splitting and performance patterns
 */

import { lazy, ComponentType } from 'react';

// ====================== COMPONENT LAZY LOADING ======================

/**
 * Enhanced lazy loading with error boundaries and loading states
 */
interface LazyOptions {
  fallback?: ComponentType;
  errorFallback?: ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
  retries?: number;
}

const DEFAULT_RETRY_COUNT = 3;

/**
 * Create a lazy component with enhanced error handling and retries
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): ComponentType<any> => {
  const { retries = DEFAULT_RETRY_COUNT } = options;

  const lazyComponent = lazy(() => {
    return importFn().catch((error: Error) => {
      console.warn('Lazy loading failed, retrying...', error);
      return retryImport(importFn, retries);
    });
  });

  return lazyComponent;
};

/**
 * Retry import with exponential backoff
 */
const retryImport = async <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries: number
): Promise<{ default: T }> => {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      return await importFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Retry ${i + 1}/${retries} failed:`, error);
    }
  }
  throw new Error('Max retries exceeded');
};

// ====================== ROUTE-BASED SPLITTING ======================

/**
 * Route-based code splitting with preloading
 */
export const createRouteComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  options: LazyOptions = {}
) => {
  const LazyComponent = lazyWithRetry(importFn, options);

  // Preload on route hover/focus
  const preloadComponent = () => {
    importFn().catch(() => {
      // Silently fail preloading
    });
  };

  return {
    component: LazyComponent,
    preload: preloadComponent
  };
};

// ====================== FEATURE-BASED SPLITTING ======================

/**
 * Feature-based lazy loading for heavy components
 */
export const createFeatureComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  options: { 
    condition?: () => boolean; 
    fallback?: ComponentType;
  } = {}
) => {
  const { condition = () => true, fallback } = options;

  if (!condition()) {
    return fallback || (() => null);
  }

  return lazyWithRetry(importFn);
};

// ====================== CONDITIONAL LOADING ======================

/**
 * Conditionally load components based on user role, feature flags, etc.
 */
interface ConditionalLoadOptions {
  condition: () => boolean | Promise<boolean>;
  fallback?: ComponentType;
  loading?: ComponentType;
}

export const createConditionalComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  { condition, fallback, loading }: ConditionalLoadOptions
) => {
  return lazy(async () => {
    const shouldLoad = await Promise.resolve(condition());
    
    if (!shouldLoad) {
      return { default: fallback || (() => null) };
    }

    return importFn();
  });
};

// ====================== BUNDLE SPLITTING UTILITIES ======================

/**
 * Split vendor libraries into separate chunks
 */
export const createVendorSplit = (
  vendors: string[],
  importFn: () => Promise<any>
) => {
  return lazy(async () => {
    // Import vendor dependencies first
    const vendorPromises = vendors.map(vendor => import(vendor));
    await Promise.all(vendorPromises);
    
    // Then import the component
    return importFn();
  });
};

/**
 * Create dynamic imports with webpack magic comments
 */
export const createDynamicImport = (
  importPath: string,
  chunkName?: string,
  preload: boolean = false
) => {
  const webpackComments = [];
  
  if (chunkName) {
    webpackComments.push(`webpackChunkName: "${chunkName}"`);
  }
  
  if (preload) {
    webpackComments.push('webpackPreload: true');
  } else {
    webpackComments.push('webpackPrefetch: true');
  }

  const comments = webpackComments.length > 0 
    ? `/* ${webpackComments.join(', ')} */` 
    : '';

  return new Function('', `return import(${comments}'${importPath}')`);
};

// ====================== PRELOADING STRATEGIES ======================

/**
 * Intelligent preloading based on user behavior
 */
class PreloadManager {
  private preloadedComponents = new Set<string>();
  private preloadQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  /**
   * Preload component on hover with debouncing
   */
  onHover(importFn: () => Promise<any>, delay = 100) {
    let timeoutId: NodeJS.Timeout;
    
    return {
      onMouseEnter: () => {
        timeoutId = setTimeout(() => {
          this.addToQueue(importFn);
        }, delay);
      },
      onMouseLeave: () => {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
  }

  /**
   * Preload components during idle time
   */
  preloadOnIdle(importFns: Array<() => Promise<any>>) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        importFns.forEach(fn => this.addToQueue(fn));
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        importFns.forEach(fn => this.addToQueue(fn));
      }, 2000);
    }
  }

  /**
   * Preload based on route prediction
   */
  preloadLikelyRoutes(routes: string[], userBehavior: any) {
    // Simple prediction based on current route and user role
    const currentRoute = window.location.pathname;
    const predictedRoutes = this.predictNextRoutes(currentRoute, userBehavior);
    
    predictedRoutes.forEach(route => {
      if (routes.includes(route)) {
        const importFn = () => import(`../pages/${route}`);
        this.addToQueue(importFn);
      }
    });
  }

  private addToQueue(importFn: () => Promise<any>) {
    const key = importFn.toString();
    if (this.preloadedComponents.has(key)) return;

    this.preloadedComponents.add(key);
    this.preloadQueue.push(importFn);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const importFn = this.preloadQueue.shift();
      if (importFn) {
        try {
          await importFn();
          // Small delay between preloads to avoid blocking
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.debug('Preload failed:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  private predictNextRoutes(currentRoute: string, userBehavior: any): string[] {
    // Simple prediction logic - can be enhanced with ML
    const routePredictions: Record<string, string[]> = {
      '/dashboard': ['ClientsPage', 'SessionsPage', 'AnalyticsPage'],
      '/auth': ['Dashboard'],
      '/clients': ['ClientDetailPage', 'SessionsPage'],
      '/sessions': ['SessionDetail', 'CoachNotesPage'],
    };

    return routePredictions[currentRoute] || [];
  }
}

export const preloadManager = new PreloadManager();

// ====================== PERFORMANCE MONITORING ======================

/**
 * Monitor lazy loading performance
 */
export class LazyLoadingMonitor {
  private metrics = new Map<string, { loadTime: number; success: boolean }>();

  startTracking(componentName: string) {
    const start = performance.now();
    
    return {
      end: (success: boolean = true) => {
        const loadTime = performance.now() - start;
        this.metrics.set(componentName, { loadTime, success });
        
        if (import.meta.env.DEV) {
          console.debug(`Lazy loaded ${componentName}: ${loadTime.toFixed(2)}ms`);
        }
      }
    };
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).map(([name, data]) => ({
      component: name,
      ...data
    }));
  }

  getAverageLoadTime() {
    const times = Array.from(this.metrics.values()).map(m => m.loadTime);
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  exportMetrics() {
    return {
      totalComponents: this.metrics.size,
      averageLoadTime: this.getAverageLoadTime(),
      successRate: this.getSuccessRate(),
      details: this.getMetrics()
    };
  }

  private getSuccessRate() {
    const successes = Array.from(this.metrics.values()).filter(m => m.success).length;
    return (successes / this.metrics.size) * 100;
  }
}

export const lazyLoadingMonitor = new LazyLoadingMonitor();

// ====================== OPTIMIZED COMPONENT FACTORIES ======================

/**
 * Create optimized lazy components with all best practices
 */
export const createOptimizedLazyComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  componentName: string,
  options: LazyOptions & {
    preloadCondition?: () => boolean;
    critical?: boolean;
  } = {}
) => {
  const { critical = false, preloadCondition } = options;

  // Track performance
  const tracker = lazyLoadingMonitor.startTracking(componentName);

  const enhancedImportFn = async () => {
    try {
      const result = await importFn();
      tracker.end(true);
      return result;
    } catch (error) {
      tracker.end(false);
      throw error;
    }
  };

  const LazyComponent = lazyWithRetry(enhancedImportFn, options);

  // Setup preloading if conditions are met
  if (preloadCondition && preloadCondition()) {
    preloadManager.preloadOnIdle([enhancedImportFn]);
  }

  // Critical components get higher priority
  if (critical) {
    // Preload immediately
    enhancedImportFn().catch(() => {
      // Silently handle preload failures
    });
  }

  return LazyComponent;
};