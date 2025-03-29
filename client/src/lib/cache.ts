/**
 * Simple client-side cache service to improve performance
 * by reducing unnecessary API calls for frequently accessed data
 */

interface CacheObject {
  data: any;
  timestamp: number;
}

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_PREFIX = 'lumea_cache_';

export const cacheService = {
  /**
   * Set data in the cache with a specific key
   * @param key - Cache key
   * @param data - Data to cache
   * @param duration - Cache duration in milliseconds (default: 5 minutes)
   */
  set(key: string, data: any, duration: number = DEFAULT_CACHE_DURATION): void {
    const prefixedKey = CACHE_PREFIX + key;
    const item: CacheObject = {
      data,
      timestamp: Date.now() + duration,
    };
    
    try {
      localStorage.setItem(prefixedKey, JSON.stringify(item));
    } catch (error) {
      console.warn('Cache write failed:', error);
      // Cache failure should not break the application
    }
  },

  /**
   * Get data from the cache
   * @param key - Cache key
   * @returns - Cached data or null if expired/not found
   */
  get(key: string): any | null {
    const prefixedKey = CACHE_PREFIX + key;
    
    try {
      const cachedItem = localStorage.getItem(prefixedKey);
      if (!cachedItem) return null;
      
      const item: CacheObject = JSON.parse(cachedItem);
      
      // Check if cache has expired
      if (Date.now() > item.timestamp) {
        this.remove(key);
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.warn('Cache read failed:', error);
      return null;
    }
  },

  /**
   * Remove a specific item from the cache
   * @param key - Cache key to remove
   */
  remove(key: string): void {
    const prefixedKey = CACHE_PREFIX + key;
    try {
      localStorage.removeItem(prefixedKey);
    } catch (error) {
      console.warn('Cache removal failed:', error);
    }
  },

  /**
   * Clear all cached items
   */
  clear(): void {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE_PREFIX))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  },

  /**
   * Invalidates cache for specific category
   * @param category - Category prefix to invalidate (e.g., 'user', 'resources')
   */
  invalidateCategory(category: string): void {
    try {
      const prefix = CACHE_PREFIX + category;
      Object.keys(localStorage)
        .filter(key => key.startsWith(prefix))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
    }
  }
};