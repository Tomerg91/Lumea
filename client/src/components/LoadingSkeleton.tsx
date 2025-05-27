import React from 'react';
import { cn } from '../lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rectangle' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
  animate = true
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'rectangle':
        return 'rounded-none';
      case 'rounded':
        return 'rounded-lg';
      default:
        return 'rounded';
    }
  };

  const getDefaultDimensions = () => {
    switch (variant) {
      case 'circle':
        return { width: '40px', height: '40px' };
      case 'text':
        return { width: '100%', height: '16px' };
      default:
        return { width: '100%', height: '20px' };
    }
  };

  const dimensions = {
    width: width || getDefaultDimensions().width,
    height: height || getDefaultDimensions().height,
  };

  const baseClasses = cn(
    'bg-gray-200 dark:bg-gray-700',
    getVariantClasses(),
    animate && 'animate-pulse',
    className
  );

  // For text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              index === lines - 1 && 'w-3/4' // Last line is shorter
            )}
            style={{
              width: index === lines - 1 ? '75%' : dimensions.width,
              height: dimensions.height,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      style={dimensions}
    />
  );
};

// Session List Skeleton
export const SessionListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          {/* Avatar skeleton */}
          <LoadingSkeleton variant="circle" width={48} height={48} />
          
          <div className="flex-1 space-y-2">
            {/* Client name */}
            <LoadingSkeleton width="40%" height={16} />
            
            {/* Session date */}
            <LoadingSkeleton width="25%" height={14} />
          </div>
          
          {/* Status indicator */}
          <LoadingSkeleton variant="rounded" width={80} height={24} />
        </div>
        
        {/* Session notes preview */}
        <div className="mt-3">
          <LoadingSkeleton lines={2} height={14} />
        </div>
      </div>
    ))}
  </div>
);

// Reflection Form Skeleton
export const ReflectionFormSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <LoadingSkeleton width="60%" height={24} />
      <LoadingSkeleton width="40%" height={16} />
    </div>
    
    {/* Form fields */}
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="space-y-2">
        <LoadingSkeleton width="30%" height={16} />
        <LoadingSkeleton variant="rounded" height={120} />
      </div>
    ))}
    
    {/* Action buttons */}
    <div className="flex space-x-3">
      <LoadingSkeleton variant="rounded" width={100} height={40} />
      <LoadingSkeleton variant="rounded" width={120} height={40} />
    </div>
  </div>
);

// Notification List Skeleton
export const NotificationListSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-start space-x-3 p-3 border-b border-gray-100">
        {/* Icon */}
        <LoadingSkeleton variant="circle" width={32} height={32} />
        
        <div className="flex-1 space-y-1">
          {/* Title */}
          <LoadingSkeleton width="70%" height={16} />
          
          {/* Description */}
          <LoadingSkeleton width="90%" height={14} />
          
          {/* Timestamp */}
          <LoadingSkeleton width="25%" height={12} />
        </div>
        
        {/* Priority indicator */}
        <LoadingSkeleton variant="circle" width={8} height={8} />
      </div>
    ))}
  </div>
);

// Dashboard Card Skeleton
export const DashboardCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-4">
      <LoadingSkeleton width="40%" height={20} />
      <LoadingSkeleton variant="circle" width={32} height={32} />
    </div>
    
    <div className="space-y-3">
      <LoadingSkeleton width="25%" height={32} />
      <LoadingSkeleton width="60%" height={14} />
    </div>
  </div>
);

// Audio Player Skeleton
export const AudioPlayerSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center space-x-3">
      {/* Play button */}
      <LoadingSkeleton variant="circle" width={48} height={48} />
      
      <div className="flex-1 space-y-2">
        {/* Waveform */}
        <div className="flex items-center space-x-1 h-8">
          {Array.from({ length: 24 }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              variant="rectangle"
              width={3}
              height={Math.random() * 24 + 8}
            />
          ))}
        </div>
        
        {/* Time display */}
        <div className="flex justify-between">
          <LoadingSkeleton width="15%" height={12} />
          <LoadingSkeleton width="15%" height={12} />
        </div>
      </div>
    </div>
  </div>
);

// Mobile-optimized Content Skeleton
export const MobileContentSkeleton: React.FC<{ type?: 'list' | 'detail' | 'form' | 'grid' }> = ({ 
  type = 'list' 
}) => {
  switch (type) {
    case 'detail':
      return (
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <LoadingSkeleton width="80%" height={28} />
            <LoadingSkeleton width="60%" height={16} />
          </div>
          
          {/* Content sections */}
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <LoadingSkeleton width="40%" height={18} />
              <LoadingSkeleton lines={3} height={16} />
            </div>
          ))}
          
          {/* Action bar */}
          <div className="flex space-x-3 pt-4">
            <LoadingSkeleton variant="rounded" width="48%" height={44} />
            <LoadingSkeleton variant="rounded" width="48%" height={44} />
          </div>
        </div>
      );
      
    case 'form':
      return <ReflectionFormSkeleton />;
      
    case 'grid':
      return (
        <div className="grid grid-cols-2 gap-4 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <DashboardCardSkeleton key={index} />
          ))}
        </div>
      );
      
    default:
      return <SessionListSkeleton />;
  }
};

// Performance-optimized skeleton that adapts to connection speed
export const AdaptiveSkeleton: React.FC<{
  isSlowConnection?: boolean;
  children: React.ReactNode;
}> = ({ isSlowConnection = false, children }) => {
  if (isSlowConnection) {
    // Simplified skeleton for slow connections
    return (
      <div className="p-4 space-y-4">
        <LoadingSkeleton width="60%" height={20} animate={false} />
        <LoadingSkeleton width="100%" height={16} animate={false} />
        <LoadingSkeleton width="80%" height={16} animate={false} />
      </div>
    );
  }
  
  return <>{children}</>;
};

export default LoadingSkeleton; 