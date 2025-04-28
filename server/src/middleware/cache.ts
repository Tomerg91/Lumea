import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

// Create a cache instance with a default TTL of 5 minutes
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
});

// Cache middleware options
interface CacheOptions {
  ttl?: number;
  key?: string | ((req: Request) => string);
  useCache?: boolean;
}

// Create a cache middleware
export const cacheMiddleware = (options: CacheOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const key = typeof options.key === 'function'
      ? options.key(req)
      : options.key || `${req.originalUrl || req.url}`;

    // Try to get cached response
    if (options.useCache && cache.has(key)) {
      return res.send(cache.get(key));
    }

    const originalSend = res.send; // Store original send function

    res.send = (body: any): Response<any, Record<string, any>> => { // Match return type and use arrow function
      if (options.useCache) {
        cache.set(key, body, options.ttl ?? 60); 
      }
      return originalSend.call(res, body); // Call original send with correct context and return value
    };

    next();
  };
};

// Clear cache for a specific key
export const clearCache = (key: string) => {
  cache.del(key);
};

// Clear all cache
export const clearAllCache = () => {
  cache.flushAll();
};

// Get cache stats
export const getCacheStats = () => {
  return cache.getStats();
}; 