/**
 * Performance optimization configuration for Supabase integration
 * 
 * This file contains performance-related configurations, thresholds,
 * and optimization settings for the Supabase-powered coaching application.
 */

// React Query configuration for optimal performance
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      gcTime: 5 * 60 * 1000,
      // Data is fresh for 1 minute
      staleTime: 1 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetching
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Network mode for better offline handling
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
};

// Supabase query optimization settings
export const supabaseOptimization = {
  // Pagination settings
  pagination: {
    defaultPageSize: 25,
    maxPageSize: 100,
    prefetchNextPage: true,
  },

  // Real-time subscription limits
  realtime: {
    maxSubscriptions: 10,
    heartbeatInterval: 30000,
    reconnectDelay: 5000,
  },

  // File upload optimization
  storage: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    chunkSize: 1024 * 1024, // 1MB chunks
    maxConcurrentUploads: 3,
    supportedFormats: {
      images: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      documents: ['pdf', 'doc', 'docx', 'txt', 'md'],
      audio: ['mp3', 'wav', 'ogg', 'm4a'],
      video: ['mp4', 'webm', 'mov'],
    },
  },

  // Database query optimization
  database: {
    // Select only necessary columns by default
    selectOptimization: true,
    // Use RLS policies for security and performance
    rowLevelSecurity: true,
    // Enable query explain for development
    explainQueries: process.env.NODE_ENV === 'development',
  },
};

// Performance monitoring thresholds
export const performanceThresholds = {
  // Query execution time limits (milliseconds)
  queries: {
    simple: 100,      // Basic CRUD operations
    complex: 500,     // Joins, aggregations
    analytics: 1000,  // Complex analytics queries
    search: 300,      // Full-text search
  },

  // File operation limits
  files: {
    upload: 30000,    // 30 seconds for large files
    download: 10000,  // 10 seconds
    list: 2000,       // Directory listing
    delete: 1000,     // File deletion
  },

  // Real-time operation limits
  realtime: {
    connectionSetup: 3000,  // Initial connection
    messageDelivery: 100,   // Real-time message delivery
    subscriptionSetup: 1000, // Subscription setup
  },

  // UI responsiveness
  ui: {
    renderTime: 16,     // 60fps target
    interactionDelay: 100, // User interaction response
    navigationTime: 500,   // Page navigation
  },
};

// Memory management settings
export const memoryManagement = {
  // React Query cache limits
  queryCache: {
    maxQueries: 100,
    maxQueryData: 50 * 1024 * 1024, // 50MB
  },

  // Component optimization
  components: {
    virtualizeThreshold: 50, // Virtualize lists with 50+ items
    memoizeThreshold: 10,    // Memoize components with 10+ props
    lazyLoadThreshold: 5,    // Lazy load after 5 items
  },

  // Image optimization
  images: {
    maxCacheSize: 20 * 1024 * 1024, // 20MB image cache
    compressionQuality: 0.8,
    maxDimensions: { width: 1920, height: 1080 },
  },
};

// Network optimization settings
export const networkOptimization = {
  // Request batching
  batching: {
    enabled: true,
    maxBatchSize: 10,
    batchDelay: 50, // milliseconds
  },

  // Connection pooling
  connection: {
    maxConnections: 6,
    keepAlive: true,
    timeout: 30000,
  },

  // Caching strategies
  caching: {
    // Static assets
    static: {
      maxAge: 31536000, // 1 year
      immutable: true,
    },
    // API responses
    api: {
      maxAge: 300, // 5 minutes
      staleWhileRevalidate: 60,
    },
    // User data
    userData: {
      maxAge: 60, // 1 minute
      mustRevalidate: true,
    },
  },
};

// Development performance tools
export const developmentTools = {
  // Performance monitoring
  monitoring: {
    enabled: process.env.NODE_ENV === 'development',
    logSlowQueries: true,
    logMemoryUsage: true,
    logRenderTimes: true,
  },

  // Debug settings
  debug: {
    logSupabaseQueries: process.env.NODE_ENV === 'development',
    logReactQueryCache: false,
    logComponentRenders: false,
  },

  // Profiling
  profiling: {
    enabled: false, // Enable manually for profiling sessions
    sampleRate: 0.1, // 10% sampling
    includeUserTiming: true,
  },
};

// Production optimizations
export const productionOptimizations = {
  // Bundle optimization
  bundling: {
    codesplitting: true,
    treeshaking: true,
    minification: true,
  },

  // Runtime optimizations
  runtime: {
    preloadCriticalData: true,
    prefetchUserData: true,
    optimisticUpdates: true,
  },

  // CDN settings
  cdn: {
    enabled: true,
    staticAssets: true,
    imageOptimization: true,
  },
};

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map();

  static startMeasurement(label: string): void {
    this.measurements.set(label, performance.now());
  }

  static endMeasurement(label: string): number {
    const startTime = this.measurements.get(label);
    if (!startTime) {
      console.warn(`No start time found for measurement: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(label);

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development') {
      const threshold = this.getThresholdForLabel(label);
      if (duration > threshold) {
        console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      }
    }

    return duration;
  }

  private static getThresholdForLabel(label: string): number {
    // Map labels to appropriate thresholds
    if (label.includes('query')) return performanceThresholds.queries.simple;
    if (label.includes('upload')) return performanceThresholds.files.upload;
    if (label.includes('render')) return performanceThresholds.ui.renderTime;
    return 1000; // Default threshold
  }

  static async measureAsync<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<T> {
    this.startMeasurement(label);
    try {
      const result = await operation();
      this.endMeasurement(label);
      return result;
    } catch (error) {
      this.endMeasurement(label);
      throw error;
    }
  }

  static measureSync<T>(operation: () => T, label: string): T {
    this.startMeasurement(label);
    try {
      const result = operation();
      this.endMeasurement(label);
      return result;
    } catch (error) {
      this.endMeasurement(label);
      throw error;
    }
  }
}

// Export performance configuration
export const performanceConfig = {
  queryClient: queryClientConfig,
  supabase: supabaseOptimization,
  thresholds: performanceThresholds,
  memory: memoryManagement,
  network: networkOptimization,
  development: developmentTools,
  production: productionOptimizations,
};

// Performance best practices documentation
export const performanceBestPractices = {
  queries: [
    'Use specific column selection instead of SELECT *',
    'Implement proper pagination for large datasets',
    'Use RPC functions for complex business logic',
    'Cache frequently accessed data with appropriate TTL',
    'Use optimistic updates for better UX',
  ],
  
  components: [
    'Memoize expensive computations with useMemo',
    'Use React.memo for pure components',
    'Implement virtualization for long lists',
    'Lazy load components and routes',
    'Minimize re-renders with proper dependency arrays',
  ],
  
  storage: [
    'Compress images before upload',
    'Use progressive loading for images',
    'Implement chunked uploads for large files',
    'Set appropriate cache headers',
    'Use CDN for static assets',
  ],
  
  realtime: [
    'Limit the number of active subscriptions',
    'Use presence for user status tracking',
    'Implement proper cleanup for subscriptions',
    'Debounce rapid updates',
    'Use channels efficiently',
  ],
}; 