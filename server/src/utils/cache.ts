import NodeCache from 'node-cache';

/**
 * Cache configuration options
 */
interface CacheOptions {
  stdTTL: number;         // Standard time-to-live in seconds
  checkperiod: number;    // Time in seconds to check for expired keys
  useClones: boolean;     // Deep clone objects when saving/retrieving
  deleteOnExpire: boolean; // Delete expired items automatically
}

// Default cache configuration
const defaultOptions: CacheOptions = {
  stdTTL: 300,           // 5 minutes default cache duration
  checkperiod: 120,      // Check for expired keys every 2 minutes
  useClones: false,      // Use references instead of clones for better performance
  deleteOnExpire: true,  // Automatically delete expired items
};

/**
 * Cache manager class for handling application caching
 */
class CacheManager {
  private cache: NodeCache;
  private readonly defaultNamespace: string = 'app';

  /**
   * Create a new cache manager instance
   * @param options Cache configuration options
   */
  constructor(options: Partial<CacheOptions> = {}) {
    this.cache = new NodeCache({
      ...defaultOptions,
      ...options,
    });

    // Log cache errors
    this.cache.on('error', (err) => {
      console.error('Cache error:', err);
    });
  }

  /**
   * Get an item from the cache
   * @param key Cache key
   * @param namespace Optional namespace to organize cache keys
   * @returns The cached value or undefined if not found
   */
  get<T>(key: string, namespace: string = this.defaultNamespace): T | undefined {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    return this.cache.get<T>(namespacedKey);
  }

  /**
   * Set an item in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time-to-live in seconds (optional, uses default if not specified)
   * @param namespace Optional namespace to organize cache keys
   * @returns True if successfully stored
   */
  set<T>(key: string, value: T, ttl?: number, namespace: string = this.defaultNamespace): boolean {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    return this.cache.set(namespacedKey, value, ttl);
  }

  /**
   * Check if a key exists in the cache
   * @param key Cache key
   * @param namespace Optional namespace to organize cache keys
   * @returns True if the key exists
   */
  has(key: string, namespace: string = this.defaultNamespace): boolean {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    return this.cache.has(namespacedKey);
  }

  /**
   * Delete an item from the cache
   * @param key Cache key
   * @param namespace Optional namespace to organize cache keys
   * @returns True if the key was deleted, false if it didn't exist
   */
  delete(key: string, namespace: string = this.defaultNamespace): boolean {
    const namespacedKey = this.getNamespacedKey(key, namespace);
    return this.cache.del(namespacedKey) > 0;
  }

  /**
   * Clear all items from a namespace or the entire cache
   * @param namespace Optional namespace to clear (clears entire cache if not specified)
   */
  clear(namespace?: string): void {
    if (namespace) {
      const keys = this.cache.keys().filter(key => key.startsWith(`${namespace}:`));
      this.cache.del(keys);
    } else {
      this.cache.flushAll();
    }
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  getStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      ksize: this.cache.getStats().ksize,
      vsize: this.cache.getStats().vsize,
    };
  }

  /**
   * Get namespaced key
   * @param key Original key
   * @param namespace Namespace
   * @returns Namespaced key string
   */
  private getNamespacedKey(key: string, namespace: string): string {
    return `${namespace}:${key}`;
  }
}

// Create and export a singleton instance
const cacheManager = new CacheManager();
export default cacheManager; 