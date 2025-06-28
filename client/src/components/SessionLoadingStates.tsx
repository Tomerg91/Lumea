import React from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Search, 
  Plus, 
  Video, 
  Phone, 
  MapPin,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Filter,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

// Enhanced Loading Skeleton Component
interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'rectangle' | 'circle' | 'rounded';
  lines?: number;
  className?: string;
  animate?: boolean;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 16,
  variant = 'rectangle',
  lines = 1,
  className = '',
  animate = true,
}) => {
  const baseClasses = cn(
    'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
    animate && 'animate-pulse',
    variant === 'circle' && 'rounded-full',
    variant === 'rounded' && 'rounded-lg',
    variant === 'rectangle' && 'rounded',
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
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      style={{ width, height }}
    />
  );
};

// Session Card Loading Skeleton
export const SessionCardSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => {
  return (
    <div className={cn(
      'bg-white/90 backdrop-blur-sm border border-white/20 p-4 space-y-4',
      isMobile ? 'rounded-2xl shadow-lg' : 'rounded-xl shadow-md'
    )}>
      {/* Status accent bar for mobile */}
      {isMobile && (
        <div className="h-1 w-full bg-gray-200 rounded-full animate-pulse" />
      )}
      
      <div className="flex items-start gap-4">
        {/* Avatar/Type Icon */}
        <LoadingSkeleton
          variant="circle"
          width={isMobile ? 32 : 48}
          height={isMobile ? 32 : 48}
        />
        
        <div className="flex-1 space-y-2">
          {/* Client name */}
          <LoadingSkeleton width="60%" height={isMobile ? 18 : 20} />
          
          {/* Date and time */}
          <div className="flex items-center gap-4">
            <LoadingSkeleton width="80px" height={14} />
            <LoadingSkeleton width="60px" height={14} />
          </div>
          
          {/* Notes preview */}
          {!isMobile && (
            <LoadingSkeleton lines={2} height={14} />
          )}
        </div>
        
        {/* Status badge */}
        <LoadingSkeleton
          variant="rounded"
          width={isMobile ? 80 : 100}
          height={isMobile ? 24 : 28}
        />
      </div>
      
      {/* Mobile notes preview */}
      {isMobile && (
        <div className="pt-2 border-t border-gray-100">
          <LoadingSkeleton lines={2} height={14} />
        </div>
      )}
    </div>
  );
};

