import React from 'react';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Download
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

// Base Loading Skeleton Component (Extended from SessionLoadingStates)
interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'rectangle' | 'circle' | 'rounded' | 'button' | 'badge' | 'avatar';
  lines?: number;
  className?: string;
  animate?: boolean;
  delay?: number; // For staggered animations
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 16,
  variant = 'rectangle',
  lines = 1,
  className = '',
  animate = true,
  delay = 0,
}) => {
  const baseClasses = cn(
    'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
    animate && 'animate-pulse',
    variant === 'circle' && 'rounded-full',
    variant === 'rounded' && 'rounded-lg',
    variant === 'rectangle' && 'rounded',
    variant === 'button' && 'rounded-xl',
    variant === 'badge' && 'rounded-full',
    variant === 'avatar' && 'rounded-full',
    className
  );

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={baseClasses}
            style={{
              width: index === lines - 1 ? '75%' : width,
              height,
              animationDelay: `${delay + index * 100}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      style={{ 
        width, 
        height,
        animationDelay: `${delay}ms` 
      }}
    />
  );
};

// Spinner Component
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
  label = 'Loading...',
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    primary: 'text-blue-500',
    secondary: 'text-gray-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 
        className={cn(
          'animate-spin',
          sizeClasses[size],
          colorClasses[color]
        )}
        aria-label={label}
      />
    </div>
  );
};

// Progress Bar Component
interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  showPercentage?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showPercentage = true,
  label,
  className = '',
  animated = true,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    primary: 'bg-blue-500',
    secondary: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            animated && 'transition-transform',
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
};

// Button Loading States
interface LoadingButtonProps {
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
  onClick?: () => void;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = false,
  disabled = false,
  size = 'md',
  variant = 'primary',
  children,
  className = '',
  loadingText = 'Loading...',
  onClick,
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-transparent',
    outline: 'bg-transparent hover:bg-gray-50 text-gray-900 border-gray-300',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-900 border-transparent',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium border transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {isLoading ? loadingText : children}
    </button>
  );
};

// Dashboard Stats Card Loading
export const StatsCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn(
    'bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg',
    className
  )}>
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <LoadingSkeleton width="60%" height={16} />
        <LoadingSkeleton width="40%" height={32} />
      </div>
      <LoadingSkeleton variant="circle" width={48} height={48} />
    </div>
  </div>
);

// Quick Action Card Loading
export const QuickActionCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn(
    'bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200',
    className
  )}>
    <div className="flex items-center gap-4">
      <LoadingSkeleton variant="circle" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton width="70%" height={16} />
        <LoadingSkeleton width="90%" height={14} />
      </div>
      <LoadingSkeleton variant="circle" width={20} height={20} />
    </div>
  </div>
);

// Form Loading States
export const FormFieldSkeleton: React.FC<{ 
  label?: boolean;
  className?: string;
}> = ({ label = true, className }) => (
  <div className={cn('space-y-2', className)}>
    {label && <LoadingSkeleton width="30%" height={16} />}
    <LoadingSkeleton height={40} variant="rounded" />
  </div>
);

// Table Loading States
export const TableRowSkeleton: React.FC<{ 
  columns?: number;
  className?: string;
}> = ({ columns = 4, className }) => (
  <tr className={className}>
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <LoadingSkeleton height={16} delay={index * 50} />
      </td>
    ))}
  </tr>
);

// Network Status Component
interface NetworkStatusProps {
  isOnline?: boolean;
  isConnecting?: boolean;
  className?: string;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  isOnline = true,
  isConnecting = false,
  className,
}) => {
  const { t } = useLanguage();

  if (isConnecting) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200',
        className
      )}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t('network.connecting', 'Connecting...')}</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 bg-red-50 text-red-800 rounded-lg border border-red-200',
        className
      )}>
        <WifiOff className="w-4 h-4" />
        <span className="text-sm">{t('network.offline', 'No internet connection')}</span>
      </div>
    );
  }

  return null;
};

// Status Indicators
interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'warning';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const statusConfig = {
    loading: {
      icon: <Loader2 className={cn('animate-spin', sizeClasses[size])} />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    success: {
      icon: <CheckCircle className={sizeClasses[size]} />,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    error: {
      icon: <AlertCircle className={sizeClasses[size]} />,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    warning: {
      icon: <AlertCircle className={sizeClasses[size]} />,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border',
      config.bgColor,
      config.borderColor,
      className
    )}>
      <span className={config.color}>{config.icon}</span>
      {message && (
        <span className={cn('text-sm font-medium', config.color)}>
          {message}
        </span>
      )}
    </div>
  );
};

// Page Loading Overlay
interface PageLoadingProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  isLoading,
  message = 'Loading...',
  progress,
  className,
}) => {
  if (!isLoading) return null;

  return (
    <div className={cn(
      'fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center',
      className
    )}>
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-white/20 max-w-sm w-full mx-4">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">{message}</p>
          {progress !== undefined && (
            <ProgressBar 
              value={progress} 
              className="mt-4" 
              showPercentage 
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Export all components for easy importing
export {
  // From SessionLoadingStates (re-export for consistency)
  SessionCardSkeleton,
  SessionsListSkeleton,
  CalendarSkeleton,
  NoSessionsEmptyState,
  NoSearchResultsEmptyState,
  ErrorEmptyState,
  SessionStatusUpdateLoader,
  SessionTypeIcon,
} from './SessionLoadingStates'; 