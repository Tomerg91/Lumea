import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  overscan?: number; // Number of items to render outside visible area
  loadMoreThreshold?: number; // Distance from bottom to trigger loadMore
  onLoadMore?: () => void;
  loading?: boolean;
  hasMore?: boolean;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight = 400,
  renderItem,
  className = '',
  onScroll,
  overscan = 3,
  loadMoreThreshold = 200,
  onLoadMore,
  loading = false,
  hasMore = false,
  getItemKey
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      key: getItemKey ? getItemKey(item, startIndex + index) : startIndex + index
    }));
  }, [items, visibleRange, getItemKey]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = visibleRange.startIndex * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    onScroll?.(scrollTop);

    // Check if we need to load more
    if (onLoadMore && hasMore && !loading) {
      const scrollBottom = scrollTop + containerHeight;
      const distanceFromBottom = totalHeight - scrollBottom;
      
      if (distanceFromBottom < loadMoreThreshold) {
        onLoadMore();
      }
    }
  }, [onScroll, onLoadMore, hasMore, loading, containerHeight, totalHeight, loadMoreThreshold]);

  // Scroll to item
  const scrollToItem = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight;
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior
      });
    }
  }, [itemHeight]);

  // Expose scroll methods via ref
  const scrollMethods = useMemo(() => ({
    scrollToItem,
    scrollToTop: () => scrollToItem(0),
    scrollToBottom: () => scrollToItem(items.length - 1)
  }), [scrollToItem, items.length]);

  // Update parent component about scroll methods
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).scrollMethods = scrollMethods;
    }
  }, [scrollMethods]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index, key }) => (
            <div
              key={key}
              style={{
                height: itemHeight,
                overflow: 'hidden'
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
        
        {/* Loading indicator */}
        {loading && (
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.9)'
            }}
          >
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Loading more...</span>
            </div>
          </div>
        )}

        {/* End of list indicator */}
        {!hasMore && items.length > 0 && (
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              fontSize: '14px'
            }}
          >
            End of list
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for using virtual scroll list
export function useVirtualScrollList<T>(initialItems: T[] = []) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const addItems = useCallback((newItems: T[]) => {
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const prependItems = useCallback((newItems: T[]) => {
    setItems(prev => [...newItems, ...prev]);
  }, []);

  const updateItem = useCallback((index: number, updatedItem: T) => {
    setItems(prev => prev.map((item, i) => i === index ? updatedItem : item));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback((newItems: T[] = []) => {
    setItems(newItems);
    setHasMore(true);
  }, []);

  return {
    items,
    setItems,
    loading,
    setLoading,
    hasMore,
    setHasMore,
    addItems,
    prependItems,
    updateItem,
    removeItem,
    reset
  };
} 