// Sessions List Loading State
export const SessionsListSkeleton: React.FC<{ 
  count?: number; 
  isMobile?: boolean;
  withGrouping?: boolean;
}> = ({ 
  count = 5, 
  isMobile = false,
  withGrouping = true 
}) => {
  const { t } = useLanguage();
  
  const groups = withGrouping ? [
    { title: t('sessions.today', 'Today'), count: 2 },
    { title: t('sessions.thisWeek', 'This Week'), count: 3 },
  ] : [{ title: '', count }];

  return (
    <div className={cn(
      'space-y-6',
      isMobile ? 'p-4 pb-24' : 'p-6'
    )}>
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-3">
          {/* Group title */}
          {withGrouping && group.title && (
            <div className="flex items-center justify-between px-2">
              <LoadingSkeleton width="120px" height={20} />
              <LoadingSkeleton variant="rounded" width="30px" height="20px" />
            </div>
          )}
          
          {/* Session cards */}
          <div className="space-y-3">
            {Array.from({ length: group.count }).map((_, index) => (
              <SessionCardSkeleton key={index} isMobile={isMobile} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Calendar Loading State
export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-6">
        <LoadingSkeleton width="150px" height={24} />
        <div className="flex gap-2">
          <LoadingSkeleton variant="circle" width={40} height={40} />
          <LoadingSkeleton variant="circle" width={40} height={40} />
        </div>
      </div>
      
      {/* Days of week */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <LoadingSkeleton key={index} height={20} />
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, index) => (
          <div key={index} className="aspect-square p-2">
            <LoadingSkeleton height="100%" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Mobile Search Filter Skeleton
export const MobileSearchFilterSkeleton: React.FC = () => {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
      <div className="p-4">
        <LoadingSkeleton height={44} className="rounded-xl" />
      </div>
    </div>
  );
};

// Enhanced Empty States
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  illustration?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  illustration,
  className = '',
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center p-8 min-h-[300px]',
      className
    )}>
      {/* Illustration or Icon */}
      {illustration || (
        <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl mb-6 flex items-center justify-center">
          {icon || <Calendar className="w-12 h-12 text-white" />}
        </div>
      )}
      
      {/* Title */}
      <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 mb-6 max-w-md leading-relaxed">
        {description}
      </p>
      
      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
        >
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  );
};

// Sessions Empty States
export const NoSessionsEmptyState: React.FC<{
  onCreateClick: () => void;
  isMobile?: boolean;
}> = ({ onCreateClick, isMobile = false }) => {
  const { t } = useLanguage();
  
  return (
    <EmptyState
      title={t('sessions.noSessionsYet', 'No sessions yet')}
      description={t('sessions.noSessionsMessage', 'Create your first session to get started with coaching.')}
      icon={<Calendar className="w-12 h-12 text-white" />}
      action={{
        label: t('sessions.createSession', 'Create Session'),
        onClick: onCreateClick,
        icon: <Plus className="w-5 h-5" />,
      }}
      className={isMobile ? 'min-h-[400px]' : 'min-h-[500px]'}
    />
  );
};

export const NoSearchResultsEmptyState: React.FC<{
  searchTerm?: string;
  onClearFilters?: () => void;
  onCreateClick?: () => void;
}> = ({ searchTerm, onClearFilters, onCreateClick }) => {
  const { t } = useLanguage();
  
  return (
    <EmptyState
      title={t('sessions.noSearchResults', 'No sessions found')}
      description={
        searchTerm
          ? t('sessions.noSearchResultsFor', `No sessions found for "${searchTerm}". Try adjusting your search or filters.`)
          : t('sessions.noSearchResultsFilters', 'No sessions match your current filters. Try adjusting your criteria.')
      }
      icon={<Search className="w-12 h-12 text-white" />}
      action={
        onClearFilters
          ? {
              label: t('sessions.clearFilters', 'Clear Filters'),
              onClick: onClearFilters,
              icon: <X className="w-5 h-5" />,
            }
          : onCreateClick
          ? {
              label: t('sessions.createSession', 'Create Session'),
              onClick: onCreateClick,
              icon: <Plus className="w-5 h-5" />,
            }
          : undefined
      }
    />
  );
};

export const ErrorEmptyState: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
  onCreateClick?: () => void;
}> = ({ 
  title, 
  description, 
  onRetry, 
  onCreateClick 
}) => {
  const { t } = useLanguage();
  
  return (
    <EmptyState
      title={title || t('sessions.errorTitle', 'Something went wrong')}
      description={description || t('sessions.errorDescription', 'We encountered an error loading your sessions. Please try again.')}
      icon={<AlertCircle className="w-12 h-12 text-white" />}
      action={
        onRetry
          ? {
              label: t('common.retry', 'Try Again'),
              onClick: onRetry,
              icon: <Sparkles className="w-5 h-5" />,
            }
          : onCreateClick
          ? {
              label: t('sessions.createSession', 'Create Session'),
              onClick: onCreateClick,
              icon: <Plus className="w-5 h-5" />,
            }
          : undefined
      }
    />
  );
};

// Enhanced Session Status Loading States
export const SessionStatusUpdateLoader: React.FC<{
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  message?: string;
}> = ({ status, message }) => {
  const { t } = useLanguage();
  
  const statusConfig = {
    pending: { color: 'text-amber-600', icon: Clock },
    'in-progress': { color: 'text-blue-600', icon: Sparkles },
    completed: { color: 'text-green-600', icon: CheckCircle },
    cancelled: { color: 'text-red-600', icon: XCircle },
  };
  
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  
  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
          <StatusIcon className={cn('w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2', config.color)} />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {message || t('sessions.updatingStatus', 'Updating status...')}
        </span>
      </div>
    </div>
  );
};

// Animated Session Type Icons for Loading States
export const SessionTypeIcon: React.FC<{
  type: 'video' | 'phone' | 'in-person';
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ type, animate = false, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  
  const typeConfig = {
    video: { icon: Video, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    phone: { icon: Phone, color: 'text-green-600', bgColor: 'bg-green-100' },
    'in-person': { icon: MapPin, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  };
  
  const config = typeConfig[type];
  const TypeIcon = config.icon;
  
  return (
    <div className={cn(
      'rounded-lg flex items-center justify-center',
      config.bgColor,
      animate && 'animate-pulse',
      size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'
    )}>
      <TypeIcon className={cn(config.color, sizeClasses[size])} />
    </div>
  );
};

export default {
  LoadingSkeleton,
  SessionCardSkeleton,
  SessionsListSkeleton,
  CalendarSkeleton,
  MobileSearchFilterSkeleton,
  NoSessionsEmptyState,
  NoSearchResultsEmptyState,
  ErrorEmptyState,
  SessionStatusUpdateLoader,
  SessionTypeIcon,
}; 