import { Request, Response, NextFunction } from 'express';

/**
 * Performance monitoring middleware options
 */
interface PerformanceMonitorOptions {
  slowThreshold?: number; // Time in ms to consider a request "slow" (default: 1000ms)
  logFunction?: (message: string) => void; // Custom log function
}

/**
 * Create performance monitoring middleware
 * Tracks request processing time and logs slow requests
 * 
 * @param options Middleware options
 * @returns Express middleware
 */
export const performanceMonitor = (options: PerformanceMonitorOptions = {}) => {
  const {
    slowThreshold = 1000, // Default to 1000ms (1 second) threshold
    logFunction = console.warn, // Default to console.warn
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip monitoring for static assets if desired
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      return next();
    }

    // Mark start time
    const start = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function to calculate duration
    res.end = function(this: Response, ...args: any[]) {
      // Calculate request duration
      const duration = Date.now() - start;
      
      // Add X-Response-Time header
      this.setHeader('X-Response-Time', `${duration}ms`);
      
      // Log slow requests
      if (duration > slowThreshold) {
        const message = `Slow request detected: ${req.method} ${req.originalUrl || req.url} - ${duration}ms`;
        logFunction(message);
      }
      
      // Call original end function with correct context and arguments
      return originalEnd.apply(this, args);
    } as any;
    
    next();
  };
};

/**
 * Calculate memory usage in a human-readable format
 * @returns Memory usage string
 */
export const getMemoryUsage = (): string => {
  const usage = process.memoryUsage();
  return `Memory: RSS: ${formatBytes(usage.rss)} | Heap: ${formatBytes(usage.heapUsed)}/${formatBytes(usage.heapTotal)}`;
};

/**
 * Format bytes to a human-readable string
 * @param bytes Number of bytes
 * @returns Human-readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

export default performanceMonitor; 