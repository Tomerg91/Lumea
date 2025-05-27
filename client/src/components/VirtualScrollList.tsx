import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '../lib/utils';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  isLoading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
}

const VirtualScrollList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  isLoading = false,
  loadingComponent,
  emptyComponent,
  getItemKey = (_, index) => index,
}: VirtualScrollListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length
    );
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = visibleRange.start * itemHeight;

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Optimized scroll handler using RAF
  const rafId = useRef<number>();
  const handleScrollOptimized = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    
    rafId.current = requestAnimationFrame(() => {
      handleScroll(e);
    });
  }, [handleScroll]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (scrollElementRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollElementRef.current.scrollTo({
        top: targetScrollTop,
        behavior,
      });
    }
  }, [itemHeight]);

  // Scroll to top
  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollToIndex(0, behavior);
  }, [scrollToIndex]);

  // Handle touch events for momentum scrolling on iOS
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Prevent momentum scrolling issues on iOS
    if (scrollElementRef.current) {
      const scrollElement = scrollElementRef.current;
      if (scrollElement.scrollTop === 0) {
        scrollElement.scrollTop = 1;
      } else if (scrollElement.scrollTop + scrollElement.offsetHeight >= scrollElement.scrollHeight) {
        scrollElement.scrollTop = scrollElement.scrollHeight - scrollElement.offsetHeight - 1;
      }
    }
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        {emptyComponent || (
          <div className="text-center text-gray-500">
            <p>No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn(
        'overflow-auto',
        // Mobile optimizations
        'scroll-smooth',
        '-webkit-overflow-scrolling-touch', // iOS momentum scrolling
        className
      )}
      style={{ height: containerHeight }}
      onScroll={handleScrollOptimized}
      onTouchStart={handleTouchStart}
    >
      {/* Total height container */}
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={getItemKey(item, index)}
              style={{
                height: itemHeight,
                overflow: 'hidden',
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div 
            className="absolute inset-x-0 bottom-0 flex justify-center p-4"
            style={{
              transform: `translateY(${totalHeight}px)`,
            }}
          >
            {loadingComponent || (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Intersection Observer based infinite scroll component
interface InfiniteScrollListProps<T> extends Omit<VirtualScrollListProps<T>, 'containerHeight'> {
  hasMore: boolean;
  loadMore: () => void;
  threshold?: number;
  rootMargin?: string;
}

export const InfiniteScrollList = <T,>({
  hasMore,
  loadMore,
  threshold = 0.8,
  rootMargin = '100px',
  ...virtualListProps
}: InfiniteScrollListProps<T>) => {
  const [containerHeight, setContainerHeight] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Measure container height
  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      setContainerHeight(height);
    }
  }, []);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !virtualListProps.isLoading) {
          loadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore, threshold, rootMargin, virtualListProps.isLoading]);

  return (
    <div ref={containerRef} className="h-full">
      <VirtualScrollList
        {...virtualListProps}
        containerHeight={containerHeight}
      />
      
      {/* Sentinel for infinite scroll */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="h-px"
          style={{
            position: 'absolute',
            bottom: '100px',
            left: 0,
            right: 0,
          }}
        />
      )}
    </div>
  );
};

// Mobile-optimized session list with virtual scrolling
interface MobileSessionListProps {
  sessions: any[];
  onSessionClick: (session: any) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  loadMore?: () => void;
}

export const MobileVirtualSessionList: React.FC<MobileSessionListProps> = ({
  sessions,
  onSessionClick,
  isLoading = false,
  hasMore = false,
  loadMore,
}) => {
  const renderSessionItem = useCallback((session: any, index: number) => (
    <div
      className="flex items-center p-4 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
      onClick={() => onSessionClick(session)}
    >
      {/* Session avatar/icon */}
      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
        <span className="text-purple-600 font-medium">
          {session.client?.name?.charAt(0) || 'S'}
        </span>
      </div>
      
      {/* Session content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {session.client?.name || 'Unknown Client'}
          </h3>
          <span className={cn(
            'px-2 py-1 text-xs rounded-full flex-shrink-0 ml-2',
            session.status === 'completed' && 'bg-green-100 text-green-800',
            session.status === 'pending' && 'bg-amber-100 text-amber-800',
            session.status === 'cancelled' && 'bg-red-100 text-red-800'
          )}>
            {session.status}
          </span>
        </div>
        
        <p className="text-xs text-gray-500 mt-1">
          {new Date(session.scheduledAt).toLocaleDateString()}
        </p>
        
        {session.notes && (
          <p className="text-xs text-gray-600 mt-1 truncate">
            {session.notes}
          </p>
        )}
      </div>
    </div>
  ), [onSessionClick]);

  if (hasMore && loadMore) {
    return (
      <InfiniteScrollList
        items={sessions}
        itemHeight={80}
        renderItem={renderSessionItem}
        isLoading={isLoading}
        hasMore={hasMore}
        loadMore={loadMore}
        className="w-full"
        getItemKey={(session) => session.id}
      />
    );
  }

  return (
    <VirtualScrollList
      items={sessions}
      itemHeight={80}
      containerHeight={600}
      renderItem={renderSessionItem}
      isLoading={isLoading}
      className="w-full"
      getItemKey={(session) => session.id}
    />
  );
};

export default VirtualScrollList; 