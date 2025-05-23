import React, { useState } from 'react';
import { format, isToday, isYesterday, isSameWeek, isSameMonth, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Client } from './ClientsTable';

export type SessionStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export type Session = {
  _id: string;
  coachId: string;
  clientId: string;
  client: Omit<Client, 'lastSessionDate'>;
  date: string;
  status: SessionStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

interface SessionListProps {
  sessions: Session[];
  isLoading: boolean;
  onCreateClick: () => void;
  onStatusChange?: (sessionId: string, newStatus: SessionStatus) => void;
  isUpdatingStatus?: boolean;
  userRole?: 'coach' | 'client' | 'admin';
}

// Status configuration for display
const statusConfig = {
  pending: {
    label: 'sessions.status.pending',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    icon: '⏳',
  },
  'in-progress': {
    label: 'sessions.status.inProgress',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    icon: '🟢',
  },
  completed: {
    label: 'sessions.status.completed',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    icon: '✅',
  },
  cancelled: {
    label: 'sessions.status.cancelled',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    icon: '❌',
  },
};

// Status Badge Component
const StatusBadge: React.FC<{ status: SessionStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${config.borderColor} border`}>
      <span className="mr-1">{config.icon}</span>
      {t(config.label)}
    </span>
  );
};

// Status Change Dropdown Component
const StatusChangeDropdown: React.FC<{
  currentStatus: SessionStatus;
  sessionId: string;
  sessionDate: string;
  onStatusChange: (sessionId: string, newStatus: SessionStatus) => void;
  isUpdating: boolean;
}> = ({ currentStatus, sessionId, sessionDate, onStatusChange, isUpdating }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Define valid status transitions based on business logic
  const getValidTransitions = (status: SessionStatus, sessionDate: string): SessionStatus[] => {
    const sessionTime = new Date(sessionDate);
    const now = new Date();
    const hoursUntilSession = differenceInHours(sessionTime, now);

    switch (status) {
      case 'pending': {
        const validFromPending: SessionStatus[] = ['in-progress', 'completed'];
        
        // Can only cancel if more than 2 hours away
        if (hoursUntilSession <= 0 || hoursUntilSession >= 2) {
          validFromPending.push('cancelled');
        }
        
        return validFromPending;
        
        break;
      }
      
      case 'in-progress': {
        const validFromInProgress: SessionStatus[] = ['completed'];
        
        // Can still cancel if more than 2 hours away
        if (hoursUntilSession <= 0 || hoursUntilSession >= 2) {
          validFromInProgress.push('cancelled');
        }
        
        return validFromInProgress;
        
        break;
      }
        
      case 'completed':
        // Completed sessions cannot be changed
        return [];
        
      case 'cancelled':
        // Cancelled sessions can only be reset to pending
        return ['pending'];
        
      default:
        return [];
    }
  };

  const availableStatuses = getValidTransitions(currentStatus, sessionDate);
  
  const handleStatusSelect = (newStatus: SessionStatus) => {
    if (newStatus !== currentStatus) {
      onStatusChange(sessionId, newStatus);
    }
    setIsOpen(false);
  };

  // Don't show dropdown if no transitions are available
  if (availableStatuses.length === 0) {
    return (
      <span className="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded-md">
        {currentStatus === 'completed' ? t('sessions.statusFinal') : t('sessions.noActions')}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="px-3 py-1 text-sm font-medium text-lumea-primary bg-lumea-light hover:bg-lumea-light-dark rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUpdating ? (
          <div className="flex items-center">
            <div className="animate-spin h-3 w-3 border-2 border-lumea-primary border-t-transparent rounded-full mr-1" />
            {t('sessions.updating')}
          </div>
        ) : (
          t('sessions.changeStatus')
        )}
      </button>
      
      {isOpen && !isUpdating && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusSelect(status)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center"
              >
                <span className="mr-2">{statusConfig[status].icon}</span>
                {t(statusConfig[status].label)}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
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

const SessionList: React.FC<SessionListProps> = ({ sessions, isLoading, onCreateClick, onStatusChange, isUpdatingStatus, userRole }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isRTL = i18n.language === 'he';
  const locale = isRTL ? he : undefined;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEEE, MMMM d, yyyy', { locale });
    } catch (error) {
      return t('sessions.invalidDate');
    }
  };

  const handleViewDetails = (sessionId: string) => {
    const basePath = profile?.role === 'coach' ? '/coach/sessions' : '/client/sessions';
    navigate(`${basePath}/${sessionId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-lumea-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-64 h-64 bg-lumea-light rounded-full mb-4 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-32 w-32 text-lumea-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">{t('sessions.noSessionsYet')}</h3>
        <p className="text-gray-600 mb-6">{t('sessions.noSessionsMessage')}</p>
        <button
          onClick={onCreateClick}
          className="bg-lumea-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-lumea-primary-dark transition-colors"
        >
          {t('sessions.createSession')}
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

  return (
    <div className="space-y-8">
      {Object.entries(groupedSessions).map(([group, groupSessions]) => {
        if (groupSessions.length === 0) return null;

        return (
          <div key={group} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <h3 className="px-6 py-3 bg-gray-50 font-medium">
              {groupTitles[group as keyof typeof groupTitles]}
            </h3>
            <ul className="divide-y divide-gray-200">
              {groupSessions.map((session) => (
                <li key={session._id} className="p-4 hover:bg-gray-50">
                  <div className="md:flex md:justify-between md:items-center">
                    <div className="mb-2 md:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{formatDate(session.date)}</h4>
                        <StatusBadge status={session.status} />
                      </div>
                      <div className="flex items-center mt-1">
                        <div className="h-6 w-6 rounded-full bg-lumea-light flex items-center justify-center mr-2">
                          <span className="text-lumea-primary text-xs font-semibold">
                            {session.client.firstName.charAt(0)}
                            {session.client.lastName.charAt(0)}
                          </span>
                        </div>
                        <span className="text-gray-700">
                          {session.client.firstName} {session.client.lastName}
                        </span>
                      </div>
                    </div>
                    <div className="md:text-right flex flex-col md:flex-row gap-2">
                      <button
                        onClick={() => handleViewDetails(session._id)}
                        className="px-3 py-1 bg-lumea-light text-lumea-primary rounded hover:bg-lumea-light-dark transition-colors text-sm font-medium"
                      >
                        {t('sessions.viewDetails')}
                      </button>
                      {/* Show status change controls only for coaches */}
                      {userRole === 'coach' && onStatusChange && (
                        <StatusChangeDropdown
                          currentStatus={session.status}
                          sessionId={session._id}
                          sessionDate={session.date}
                          onStatusChange={onStatusChange}
                          isUpdating={isUpdatingStatus || false}
                        />
                      )}
                    </div>
                  </div>
                  {session.notes && (
                    <div className="mt-3 bg-gray-50 p-3 rounded text-gray-700 text-sm">
                      {session.notes}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default SessionList;
