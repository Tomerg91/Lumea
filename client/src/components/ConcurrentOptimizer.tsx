import React, { startTransition, useTransition, useDeferredValue, memo } from 'react';
import { Suspense } from 'react';

/**
 * React 19 Concurrent Features Optimizer
 * Implements modern concurrent patterns for optimal performance
 */

// Optimized transition wrapper for non-urgent updates
export const useOptimizedTransition = () => {
  const [isPending, startTransition] = useTransition();
  
  const runNonUrgentUpdate = (callback: () => void) => {
    startTransition(callback);
  };
  
  return { isPending, runNonUrgentUpdate };
};

// Enhanced deferred value hook with fallback
export const useDeferredSearch = (searchQuery: string, fallback = '') => {
  const deferredQuery = useDeferredValue(searchQuery);
  return searchQuery !== deferredQuery ? fallback : deferredQuery;
};

// Concurrent component wrapper for heavy renders
interface ConcurrentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  priority?: 'high' | 'normal' | 'low';
}

export const ConcurrentWrapper = memo(({ 
  children, 
  fallback = <div>Loading...</div>,
  priority = 'normal' 
}: ConcurrentWrapperProps) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
});

// Optimized search component using concurrent features
interface ConcurrentSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  results?: React.ReactNode;
  isLoading?: boolean;
}

export const ConcurrentSearch = memo(({ 
  onSearch, 
  placeholder = "Search...", 
  results,
  isLoading 
}: ConcurrentSearchProps) => {
  const [searchInput, setSearchInput] = React.useState('');
  const { isPending, runNonUrgentUpdate } = useOptimizedTransition();
  const deferredQuery = useDeferredValue(searchInput);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Urgent: Update input immediately for responsive UI
    setSearchInput(value);
    
    // Non-urgent: Update search results
    runNonUrgentUpdate(() => {
      onSearch(value);
    });
  };
  
  return (
    <div className="relative">
      <input
        type="text"
        value={searchInput}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      
      {(isPending || isLoading) && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      <ConcurrentWrapper
        fallback={
          <div className="mt-2 p-4 text-center text-gray-500">
            Searching...
          </div>
        }
      >
        <div className="mt-2">
          {results}
        </div>
      </ConcurrentWrapper>
    </div>
  );
});

// Performance monitor component using React 19 features
export const PerformanceMonitor = memo(() => {
  const [metrics, setMetrics] = React.useState<{
    renderTime: number;
    updateCount: number;
  }>({ renderTime: 0, updateCount: 0 });
  
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      setMetrics(prev => ({
        renderTime: endTime - startTime,
        updateCount: prev.updateCount + 1
      }));
    };
  });
  
  if (import.meta.env.DEV) {
    return (
      <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs">
        Render: {metrics.renderTime.toFixed(2)}ms | Updates: {metrics.updateCount}
      </div>
    );
  }
  
  return null;
});

// Optimized list renderer using concurrent features
interface ConcurrentListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  pageSize?: number;
  loading?: boolean;
}

export function ConcurrentList<T>({
  items,
  renderItem,
  keyExtractor,
  pageSize = 20,
  loading = false
}: ConcurrentListProps<T>) {
  const [displayCount, setDisplayCount] = React.useState(pageSize);
  const { isPending, runNonUrgentUpdate } = useOptimizedTransition();
  
  const displayedItems = React.useMemo(
    () => items.slice(0, displayCount),
    [items, displayCount]
  );
  
  const loadMore = React.useCallback(() => {
    runNonUrgentUpdate(() => {
      setDisplayCount(prev => Math.min(prev + pageSize, items.length));
    });
  }, [items.length, pageSize, runNonUrgentUpdate]);
  
  return (
    <div>
      <ConcurrentWrapper
        fallback={
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        }
      >
        <div className="space-y-2">
          {displayedItems.map((item, index) => (
            <div key={keyExtractor(item, index)}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </ConcurrentWrapper>
      
      {displayCount < items.length && (
        <button
          onClick={loadMore}
          disabled={isPending || loading}
          className="mt-4 w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isPending || loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

ConcurrentWrapper.displayName = 'ConcurrentWrapper';
ConcurrentSearch.displayName = 'ConcurrentSearch';
PerformanceMonitor.displayName = 'PerformanceMonitor';