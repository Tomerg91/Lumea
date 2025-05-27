import React, { useState, useRef, useCallback } from 'react';
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
  MessageSquare, 
  Check, 
  X, 
  MoreVertical,
  ChevronRight,
  RefreshCw,
  Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';

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
};

interface MobileSessionListProps {
  sessions: Session[];
  isLoading: boolean;
  onCreateClick: () => void;
  onStatusChange?: (sessionId: string, newStatus: SessionStatus) => void;
  isUpdatingStatus?: boolean;
  userRole?: 'coach' | 'client' | 'admin';
  onRefresh?: () => void;
}

// Status configuration for mobile display
const statusConfig = {
  pending: {
    label: 'sessions.status.pending',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    icon: '⏳',
    color: '#f59e0b',
  },
  'in-progress': {
    label: 'sessions.status.inProgress',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    icon: '🟢',
    color: '#3b82f6',
  },
  completed: {
    label: 'sessions.status.completed',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    icon: '✅',
    color: '#10b981',
  },
  cancelled: {
    label: 'sessions.status.cancelled',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    icon: '❌',
    color: '#ef4444',
  },
};

// Swipe gesture hook
const useSwipeGesture = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) => {
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

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
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    
    isDragging.current = false;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

// Mobile Status Badge Component
const MobileStatusBadge: React.FC<{ status: SessionStatus; isCompact?: boolean }> = ({ 
  status, 
  isCompact = false 
}) => {
  const { t } = useLanguage();
  const config = statusConfig[status];
  
  if (isCompact) {
    return (
      <div 
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: config.color }}
        title={t(config.label)}
      />
    );
  }
  
  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
      config.bgColor,
      config.textColor,
      config.borderColor
    )}>
      <span className="mr-1.5">{config.icon}</span>
      {t(config.label)}
    </span>
  );
};

// Mobile Session Card Component
const MobileSessionCard: React.FC<{
  session: Session;
  userRole?: string;
  onStatusChange?: (sessionId: string, newStatus: SessionStatus) => void;
  isUpdatingStatus?: boolean;
  onViewDetails: (sessionId: string) => void;
}> = ({ session, userRole, onStatusChange, isUpdatingStatus, onViewDetails }) => {
  const { t, isRTL } = useLanguage();
  const [showActions, setShowActions] = useState(false);
  const navigate = useNavigate();
  
  // Quick actions for coaches
  const quickActions = userRole === 'coach' ? [
    {
      label: 'Call',
      icon: <Phone className="w-4 h-4" />,
      action: () => {
        window.location.href = `tel:${session.client.email}`;
      },
      color: 'bg-green-500',
    },
    {
      label: 'Message',
      icon: <MessageSquare className="w-4 h-4" />,
      action: () => {
        // Navigate to messaging or open communication
        console.log('Open messaging for', session.client);
      },
      color: 'bg-blue-500',
    },
  ] : [];

  // Swipe gestures for session management
  const swipeGestures = useSwipeGesture(
    // Swipe left - show quick actions
    () => {
      if (userRole === 'coach') {
        setShowActions(true);
        setTimeout(() => setShowActions(false), 3000);
      }
    },
    // Swipe right - mark as completed (if possible)
    () => {
      if (userRole === 'coach' && onStatusChange && 
          (session.status === 'pending' || session.status === 'in-progress')) {
        onStatusChange(session._id, 'completed');
      }
    }
  );

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) return t('sessions.today');
      if (isYesterday(date)) return t('sessions.yesterday');
      return format(date, 'MMM d', { locale: isRTL ? he : undefined });
    } catch {
      return t('sessions.invalidDate');
    }
  };

  return (
    <div
      className={cn(
        'relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-lumea-medium border border-white/20 overflow-hidden mb-3 touch-manipulation',
        showActions && 'transform scale-[0.98] transition-transform duration-200'
      )}
      {...swipeGestures}
    >
      {/* Main card content */}
      <div 
        className="p-4 min-h-[88px] flex items-center space-x-4"
        onClick={() => onViewDetails(session._id)}
      >
        {/* Client avatar */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-purple flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {session.client.firstName.charAt(0)}
            {session.client.lastName.charAt(0)}
          </span>
        </div>

        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {session.client.firstName} {session.client.lastName}
            </h3>
            <MobileStatusBadge status={session.status} isCompact />
          </div>
          
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <Calendar className="w-4 h-4 mr-1.5" />
            <span>{formatDate(session.date)}</span>
            <Clock className="w-4 h-4 ml-3 mr-1.5" />
            <span>{formatTime(session.date)}</span>
          </div>

          {session.notes && (
            <p className="text-xs text-gray-500 truncate mt-1">
              {session.notes}
            </p>
          )}
        </div>

        {/* Action indicator */}
        <div className="flex-shrink-0">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Quick actions overlay */}
      {showActions && quickActions.length > 0 && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-end pr-4 space-x-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.action();
                setShowActions(false);
              }}
              className={cn(
                'w-12 h-12 rounded-xl text-white flex items-center justify-center',
                'transform hover:scale-105 transition-all duration-200',
                action.color
              )}
              style={{ 
                animationDelay: `${index * 100}ms`,
                animation: 'slideInRight 0.3s ease-out forwards'
              }}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* Swipe indicator */}
      {userRole === 'coach' && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-1 bg-gray-300 rounded-full opacity-30" />
        </div>
      )}
    </div>
  );
};

