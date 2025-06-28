import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Video,
  Phone,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CalendarSkeleton } from './SessionLoadingStates';
import { Session, SessionStatus } from './SessionList';

interface SessionsCalendarProps {
  sessions: Session[];
  isLoading: boolean;
  onCreateSession: (date: Date) => void;
  onSessionClick: (session: Session) => void;
  userRole?: 'coach' | 'client' | 'admin';
}

// Session type configuration
const sessionTypeConfig = {
  video: {
    icon: Video,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  phone: {
    icon: Phone,
    color: 'bg-green-500',
    lightColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  'in-person': {
    icon: MapPin,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
};

// Status configuration
const statusConfig = {
  pending: {
    icon: Clock,
    color: 'border-amber-300 bg-amber-50',
    dotColor: 'bg-amber-400',
  },
  'in-progress': {
    icon: Sparkles,
    color: 'border-blue-300 bg-blue-50',
    dotColor: 'bg-blue-400',
  },
  completed: {
    icon: CheckCircle,
    color: 'border-green-300 bg-green-50',
    dotColor: 'bg-green-400',
  },
  cancelled: {
    icon: XCircle,
    color: 'border-red-300 bg-red-50',
    dotColor: 'bg-red-400',
  },
};

// Calendar Day Component
const CalendarDay: React.FC<{
  date: Date;
  sessions: Session[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onCreateSession: (date: Date) => void;
  onSessionClick: (session: Session) => void;
  userRole?: string;
}> = ({ date, sessions, isCurrentMonth, isToday, onCreateSession, onSessionClick, userRole }) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const dayNumber = format(date, 'd');
  const hasUpcomingSessions = sessions.some(s => s.status === 'pending' || s.status === 'in-progress');
  const hasCompletedSessions = sessions.some(s => s.status === 'completed');

  return (
    <div
      className={cn(
        'relative p-2 min-h-[120px] border border-gray-100 transition-all duration-200 group',
        isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50',
        isToday && 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200',
        !isCurrentMonth && 'text-gray-400'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Day Number */}
      <div className={cn(
        'flex items-center justify-between mb-2',
        isRTL && 'flex-row-reverse'
      )}>
        <span className={cn(
          'text-sm font-medium',
          isToday && 'text-purple-700 font-bold',
          !isCurrentMonth && 'text-gray-400'
        )}>
          {dayNumber}
        </span>
        
        {/* Today indicator */}
        {isToday && (
          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
        )}
      </div>

      {/* Sessions */}
      <div className="space-y-1">
        {sessions.slice(0, 3).map((session, index) => {
          const typeConfig = sessionTypeConfig[session.type as keyof typeof sessionTypeConfig] || sessionTypeConfig.video;
          const statusConf = statusConfig[session.status];
          const TypeIcon = typeConfig.icon;
          
          return (
            <div
              key={session._id}
              onClick={() => onSessionClick(session)}
              className={cn(
                'p-2 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md',
                statusConf.color,
                'group-hover:scale-105'
              )}
            >
              <div className={cn(
                'flex items-center gap-2 text-xs',
                isRTL && 'flex-row-reverse'
              )}>
                <div className={cn('w-1.5 h-1.5 rounded-full', statusConf.dotColor)}></div>
                <TypeIcon className="w-3 h-3" />
                <span className="font-medium truncate">
                  {session.client.firstName} {session.client.lastName.charAt(0)}.
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {format(new Date(session.date), 'HH:mm')}
              </div>
            </div>
          );
        })}
        
        {/* Show more indicator */}
        {sessions.length > 3 && (
          <div className="text-xs text-gray-500 text-center py-1">
            +{sessions.length - 3} more
          </div>
        )}
      </div>

      {/* Add Session Button - Show on hover for coaches */}
      {userRole === 'coach' && isHovered && isCurrentMonth && (
        <button
          onClick={() => onCreateSession(date)}
          className="absolute bottom-2 right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}

      {/* Session indicators */}
      {sessions.length > 0 && (
        <div className={cn(
          'absolute top-2 flex gap-1',
          isRTL ? 'left-2' : 'right-2'
        )}>
          {hasUpcomingSessions && (
            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
          )}
          {hasCompletedSessions && (
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Calendar Component
const SessionsCalendar: React.FC<SessionsCalendarProps> = ({
  sessions,
  isLoading,
  onCreateSession,
  onSessionClick,
  userRole
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const locale = isRTL ? he : undefined;

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped: { [key: string]: Session[] } = {};
    
    sessions.forEach(session => {
      const dateKey = format(new Date(session.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    
    return grouped;
  }, [sessions]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    // Get all days from the first Sunday to the last Saturday to fill the grid
    const startDate = new Date(start);
    startDate.setDate(start.getDate() - start.getDay());
    
    const endDate = new Date(end);
    endDate.setDate(end.getDate() + (6 - end.getDay()));
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className={cn(
          'flex items-center justify-between',
          isRTL && 'flex-row-reverse'
        )}>
          <div className={cn(
            'flex items-center gap-4',
            isRTL && 'flex-row-reverse'
          )}>
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {format(currentDate, 'MMMM yyyy', { locale })}
              </h2>
              <p className="text-sm text-gray-600">
                {t('sessions.calendarView', 'Calendar View')}
              </p>
            </div>
          </div>

          <div className={cn(
            'flex items-center gap-2',
            isRTL && 'flex-row-reverse'
          )}>
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-white/60 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white/60 hover:bg-white/80 rounded-lg transition-colors text-sm font-medium text-gray-700"
            >
              {t('sessions.today', 'Today')}
            </button>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-white/60 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div
            key={day}
            className="p-4 text-center text-sm font-medium text-gray-600 bg-gray-50"
          >
            {t(`calendar.days.${day.toLowerCase()}`, day)}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const daySessions = sessionsByDate[dateKey] || [];
          
          return (
            <CalendarDay
              key={dateKey}
              date={date}
              sessions={daySessions}
              isCurrentMonth={isSameMonth(date, currentDate)}
              isToday={isToday(date)}
              onCreateSession={onCreateSession}
              onSessionClick={onSessionClick}
              userRole={userRole}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className={cn(
          'flex items-center justify-between text-xs text-gray-600',
          isRTL && 'flex-row-reverse'
        )}>
          <div className={cn(
            'flex items-center gap-4',
            isRTL && 'flex-row-reverse'
          )}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span>{t('sessions.upcomingSessions', 'Upcoming')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>{t('sessions.completedSessions', 'Completed')}</span>
            </div>
          </div>
          
          {userRole === 'coach' && (
            <span className="text-gray-500">
              {t('sessions.hoverToAddSession', 'Hover over a date to add a session')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionsCalendar; 