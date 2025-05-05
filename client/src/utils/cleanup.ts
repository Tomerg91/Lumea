/**
 * Creates an AbortController and returns its signal
 * Automatically aborts when the component unmounts
 * 
 * @returns AbortSignal to pass to fetch or other APIs
 * 
 * @example
 * function MyComponent() {
 *   const abortSignal = useAbortSignal();
 *   
 *   useEffect(() => {
 *     fetch('/api/data', { signal: abortSignal })
 *       .then(res => res.json())
 *       .then(data => setData(data))
 *       .catch(err => {
 *         // AbortError is expected when component unmounts
 *         if (err.name !== 'AbortError') {
 *           console.error(err);
 *         }
 *       });
 *   }, [abortSignal]);
 *   
 *   return <div>...</div>;
 * }
 */
import { useEffect, useRef } from 'react';

export function useAbortSignal(): AbortSignal {
  const abortControllerRef = useRef<AbortController>(new AbortController());
  
  useEffect(() => {
    const controller = abortControllerRef.current;
    return () => {
      controller.abort();
    };
  }, []);
  
  return abortControllerRef.current.signal;
}

/**
 * Creates a cleanup function registry that automatically runs all cleanup functions
 * when the component unmounts
 * 
 * @returns An object with register and cleanup methods
 * 
 * @example
 * function MyComponent() {
 *   const cleanup = useCleanup();
 *   
 *   useEffect(() => {
 *     const timer = setTimeout(() => {
 *       // Do something
 *     }, 1000);
 *     
 *     cleanup.register(() => clearTimeout(timer));
 *     
 *     const subscription = someObservable.subscribe();
 *     cleanup.register(() => subscription.unsubscribe());
 *     
 *     // No need for return function in this useEffect
 *   }, [cleanup]);
 *   
 *   return <div>...</div>;
 * }
 */
export function useCleanup() {
  const cleanupFunctions = useRef<(() => void)[]>([]);
  
  useEffect(() => {
    return () => {
      // Run all cleanup functions when component unmounts
      cleanupFunctions.current.forEach(fn => {
        try {
          fn();
        } catch (err) {
          console.error('Error in cleanup function:', err);
        }
      });
      // Clear the array
      cleanupFunctions.current = [];
    };
  }, []);
  
  return {
    /**
     * Register a function to be called when the component unmounts
     */
    register: (fn: () => void) => {
      cleanupFunctions.current.push(fn);
    },
    
    /**
     * Manually run all cleanup functions and clear the registry
     */
    cleanup: () => {
      cleanupFunctions.current.forEach(fn => {
        try {
          fn();
        } catch (err) {
          console.error('Error in cleanup function:', err);
        }
      });
      cleanupFunctions.current = [];
    }
  };
}

/**
 * Safe wrapper for setTimeout that automatically clears the timeout
 * when the component unmounts
 * 
 * @param callback Function to call after the timeout
 * @param delay Delay in milliseconds
 * @returns An object with clear method
 * 
 * @example
 * function MyComponent() {
 *   const [data, setData] = useState(null);
 *   
 *   useEffect(() => {
 *     const timer = useSafeTimeout(() => {
 *       setData('Loaded after delay');
 *     }, 2000);
 *     
 *     // No need to return a cleanup function
 *   }, []);
 *   
 *   return <div>{data || 'Loading...'}</div>;
 * }
 */
export function useSafeTimeout() {
  const timeoutIds = useRef<number[]>([]);
  
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      timeoutIds.current.forEach(id => window.clearTimeout(id));
      timeoutIds.current = [];
    };
  }, []);
  
  const safeSetTimeout = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      // Remove this id from the registry once it's executed
      timeoutIds.current = timeoutIds.current.filter(i => i !== id);
      callback();
    }, delay);
    
    // Register the timeout id
    timeoutIds.current.push(id);
    
    return {
      clear: () => {
        window.clearTimeout(id);
        timeoutIds.current = timeoutIds.current.filter(i => i !== id);
      }
    };
  };
  
  return safeSetTimeout;
}

/**
 * Safe wrapper for setInterval that automatically clears the interval
 * when the component unmounts
 * 
 * @returns A function to create intervals that clean themselves up
 * 
 * @example
 * function MyComponent() {
 *   const [count, setCount] = useState(0);
 *   const safeSetInterval = useSafeInterval();
 *   
 *   useEffect(() => {
 *     const interval = safeSetInterval(() => {
 *       setCount(c => c + 1);
 *     }, 1000);
 *     
 *     // Can clear manually if needed
 *     // setTimeout(() => interval.clear(), 10000);
 *   }, [safeSetInterval]);
 *   
 *   return <div>Count: {count}</div>;
 * }
 */
export function useSafeInterval() {
  const intervalIds = useRef<number[]>([]);
  
  useEffect(() => {
    return () => {
      // Clear all intervals when component unmounts
      intervalIds.current.forEach(id => window.clearInterval(id));
      intervalIds.current = [];
    };
  }, []);
  
  const safeSetInterval = (callback: () => void, delay: number) => {
    const id = window.setInterval(callback, delay);
    
    // Register the interval id
    intervalIds.current.push(id);
    
    return {
      clear: () => {
        window.clearInterval(id);
        intervalIds.current = intervalIds.current.filter(i => i !== id);
      }
    };
  };
  
  return safeSetInterval;
} 