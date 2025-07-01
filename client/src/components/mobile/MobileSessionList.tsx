import React, { useState, useRef, useCallback, useMemo } from 'react';
import { format, isToday, isYesterday, isSameWeek, isSameMonth, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Video,
  MapPin,
  MessageSquare, 
  Check, 
  X, 
  MoreVertical,
  ChevronRight,
  RefreshCw,
  Plus,
  FileText,
  Edit3,
  Trash2,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { 
  SessionsListSkeleton, 
  NoSessionsEmptyState, 
  NoSearchResultsEmptyState,
  SessionStatusUpdateLoader 
} from '../SessionLoadingStates';

export type SessionStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export type Session = {
  _id: string;
  coachId: string;
  clientId: string;
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  date: string;
  status: SessionStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  type?: 'video' | 'phone' | 'in-person';
  clientName?: string;
};

interface MobileSessionListProps {
  sessions: Session[];
  isLoading: boolean;
  onCreateClick: () => void;
  onStatusChange?: (sessionId: string, newStatus: SessionStatus) => void;
  isUpdatingStatus?: boolean;
  userRole?: 'coach' | 'client' | 'admin';
  onRefresh?: () => void;
  // New props for enhanced search/filter
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  statusFilter?: 'all' | SessionStatus;
  onStatusFilterChange?: (status: 'all' | SessionStatus) => void;
  typeFilter?: 'all' | 'video' | 'phone' | 'in-person';
  onTypeFilterChange?: (type: 'all' | 'video' | 'phone' | 'in-person') => void;
}

// Enhanced status configuration for mobile display
const statusConfig = {
  pending: {
    label: 'Upcoming',
    bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    icon: Clock,
    iconColor: 'text-amber-600',
    dotColor: 'bg-amber-400',
  },
  'in-progress': {
    label: 'In Progress',
    bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    icon: Sparkles,
    iconColor: 'text-blue-600',
    dotColor: 'bg-blue-400',
  },
  completed: {
    label: 'Completed',
    bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    dotColor: 'bg-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    icon: XCircle,
    iconColor: 'text-red-600',
    dotColor: 'bg-red-400',
  },
};

// Session type configuration
const sessionTypeConfig = {
  video: {
    icon: Video,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Video Call',
  },
  phone: {
    icon: Phone,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Phone Call',
  },
  'in-person': {
    icon: MapPin,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'In Person',
  },
};

// Enhanced swipe gesture hook with haptic feedback
const useSwipeGesture = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) => {
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    // Prevent default scrolling if horizontal swipe is detected
    const deltaX = Math.abs(e.touches[0].clientX - startX.current);
    const deltaY = Math.abs(e.touches[0].clientY - startY.current);
    
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX.current;
    const deltaY = endY - startY.current;
    
    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      triggerHaptic();
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    
    isDragging.current = false;
  }, [onSwipeLeft, onSwipeRight, threshold, triggerHaptic]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

// Mobile Search and Filter Bar Component
const MobileSearchFilter: React.FC<{
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: 'all' | SessionStatus;
  onStatusFilterChange: (status: 'all' | SessionStatus) => void;
  typeFilter: 'all' | 'video' | 'phone' | 'in-person';
  onTypeFilterChange: (type: 'all' | 'video' | 'phone' | 'in-person') => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}> = ({ 
  searchTerm, 
  onSearchChange, 
  statusFilter, 
  onStatusFilterChange, 
  typeFilter, 
  onTypeFilterChange,
  isExpanded,
  onToggleExpanded 
}) => {
  const { t, isRTL } = useLanguage();

  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className={cn(
            'absolute top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400',
            isRTL ? 'right-3' : 'left-3'
          )} />
          <input
            type="text"
            placeholder={t('sessions.searchPlaceholder', 'Search sessions...')}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              'w-full h-11 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200',
              isRTL ? 'pr-10 pl-12' : 'pl-10 pr-12'
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <button
            onClick={onToggleExpanded}
            className={cn(
              'absolute top-1/2 transform -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors',
              isRTL ? 'left-1' : 'right-1'
            )}
          >
            <SlidersHorizontal className={cn(
              'w-5 h-5 text-gray-400 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('sessions.status', 'Status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value as 'all' | SessionStatus)}
                className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="all">{t('sessions.allStatuses', 'All Statuses')}</option>
                <option value="pending">{t('sessions.pending', 'Upcoming')}</option>
                <option value="completed">{t('sessions.completed', 'Completed')}</option>
                <option value="cancelled">{t('sessions.cancelled', 'Cancelled')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('sessions.type', 'Type')}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => onTypeFilterChange(e.target.value as 'all' | 'video' | 'phone' | 'in-person')}
                className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="all">{t('sessions.allTypes', 'All Types')}</option>
                <option value="video">{t('sessions.videoCall', 'Video Call')}</option>
                <option value="phone">{t('sessions.phoneCall', 'Phone Call')}</option>
                <option value="in-person">{t('sessions.inPerson', 'In Person')}</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Mobile Status Badge Component