// Pull to refresh component
const PullToRefresh: React.FC<{ 
  onRefresh: () => void; 
  isRefreshing: boolean;
  children: React.ReactNode;
}> = ({ onRefresh, isRefreshing, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
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
    
    if (diff > 0 && diff < 100) {
      setPullDistance(diff);
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 60) {
      onRefresh();
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
      {/* Pull indicator */}
      {isPulling && (
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 transition-all duration-200"
          style={{ 
            transform: `translateX(-50%) translateY(${pullDistance - 40}px)`,
            opacity: pullDistance / 60
          }}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <RefreshCw 
              className={cn(
                "w-5 h-5 text-blue-600",
                isRefreshing && "animate-spin"
              )} 
            />
          </div>
        </div>
      )}
      
      <div style={{ transform: `translateY(${pullDistance * 0.3}px)` }}>
        {children}
      </div>
    </div>
  );
};

// Group sessions by date category
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
  onRefresh 
}) => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isMobile } = useMobileDetection();

  const handleViewDetails = (sessionId: string) => {
    const basePath = profile?.role === 'coach' ? '/coach/sessions' : '/client/sessions';
    navigate(`${basePath}/${sessionId}`);
  };

  const handleRefresh = () => {
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
        <div className="w-16 h-16 rounded-2xl bg-gradient-lavender animate-pulse-soft mb-4" />
        <div className="w-32 h-4 bg-gradient-lavender animate-pulse-soft rounded" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        <div className="w-24 h-24 bg-gradient-lavender rounded-3xl mb-6 flex items-center justify-center">
          <Calendar className="w-12 h-12 text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-gradient-purple">
          {t('sessions.noSessionsYet')}
        </h3>
        <p className="text-gray-600 mb-6 max-w-sm">
          {t('sessions.noSessionsMessage')}
        </p>
        <button
          onClick={onCreateClick}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>{t('sessions.createSession')}</span>
        </button>
      </div>
    );
  }

  const groupedSessions = groupSessionsByDate(sessions);
  const groupTitles = {
    today: t('sessions.today'),
    yesterday: t('sessions.yesterday'),
    thisWeek: t('sessions.thisWeek'),
    thisMonth: t('sessions.thisMonth'),
    older: t('sessions.older'),
  };

  const content = (
    <div className="space-y-6 p-4">
      {Object.entries(groupedSessions).map(([group, groupSessions]) => {
        if (groupSessions.length === 0) return null;

        return (
          <div key={group}>
            <h3 className="text-lg font-semibold text-gradient-purple mb-4 px-2">
              {groupTitles[group as keyof typeof groupTitles]}
              <span className="ml-2 text-sm text-gray-500 font-normal">
                ({groupSessions.length})
              </span>
            </h3>
            
            <div className="space-y-2">
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