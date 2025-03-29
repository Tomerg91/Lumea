import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { cacheService } from "./cache";
import { useIsNative, useIsOnline } from "@/hooks/use-mobile";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Enhanced API request function with offline support and performance optimizations
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    useCache?: boolean;
    cacheDuration?: number;
    bypassCache?: boolean;
  }
): Promise<Response> {
  // Create a unique cache key for this request
  const cacheKey = `${method}_${url}_${data ? JSON.stringify(data) : 'no_data'}`;
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    
    // If this is a successful GET request and caching is enabled, cache the response
    if (method === 'GET' && options?.useCache && res.ok) {
      const responseData = await res.clone().json();
      cacheService.set(cacheKey, responseData, options.cacheDuration);
    }
    
    return res;
  } catch (error) {
    // If offline and we have cached data, return a mocked response with the cached data
    if (options?.useCache && method === 'GET') {
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        console.log(`Using cached data for ${url}`);
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Re-throw the error if we can't handle it
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Enhanced query function with caching and offline support
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  useCache?: boolean;
  cacheDuration?: number;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, useCache = true, cacheDuration }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const cacheKey = Array.isArray(queryKey) ? queryKey.join('_') : queryKey.toString();
    
    // Try to get from cache first if caching is enabled
    if (useCache) {
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        console.log(`Using cached data for ${url}`);
        return cachedData;
      }
    }
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      
      // Cache the successful response if caching is enabled
      if (useCache) {
        cacheService.set(cacheKey, data, cacheDuration);
      }
      
      return data;
    } catch (error) {
      // If we're offline and have cache, try to use that even if it's expired
      if (useCache) {
        const expiredCache = localStorage.getItem(`lumea_cache_${cacheKey}`);
        if (expiredCache) {
          try {
            const cachedItem = JSON.parse(expiredCache);
            console.log(`Using expired cached data for ${url}`);
            return cachedItem.data;
          } catch (e) {
            console.warn('Failed to parse expired cache:', e);
          }
        }
      }
      
      // Re-throw the error if we can't recover
      throw error;
    }
  };

/**
 * Hook to determine if a request should use cache based on network status
 */
export function useShouldUseCache() {
  const isOnline = useIsOnline();
  const isNative = useIsNative();
  
  // Always use cache for mobile apps, and when offline
  return !isOnline || isNative;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ 
        on401: "throw",
        useCache: true,
        cacheDuration: 10 * 60 * 1000 // 10 minutes
      }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
