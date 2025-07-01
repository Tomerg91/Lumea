import React, { useState, useMemo, useCallback, memo } from 'react';
import { format, isToday, isYesterday, isSameWeek, isSameMonth, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Video, 
  MapPin, 
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  X,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { 
  SessionsListSkeleton, 
  NoSessionsEmptyState, 
  NoSearchResultsEmptyState 
} from './SessionLoadingStates';
import { Client } from './ClientsTable';

// Define UISessionStatus directly to fix build
type UISessionStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

// Legacy Session type for backward compatibility
export type Session = {
  _id: string; // Maps to SupabaseSession.id
  coachId: string; // Maps to SupabaseSession.coach_id
  clientId: string; // Maps to SupabaseSession.client_id
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
  }; // Aligned with SupabaseSession.client structure
  date: string;
  status: UISessionStatus; // Use UI status for backward compatibility
  notes: string;
  createdAt: string;
  updatedAt: string;
  title: string; // Added, from SupabaseSession.title
  type: 'video' | 'phone' | 'in-person'; // Added, from SupabaseSession.type
  time: string; // Added, from SupabaseSession.time
  description?: string; // Added, from SupabaseSession.description
  clientName?: string; // Added, derived from SupabaseSession.client
  coachName?: string; // Added, derived from SupabaseSession.coach
};

// Export UISessionStatus for backward compatibility
export { UISessionStatus as SessionStatus };

interface SessionListProps {
  sessions: Session[];
  isLoading: boolean;
  onCreateClick: () => void;
  onStatusChange?: (sessionId: string, newStatus: UISessionStatus) => void;
  isUpdatingStatus?: boolean;
  userRole?: 'coach' | 'client' | 'admin';
  onReschedule?: (session: Session) => void;
  onCancel?: (session: Session) => void;
}

