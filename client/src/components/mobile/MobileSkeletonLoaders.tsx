import React from 'react';
import { cn } from '../../lib/utils';

// Mobile-optimized skeleton loading patterns for touch-friendly interfaces

interface MobileSkeletonProps {
  className?: string;
}

// Enhanced mobile session card skeleton with touch-friendly spacing
export const MobileSessionCardSkeleton: React.FC<MobileSkeletonProps> = ({ className }) => {
  return (
    <div className={cn(
      'bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden',
      'animate-pulse',
      className
    )}>
      {/* Status accent bar */}
      <div className="h-1 w-full bg-gray-200/70" />
      
      <div className="p-4">
        {/* Header Row - larger touch targets for mobile */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {/* Icon placeholder */}
              <div className="w-8 h-8 rounded-lg bg-gray-200/70" />
              {/* Name placeholder - wider for mobile readability */}
              <div className="h-5 bg-gray-200/70 rounded-lg w-32" />
            </div>
            
            {/* Date/Time info - larger spacing for mobile */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200/70" />
                <div className="h-4 bg-gray-200/70 rounded w-20" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200/70" />
                <div className="h-4 bg-gray-200/70 rounded w-16" />
              </div>
            </div>
          </div>
          
          {/* Status badge */}
          <div className="w-20 h-6 bg-gray-200/70 rounded-full" />
        </div>
        
        {/* Session details */}
        <div className="space-y-3">
          <div className="h-4 bg-gray-200/70 rounded w-3/4" />
          <div className="flex gap-2">
            <div className="h-3 bg-gray-200/70 rounded flex-1" />
            <div className="h-3 bg-gray-200/70 rounded w-12" />
          </div>
        </div>
        
        {/* Action buttons - mobile-optimized spacing */}
        <div className="flex gap-3 mt-4">
          <div className="h-10 bg-gray-200/70 rounded-xl flex-1" />
          <div className="h-10 w-10 bg-gray-200/70 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

// Mobile list skeleton with pull-to-refresh indicator
export const MobileListSkeleton: React.FC<MobileSkeletonProps & { 
  count?: number;
  showPullIndicator?: boolean;
}> = ({ className, count = 3, showPullIndicator = false }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Pull-to-refresh indicator */}
      {showPullIndicator && (
        <div className="flex justify-center py-4">
          <div className="w-8 h-8 rounded-full bg-gray-200/70 animate-pulse" />
        </div>
      )}
      
      {/* Session cards */}
      {Array.from({ length: count }).map((_, index) => (
        <MobileSessionCardSkeleton 
          key={index}
          className="animate-pulse"
          style={{
            animationDelay: `${index * 100}ms`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

// Mobile navigation skeleton
export const MobileNavigationSkeleton: React.FC<MobileSkeletonProps> = ({ className }) => {
  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200/50',
      'animate-pulse',
      className
    )}>
      <div className="flex justify-around items-center py-3 px-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 bg-gray-200/70 rounded" />
            <div className="w-12 h-3 bg-gray-200/70 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Mobile header skeleton
export const MobileHeaderSkeleton: React.FC<MobileSkeletonProps> = ({ className }) => {
  return (
    <div className={cn(
      'flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm',
      'animate-pulse',
      className
    )}>
      {/* Menu/Back button */}
      <div className="w-10 h-10 bg-gray-200/70 rounded-xl" />
      
      {/* Title */}
      <div className="h-6 bg-gray-200/70 rounded-lg w-32" />
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <div className="w-10 h-10 bg-gray-200/70 rounded-xl" />
        <div className="w-10 h-10 bg-gray-200/70 rounded-xl" />
      </div>
    </div>
  );
};

// Mobile form skeleton
export const MobileFormSkeleton: React.FC<MobileSkeletonProps> = ({ className }) => {
  return (
    <div className={cn('space-y-6 p-4', className)}>
      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200/70 rounded w-24" />
          <div className="h-12 bg-gray-200/70 rounded-xl w-full" />
        </div>
      ))}
      
      {/* Submit button */}
      <div className="h-12 bg-gray-200/70 rounded-xl w-full animate-pulse mt-8" />
    </div>
  );
};

// Mobile floating action button skeleton
export const MobileFABSkeleton: React.FC<MobileSkeletonProps> = ({ className }) => {
  return (
    <div className={cn(
      'fixed bottom-6 right-6 w-14 h-14 bg-gray-200/70 rounded-full',
      'animate-pulse shadow-lg',
      className
    )} />
  );
};

// Loading overlay for mobile interactions
export const MobileLoadingOverlay: React.FC<{
  show: boolean;
  message?: string;
  className?: string;
}> = ({ show, message = 'Loading...', className }) => {
  if (!show) return null;
  
  return (
    <div className={cn(
      'fixed inset-0 bg-black/50 backdrop-blur-sm z-50',
      'flex items-center justify-center',
      className
    )}>
      <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

// Progressive enhancement for mobile skeleton loading
export const useMobileSkeletonLoader = (isLoading: boolean, delay = 300) => {
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoading) {
      // Delay skeleton appearance to prevent flash for quick loads
      timer = setTimeout(() => setShowSkeleton(true), delay);
    } else {
      setShowSkeleton(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, delay]);
  
  return showSkeleton;
};

export default {
  MobileSessionCardSkeleton,
  MobileListSkeleton,
  MobileNavigationSkeleton,
  MobileHeaderSkeleton,
  MobileFormSkeleton,
  MobileFABSkeleton,
  MobileLoadingOverlay,
  useMobileSkeletonLoader
};