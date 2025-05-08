import { createClient } from 'redis';

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
  // Don't crash the application on Redis connection failure
});

// Connect to Redis on startup
(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

/**
 * Cache middleware for Express routes
 * @param keyPrefix - Prefix for cache key (e.g., 'user:', 'session:')
 * @param ttl - Time to live in seconds
 */
export const cacheMiddleware = (keyPrefix: string, ttl = 3600) => {
  return async (req: any, res: any, next: any) => {
    if (!redisClient.isReady) {
      return next(); // Skip caching if Redis is not connected
    }

    try {
      const key = `${keyPrefix}:${req.originalUrl}`;

      // Try to get data from cache
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        // Return cached data
        return res.json(JSON.parse(cachedData.toString()));
      }

      // Store original send method
      const originalSend = res.send;

      // Override send method to cache response
      res.send = function (body: any) {
        if (res.statusCode === 200 && body) {
          try {
            // Cache the response
            const dataToCache = typeof body === 'string' ? body : JSON.stringify(body);
            redisClient.setEx(key, ttl, dataToCache).catch((err) => {
              console.error('Redis cache set error:', err);
            });
          } catch (err) {
            console.error('Error caching response:', err);
          }
        }

        // Call original send method
        return originalSend.call(this, body);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      next();
    }
  };
};

/**
 * Clear cache for a specific prefix
 * @param keyPrefix - Prefix for cache keys to clear
 */
export const clearCache = async (keyPrefix: string) => {
  if (!redisClient.isReady) {
    return; // Skip if Redis is not connected
  }

  try {
    const keys = await redisClient.keys(`${keyPrefix}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Cleared ${keys.length} cache keys for prefix: ${keyPrefix}`);
    }
  } catch (err) {
    console.error('Error clearing cache:', err);
  }
};

/**
 * Cache a value directly
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds
 */
export const cacheSet = async (key: string, value: any, ttl = 3600) => {
  if (!redisClient.isReady) {
    return; // Skip if Redis is not connected
  }

  try {
    const dataToCache = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setEx(key, ttl, dataToCache);
  } catch (err) {
    console.error('Error setting cache:', err);
  }
};

/**
 * Get a cached value
 * @param key - Cache key
 * @returns The cached value, or null if not found
 */
export const cacheGet = async (key: string) => {
  if (!redisClient.isReady) {
    return null; // Skip if Redis is not connected
  }

  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data.toString()) : null;
  } catch (err) {
    console.error('Error getting from cache:', err);
    return null;
  }
};

export default redisClient;