// Enhanced status configuration for modern display - moved outside to prevent recreation
const statusConfig = {
  pending: {
    label: 'sessions.status.pending',
    bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    icon: Clock,
    iconColor: 'text-amber-500',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  'in-progress': {
    label: 'sessions.status.inProgress',
    bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: Sparkles,
    iconColor: 'text-blue-500',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  completed: {
    label: 'sessions.status.completed',
    bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    badgeColor: 'bg-green-100 text-green-800',
  },
  cancelled: {
    label: 'sessions.status.cancelled',
    bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
    badgeColor: 'bg-red-100 text-red-800',
  },
} as const;

// Memoized Status Badge Component
const StatusBadge = memo<{ status: UISessionStatus }>(({ status }) => {
  const { t } = useTranslation();
  const config = statusConfig[status];
  const IconComponent = config.icon;
  
  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm',
      config.badgeColor,
      config.borderColor
    )}>
      <IconComponent className="w-4 h-4 mr-1.5" />
      {t(config.label)}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Memoized Session Type Icon Component
const SessionTypeIcon = memo<{ type: string; className?: string }>(({ type, className }) => {
  const getTypeIcon = useMemo(() => {
    switch (type) {
      case 'video': return Video;
      case 'phone': return Phone;
      case 'in-person': return MapPin;
      default: return Video;
    }
  }, [type]);

  const IconComponent = getTypeIcon;
  return <IconComponent className={cn('w-5 h-5', className)} />;
});

SessionTypeIcon.displayName = 'SessionTypeIcon';

// Memoized Session Actions Component
const SessionActions = memo<{
  session: Session;
  onStatusChange: (sessionId: string, newStatus: UISessionStatus) => void;
  onReschedule?: (session: Session) => void;
  onCancel?: (session: Session) => void;
  onViewDetails?: (sessionId: string) => void;
  isUpdating: boolean;
  userRole?: 'coach' | 'client' | 'admin';
}>(({ session, onStatusChange, onReschedule, onCancel, onViewDetails, isUpdating, userRole }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const canReschedule = useMemo(() => {
    const sessionTime = new Date(session.date);
    const now = new Date();
    const hoursUntilSession = differenceInHours(sessionTime, now);
    return session.status === 'pending' && hoursUntilSession > 24;
  }, [session.date, session.status]);

  const canCancel = useMemo(() => {
    const sessionTime = new Date(session.date);
    const now = new Date();
    const hoursUntilSession = differenceInHours(sessionTime, now);
    return ['pending', 'in-progress'].includes(session.status) && hoursUntilSession > 2;
  }, [session.date, session.status]);

  const canViewDetails = useMemo(() => {
    return userRole === 'coach' || session.status === 'completed';
  }, [userRole, session.status]);

  const handleReschedule = useCallback(() => {
    setActiveAction('reschedule');
    onReschedule?.(session);
  }, [onReschedule, session]);

  const handleCancel = useCallback(() => {
    setActiveAction('cancel');
    onCancel?.(session);
  }, [onCancel, session]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(session._id);
  }, [onViewDetails, session._id]);

  const quickActions = useMemo(() => [
    ...(canReschedule && onReschedule ? [{
      id: 'reschedule',
      label: t('sessions.reschedule', 'Reschedule'),
      icon: <Calendar className="w-4 h-4 transition-transform group-hover:scale-110" />,
      action: handleReschedule,
      color: 'text-blue-600 hover:text-blue-700',
      bgColor: 'hover:bg-blue-50/80 active:bg-blue-100/80',
      tooltip: t('sessions.rescheduleTooltip', 'Reschedule this session'),
    }] : []),
    ...(canCancel && onCancel ? [{
      id: 'cancel',
      label: t('sessions.cancel', 'Cancel'),
      icon: <X className="w-4 h-4 transition-transform group-hover:scale-110" />,
      action: handleCancel,
      color: 'text-red-600 hover:text-red-700',
      bgColor: 'hover:bg-red-50/80 active:bg-red-100/80',
      tooltip: t('sessions.cancelTooltip', 'Cancel this session'),
    }] : []),
    ...(canViewDetails && onViewDetails ? [{
      id: 'view-details',
      label: t('sessions.viewDetails', 'View Details'),
      icon: <Eye className="w-4 h-4 transition-transform group-hover:scale-110" />,
      action: handleViewDetails,
      color: 'text-purple-600 hover:text-purple-700',
      bgColor: 'hover:bg-purple-50/80 active:bg-purple-100/80',
      tooltip: t('sessions.viewDetailsTooltip', 'View session details'),
    }] : []),
  ], [canReschedule, onReschedule, canCancel, onCancel, canViewDetails, onViewDetails, t, handleReschedule, handleCancel, handleViewDetails]);

  if (quickActions.length === 0) {
    return <div className="w-8" />; // Placeholder for spacing
  }

  return (
    <div className="flex items-center gap-2">
      {quickActions.map((action) => (
        <button
          key={action.id}
          onClick={action.action}
          disabled={isUpdating && activeAction === action.id}
          className={cn(
            'p-2 rounded-lg transition-all duration-200 group',
            action.color,
            action.bgColor,
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center'
          )}
          title={action.tooltip}
        >
          {isUpdating && activeAction === action.id ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            action.icon
          )}
        </button>
      ))}
    </div>
  );
});

SessionActions.displayName = 'SessionActions';

