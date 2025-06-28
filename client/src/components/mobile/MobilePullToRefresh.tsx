import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobilePullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export const MobilePullToRefresh: React.FC<MobilePullToRefreshProps> = ({
  onRefresh,
  children,
  className,
  threshold = 80,
  maxPullDistance = 120,
  disabled = false
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only start pull-to-refresh if we're at the top of the scroll
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
      setIsPulling(true);
      
      // Light haptic feedback for touch start
      if ('vibrate' in navigator) {
        navigator.vibrate(5);
      }
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      // Prevent default scroll behavior when pulling down
      e.preventDefault();
      
      // Apply resistance curve for natural feel
      const resistance = Math.min(diff * 0.5, maxPullDistance);
      setPullDistance(resistance);
      
      // Haptic feedback at threshold
      if (resistance >= threshold && pullDistance < threshold && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    }
  }, [disabled, isRefreshing, threshold, maxPullDistance, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    setIsPulling(false);
    
    if (pullDistance >= threshold && !disabled && !isRefreshing) {
      setIsRefreshing(true);
      
      // Strong haptic feedback for refresh trigger
      if ('vibrate' in navigator) {
        navigator.vibrate([25, 50, 25]);
      }
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Animate back to original position
      setPullDistance(0);
    }
  }, [pullDistance, threshold, disabled, isRefreshing, onRefresh]);

  const refreshProgress = Math.min(pullDistance / threshold, 1);
  const isTriggered = pullDistance >= threshold;

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isPulling || isRefreshing ? `translateY(${Math.min(pullDistance * 0.3, 40)}px)` : 'none',
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'bg-gradient-to-b from-blue-50/90 to-transparent backdrop-blur-sm',
          'transition-all duration-300 ease-out',
          'z-10'
        )}
        style={{
          height: `${Math.max(pullDistance * 0.8, 0)}px`,
          opacity: isPulling || isRefreshing ? 1 : 0,
          transform: `translateY(-${Math.max(60 - pullDistance * 0.5, 0)}px)`
        }}
      >
        <div className="flex flex-col items-center gap-2 py-4">
          {/* Refresh icon */}
          <div 
            className={cn(
              'p-2 rounded-full transition-all duration-200',
              isTriggered 
                ? 'bg-blue-500 text-white shadow-lg scale-110' 
                : 'bg-white/90 text-blue-500 shadow-md',
              isRefreshing && 'animate-spin'
            )}
            style={{
              transform: `rotate(${refreshProgress * 180}deg) ${isTriggered ? 'scale(1.1)' : 'scale(1)'}`
            }}
          >
            {isRefreshing ? (
              <RefreshCw className="w-5 h-5" />
            ) : isTriggered ? (
              <RefreshCw className="w-5 h-5" />
            ) : (
              <ArrowDown className="w-5 h-5" />
            )}
          </div>
          
          {/* Progress indicator */}
          <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full transition-all duration-200 rounded-full',
                isTriggered ? 'bg-blue-500' : 'bg-blue-300'
              )}
              style={{ width: `${refreshProgress * 100}%` }}
            />
          </div>
          
          {/* Status text */}
          <span className={cn(
            'text-xs font-medium transition-colors duration-200',
            isTriggered ? 'text-blue-600' : 'text-gray-500'
          )}>
            {isRefreshing 
              ? 'Refreshing...' 
              : isTriggered 
                ? 'Release to refresh' 
                : 'Pull to refresh'
            }
          </span>
        </div>
      </div>
      
      {children}
    </div>
  );
};

// Hook for managing pull-to-refresh state
export const usePullToRefresh = (refreshFn: () => Promise<void>) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshFn();
    } catch (error) {
      console.error('Pull-to-refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFn, isRefreshing]);
  
  return {
    isRefreshing,
    handleRefresh
  };
};

export default MobilePullToRefresh;