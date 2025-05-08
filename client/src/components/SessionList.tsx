import React from 'react';
import { format, isToday, isYesterday, isSameWeek, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Client } from './ClientsTable';

export type Session = {
  _id: string;
  coachId: string;
  clientId: string;
  client: Omit<Client, 'lastSessionDate'>;
  date: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

interface SessionListProps {
  sessions: Session[];
  isLoading: boolean;
  onCreateClick: () => void;
}

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

const SessionList: React.FC<SessionListProps> = ({ sessions, isLoading, onCreateClick }) => {
  const { t, i18n } = useTranslation();
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
                      <h4 className="font-medium">{formatDate(session.date)}</h4>
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
                    <div className="md:text-right">
                      <button className="px-3 py-1 bg-lumea-light text-lumea-primary rounded hover:bg-lumea-light-dark transition-colors text-sm font-medium">
                        {t('sessions.viewDetails')}
                      </button>
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