// Optimized date grouping function - memoized outside component
const groupSessionsByDate = (sessions: Session[]) => {
  const today = new Date();
  const grouped = {
    today: [] as Session[],
    yesterday: [] as Session[],
    thisWeek: [] as Session[],
    thisMonth: [] as Session[],
    older: [] as Session[],
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

// Memoized individual session component
const SessionCard = memo<{
  session: Session;
  onStatusChange: (sessionId: string, newStatus: UISessionStatus) => void;
  onReschedule?: (session: Session) => void;
  onCancel?: (session: Session) => void;
  onViewDetails: (sessionId: string) => void;
  onAddNote: (sessionId: string, clientId: string, clientName: string) => void;
  isUpdatingStatus: boolean;
  userRole?: 'coach' | 'client' | 'admin';
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
  locale: any;
}>(({ 
  session, 
  onStatusChange, 
  onReschedule, 
  onCancel, 
  onViewDetails, 
  onAddNote, 
  isUpdatingStatus, 
  userRole, 
  formatDate, 
  formatTime, 
  locale 
}) => {
  const { t } = useTranslation();
  
  const handleAddNote = useCallback(() => {
    if (session.client) {
      onAddNote(session._id, session.client._id, `${session.client.firstName} ${session.client.lastName}`);
    }
  }, [session, onAddNote]);

  const sessionTitle = useMemo(() => {
    return session.title || t('sessions.sessionWith', { 
      client: session.client 
        ? `${session.client.firstName} ${session.client.lastName}`
        : t('sessions.unknownClient')
    });
  }, [session.title, session.client, t]);

  const clientName = useMemo(() => {
    return session.client ? `${session.client.firstName} ${session.client.lastName}` : '';
  }, [session.client]);

  const lastUpdated = useMemo(() => {
    return format(new Date(session.updatedAt), 'MMM d, h:mm a', { locale });
  }, [session.updatedAt, locale]);

  return (
    <div className="group relative bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* Status accent bar */}
      <div className={cn(
        'absolute top-0 left-0 w-1 h-full',
        statusConfig[session.status].bgColor
      )} />
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            {/* Session Type Icon */}
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
              <SessionTypeIcon type={session.type} className="w-6 h-6 text-purple-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-lg font-semibold text-gray-900 truncate">
                  {sessionTitle}
                </h4>
                <StatusBadge status={session.status} />
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  <span>{formatDate(session.date)} • {formatTime(session.date)}</span>
                </div>
                
                {session.client && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1.5" />
                    <span>{clientName}</span>
                  </div>
                )}
              </div>
              
              {session.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {session.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Session Actions */}
          <SessionActions
            session={session}
            onStatusChange={onStatusChange}
            onReschedule={onReschedule}
            onCancel={onCancel}
            onViewDetails={onViewDetails}
            isUpdating={isUpdatingStatus}
            userRole={userRole}
          />
        </div>
        
        {/* Additional Actions for Coaches */}
        {userRole === 'coach' && session.client && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAddNote}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                {t('sessions.addNote')}
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              {t('sessions.lastUpdated')}: {lastUpdated}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SessionCard.displayName = 'SessionCard';

const SessionList: React.FC<SessionListProps> = ({ 
  sessions, 
  isLoading, 
  onCreateClick, 
  onStatusChange, 
  isUpdatingStatus = false, 
  userRole,
  onReschedule,
  onCancel 
}) => {
  const { t, i18n } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const locale = useMemo(() => isRTL ? he : undefined, [isRTL]);

  // Memoized date formatting functions
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEEE, MMMM d, yyyy', { locale });
    } catch (error) {
      return t('sessions.invalidDate');
    }
  }, [locale, t]);

  const formatTime = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'h:mm a', { locale });
    } catch (error) {
      return '';
    }
  }, [locale]);

  // Memoized callback functions
  const handleViewDetails = useCallback((sessionId: string) => {
    const basePath = profile?.role === 'coach' ? '/coach/sessions' : '/client/sessions';
    navigate(`${basePath}/${sessionId}`);
  }, [profile?.role, navigate]);

  const handleAddNote = useCallback((sessionId: string, clientId: string, clientName: string) => {
    // Navigate to coach notes with pre-filled session and client context
    const params = new URLSearchParams({
      sessionId,
      clientId,
      clientName
    });
    navigate(`/coach/notes?${params.toString()}`);
  }, [navigate]);

  // Memoized grouped sessions
  const groupedSessions = useMemo(() => {
    return groupSessionsByDate(sessions);
  }, [sessions]);

  // Memoized group titles
  const groupTitles = useMemo(() => ({
    today: t('sessions.today'),
    yesterday: t('sessions.yesterday'),
    thisWeek: t('sessions.thisWeek'),
    thisMonth: t('sessions.thisMonth'),
    older: t('sessions.older'),
  }), [t]);

  if (isLoading) {
    return <SessionsListSkeleton isMobile={false} withGrouping={true} />;
  }

  if (sessions.length === 0) {
    return <NoSessionsEmptyState onCreateClick={onCreateClick} isMobile={false} />;
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedSessions).map(([groupKey, groupSessions]) => {
        if (groupSessions.length === 0) return null;

        return (
          <div key={groupKey} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              {groupTitles[groupKey as keyof typeof groupTitles]} ({groupSessions.length})
            </h3>
            
            <div className="grid gap-4">
              {groupSessions.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  onStatusChange={onStatusChange || (() => {})}
                  onReschedule={onReschedule}
                  onCancel={onCancel}
                  onViewDetails={handleViewDetails}
                  onAddNote={handleAddNote}
                  isUpdatingStatus={isUpdatingStatus}
                  userRole={userRole}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(SessionList);
export { SessionList };
