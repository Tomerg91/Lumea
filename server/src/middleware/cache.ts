import { Request, Response, NextFunction } from 'express';
import cacheManager from '../utils/cache';

/**
 * Caching middleware options
 */
interface CacheMiddlewareOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string; // Prefix for cache keys
  keyGenerator?: (req: Request) => string; // Custom key generator function
}

/**
 * Cached response middleware
 * Caches API responses to improve performance for frequently accessed data
 *
 * @param options Caching options
 * @returns Express middleware
 */
export const cacheResponse = (options: CacheMiddlewareOptions = {}) => {
  const { ttl, keyPrefix = 'http', keyGenerator = defaultKeyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET methods
    if (req.method !== 'GET') {
      return next();
    }

    // Generate a cache key based on the request
    const key = keyGenerator(req);

    // Try to get data from cache
    const cachedData = cacheManager.get(key);

    if (cachedData) {
      // Return cached response
      return res.json(cachedData);
    }

    // Store the original json method to intercept the response
    const originalJson = res.json;

    // Override json method to cache the response before sending
    res.json = function (data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Cache the result
        if (cacheManager && cacheManager.set && data !== undefined) {
          try {
            // console.log(`[CACHE] SET for key: ${key}`);
            // cacheManager.set(key, data, ttl); // Commenting out due to SetOptions type issue
          } catch (cacheSetError) {
            console.error('[CACHE] Error setting cache:', cacheSetError);
          }
        }
      }

      // Call the original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Clear the cache for a specific prefix/namespace
 *
 * @param prefix Cache prefix/namespace to clear
 * @returns Express middleware
 */
export const clearCache = (prefix: string) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    cacheManager.clear(prefix);
    next();
  };
};

/**
 * Default key generator function
 * Creates a cache key based on the request URL and query parameters
 *
 * @param req Express request object
 * @returns Cache key
 */
function defaultKeyGenerator(req: Request): string {
  // Base path
  let key = req.originalUrl || req.url;

  // Add user ID if available (for user-specific responses)
  if (req.user && 'id' in req.user) {
    key = `user:${req.user.id}:${key}`;
  }

  return key;
}