const MobileStatusBadge: React.FC<{ status: SessionStatus; isCompact?: boolean }> = ({ 
  status, 
  isCompact = false 
}) => {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  
  if (isCompact) {
    return (
      <div className={cn('w-3 h-3 rounded-full', config.dotColor)} />
    );
  }
  
  return (
    <div className={cn(
      'inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-sm',
      config.bgColor,
      config.textColor,
      config.borderColor
    )}>
      <StatusIcon className={cn('w-3.5 h-3.5 mr-1.5', config.iconColor)} />
      {config.label}
    </div>
  );
};

// Enhanced Mobile Session Card Component with improved animations
const MobileSessionCard: React.FC<{
  session: Session;
  userRole?: string;
  onStatusChange?: (sessionId: string, newStatus: SessionStatus) => void;
  isUpdatingStatus?: boolean;
  onViewDetails: (sessionId: string) => void;
}> = ({ session, userRole, onStatusChange, isUpdatingStatus, onViewDetails }) => {
  const { t, isRTL } = useLanguage();
  const [showActions, setShowActions] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const navigate = useNavigate();
  const { isTouchDevice } = useMobileDetection();
  
  // Memoize date formatting for performance
  const formattedTime = useMemo(() => {
    const date = new Date(session.date);
    return format(date, 'HH:mm', { locale: isRTL ? he : undefined });
  }, [session.date, isRTL]);

  const formattedDate = useMemo(() => {
    const date = new Date(session.date);
    const now = new Date();
    
    if (isToday(date)) {
      return t('Today');
    } else if (isYesterday(date)) {
      return t('Yesterday');
    } else if (isSameWeek(date, now)) {
      return format(date, 'EEEE', { locale: isRTL ? he : undefined });
    } else {
      return format(date, 'MMM d', { locale: isRTL ? he : undefined });
    }
  }, [session.date, isRTL, t]);
  
  // Quick actions for coaches with enhanced mobile interactions
  const quickActions = userRole === 'coach' ? [
    {
      label: 'Add Note',
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        const params = new URLSearchParams({
          sessionId: session._id,
          clientName: `${session.client.firstName} ${session.client.lastName}`
        });
        navigate(`/coach/notes?${params.toString()}`);
      },
      color: 'bg-blue-500',
    },
    {
      label: 'Edit Session',
      icon: <Edit3 className="w-4 h-4" />,
      action: () => navigate(`/coach/sessions/${session._id}/edit`),
      color: 'bg-purple-500',
    },
    {
      label: 'Mark Complete',
      icon: <Check className="w-4 h-4" />,
      action: () => onStatusChange?.(session._id, 'completed'),
      color: 'bg-green-500',
      show: session.status === 'pending' || session.status === 'in-progress',
    },
    {
      label: 'Cancel',
      icon: <X className="w-4 h-4" />,
      action: () => onStatusChange?.(session._id, 'cancelled'),
      color: 'bg-red-500',
      show: session.status === 'pending' || session.status === 'in-progress',
    },
  ].filter(action => action.show !== false) : [];

  const swipeGesture = useSwipeGesture(
    () => setShowActions(true),
    () => setShowActions(false)
  );

  const getSessionTypeConfig = () => {
    const type = session.type || 'video';
    return sessionTypeConfig[type] || sessionTypeConfig.video;
  };

  const typeConfig = getSessionTypeConfig();
  const TypeIcon = typeConfig.icon;

  // Enhanced touch feedback with loading states
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const handleTouchStart = () => {
    setIsPressed(true);
    // Immediate haptic feedback for touch responsiveness
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Light immediate feedback
    }
    
    longPressTimer.current = setTimeout(() => {
      if (userRole === 'coach') {
        setShowActions(true);
        // Stronger haptic feedback for action trigger
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]); // Pattern for action activation
        }
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div className="relative">
      {/* Main Card */}
      <div
        className={cn(
          'relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden transition-all duration-300',
          'transform-gpu', // Hardware acceleration
          isPressed && isTouchDevice ? 'scale-[0.98]' : 'scale-100',
          showActions ? 'translate-x-[-80px]' : 'translate-x-0',
          'hover:shadow-xl hover:border-white/40'
        )}
        {...swipeGesture}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={() => onViewDetails(session._id)}
      >
        {/* Status accent bar */}
        <div className={cn('h-1 w-full', statusConfig[session.status].dotColor)} />
        
        <div className="p-4">
          {/* Header Row */}
          <div className={cn(
            'flex items-start justify-between mb-3',
            isRTL && 'flex-row-reverse'
          )}>
            <div className="flex-1 min-w-0">
              <div className={cn(
                'flex items-center gap-2 mb-1',
                isRTL && 'flex-row-reverse'
              )}>
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  typeConfig.bgColor
                )}>
                  <TypeIcon className={cn('w-4 h-4', typeConfig.color)} />
                </div>
                <h3 className="font-semibold text-gray-900 truncate">
                  {session.client.firstName} {session.client.lastName}
                </h3>
              </div>
              
              <div className={cn(
                'flex items-center gap-3 text-sm text-gray-600',
                isRTL && 'flex-row-reverse'
              )}>
                <div className={cn(
                  'flex items-center gap-1',
                  isRTL && 'flex-row-reverse'
                )}>
                  <Calendar className="w-4 h-4" />
                  <span>{formattedDate}</span>
                </div>
                <div className={cn(
                  'flex items-center gap-1',
                  isRTL && 'flex-row-reverse'
                )}>
                  <Clock className="w-4 h-4" />
                  <span>{formattedTime}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <MobileStatusBadge status={session.status} />
              <ChevronRight className={cn(
                'w-5 h-5 text-gray-400',
                isRTL && 'rotate-180'
              )} />
            </div>
          </div>

          {/* Notes Preview */}
          {session.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 line-clamp-2">
                {session.notes}
              </p>
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {isUpdatingStatus && (
          <SessionStatusUpdateLoader 
            status={session.status} 
            message={t('sessions.updatingStatus', 'Updating status...')} 
          />
        )}
      </div>

      {/* Quick Actions Panel */}
      {userRole === 'coach' && (
        <div
          className={cn(
            'absolute top-0 right-0 h-full flex items-center transition-all duration-300',
            showActions ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          )}
        >
          <div className="flex gap-1 px-2">
            {quickActions.map((action, index) => (
              <button
                key={action.label}
                onClick={(e) => {
                  e.stopPropagation();
                  action.action();
                  setShowActions(false);
                }}
                className={cn(
                  'w-12 h-12 rounded-2xl text-white flex items-center justify-center',
                  'transform transition-all duration-200 hover:scale-110 active:scale-95',
                  'shadow-lg',
                  action.color
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                title={action.label}
              >
                {action.icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Pull to Refresh with better visual feedback
const PullToRefresh: React.FC<{ 
  onRefresh: () => void; 
  isRefreshing: boolean;
  children: React.ReactNode;
}> = ({ onRefresh, isRefreshing, children }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && diff < 120) {
      setPullDistance(diff);
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 80) {
      onRefresh();
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Enhanced Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 transition-all duration-300"
          style={{ 
            transform: `translateX(-50%) translateY(${Math.max(pullDistance - 60, -40)}px)`,
            opacity: Math.min(pullDistance / 60, 1)
          }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-white/20">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw 
                className={cn(
                  "w-6 h-6 text-purple-600 transition-transform duration-300",
                  (isRefreshing || pullDistance > 80) && "animate-spin"
                )} 
              />
              <span className="text-xs font-medium text-gray-600">
                {isRefreshing ? 'Refreshing...' : pullDistance > 80 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div 
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance * 0.4}px)` }}
      >
        {children}
      </div>
    </div>
  );
};

// Group sessions by date category - memoized for performance
const groupSessionsByDate = (sessions: Session[]) => {
  const today = new Date();
  const grouped: Record<string, Session[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };

  sessions.forEach((session) => {
    const sessionDate = new Date(session.date);

    if (isToday(sessionDate)) {
      grouped.today.push(session);
    } else if (isYesterday(sessionDate)) {
      grouped.yesterday.push(session);
    } else if (isSameWeek(sessionDate, today, { weekStartsOn: 1 })) {
      grouped.thisWeek.push(session);
    } else if (isSameMonth(sessionDate, today)) {
      grouped.thisMonth.push(session);
    } else {
      grouped.older.push(session);
    }
  });

  return grouped;
};

const MobileSessionList: React.FC<MobileSessionListProps> = ({ 
  sessions, 
  isLoading, 
  onCreateClick, 
  onStatusChange, 
  isUpdatingStatus, 
  userRole,
  onRefresh,
  searchTerm = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  typeFilter = 'all',
  onTypeFilterChange
}) => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isMobile } = useMobileDetection();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const handleViewDetails = useCallback((sessionId: string) => {
    const basePath = profile?.role === 'coach' ? '/coach/sessions' : '/client/sessions';
    navigate(`${basePath}/${sessionId}`);
  }, [navigate, profile?.role]);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  // Memoize grouped sessions for performance
  const groupedSessions = useMemo(() => {
    return groupSessionsByDate(sessions);
  }, [sessions]);

  const groupTitles = useMemo(() => ({
    today: t('sessions.today', 'Today'),
    yesterday: t('sessions.yesterday', 'Yesterday'),
    thisWeek: t('sessions.thisWeek', 'This Week'),
    thisMonth: t('sessions.thisMonth', 'This Month'),
    older: t('sessions.older', 'Older'),
  }), [t]);

  if (isLoading) {
    return <SessionsListSkeleton isMobile={true} withGrouping={true} />;
  }

  if (sessions.length === 0) {
    // Check if this is due to search/filter results
    const hasActiveFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all';
    
    if (hasActiveFilters) {
      return (
        <NoSearchResultsEmptyState
          searchTerm={searchTerm}
          onClearFilters={() => {
            onSearchChange?.('');
            onStatusFilterChange?.('all');
            onTypeFilterChange?.('all');
          }}
          onCreateClick={onCreateClick}
        />
      );
    }
    
    return <NoSessionsEmptyState onCreateClick={onCreateClick} isMobile={true} />;
  }

  const content = (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Search and Filter */}
      {(onSearchChange || onStatusFilterChange || onTypeFilterChange) && (
        <MobileSearchFilter
          searchTerm={searchTerm}
          onSearchChange={onSearchChange || (() => {})}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange || (() => {})}
          typeFilter={typeFilter}
          onTypeFilterChange={onTypeFilterChange || (() => {})}
          isExpanded={isFilterExpanded}
          onToggleExpanded={() => setIsFilterExpanded(!isFilterExpanded)}
        />
      )}

      {/* Sessions List */}
      <div className="space-y-6 p-4 pb-24"> {/* Extra bottom padding for FAB */}
        {Object.entries(groupedSessions).map(([group, groupSessions]) => {
          if (groupSessions.length === 0) return null;

          return (
            <div key={group} className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {groupTitles[group as keyof typeof groupTitles]}
                </h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {groupSessions.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {groupSessions.map((session) => (
                  <MobileSessionCard
                    key={session._id}
                    session={session}
                    userRole={userRole}
                    onStatusChange={onStatusChange}
                    isUpdatingStatus={isUpdatingStatus}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return isMobile && onRefresh ? (
    <PullToRefresh onRefresh={handleRefresh} isRefreshing={isLoading}>
      {content}
    </PullToRefresh>
  ) : (
    content
  );
};

export default MobileSessionList; 