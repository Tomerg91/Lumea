import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Session } from '../components/SessionList';
import { fetchSessionById, updateSession } from '../services/sessionService';
import { useAuth } from '../contexts/AuthContext';

// Status configuration for display (reused from SessionList)
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
const StatusBadge: React.FC<{ status: Session['status'] }> = ({ status }) => {
  const { t } = useTranslation();
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} ${config.borderColor} border`}>
      <span className="mr-2">{config.icon}</span>
      {t(config.label)}
    </span>
  );
};

interface ExtendedSession extends Session {
  coach?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const SessionDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const isRTL = i18n.language === 'he';
  const locale = isRTL ? he : undefined;

  const [session, setSession] = useState<ExtendedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    date: '',
    notes: '',
  });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'EEEE, MMMM d, yyyy', { locale });
    } catch (error) {
      return t('sessions.invalidDate');
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm', { locale });
    } catch (error) {
      return '';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd'T'HH:mm", { locale });
    } catch (error) {
      return '';
    }
  };

  const handleBackClick = () => {
    const basePath = profile?.role === 'coach' ? '/coach/sessions' : '/client/sessions';
    navigate(basePath);
  };

  const handleEditClick = () => {
    if (session) {
      setEditForm({
        date: formatDateTime(session.date),
        notes: session.notes || '',
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      date: '',
      notes: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!session || !sessionId) return;

    setIsSaving(true);
    try {
      const updateData: any = {};
      
      // Only include changed fields
      if (editForm.date !== formatDateTime(session.date)) {
        updateData.date = new Date(editForm.date).toISOString();
      }
      
      if (editForm.notes !== (session.notes || '')) {
        updateData.notes = editForm.notes;
      }

      // Only make API call if there are changes
      if (Object.keys(updateData).length > 0) {
        const updatedSession = await updateSession(sessionId, updateData);
        setSession(updatedSession);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating session:', error);
      setError(error instanceof Error ? error.message : 'Failed to update session');
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = () => {
    return profile?.role === 'coach' && session && 
           (session.status === 'pending' || session.status === 'in-progress');
  };

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setError('Session ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const sessionData = await fetchSessionById(sessionId);
        setSession(sessionData);
      } catch (error) {
        console.error('Error loading session:', error);
        setError(error instanceof Error ? error.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-lumea-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={handleBackClick}
            className="mt-4 text-lumea-primary hover:text-lumea-primary-dark"
          >
            {t('sessions.backToSessions')}
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-8">
          <h3 className="text-lg font-medium mb-2">Session not found</h3>
          <button
            onClick={handleBackClick}
            className="text-lumea-primary hover:text-lumea-primary-dark"
          >
            {t('sessions.backToSessions')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="mb-6">
        <button
          onClick={handleBackClick}
          className="flex items-center text-lumea-primary hover:text-lumea-primary-dark transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('sessions.backToSessions')}
        </button>
      </nav>

      {/* Session Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
          <div className="mb-4 md:mb-0">
            {isEditing ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('sessions.sessionDate')}
                </label>
                <input
                  type="datetime-local"
                  value={editForm.date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-lumea-primary focus:border-lumea-primary"
                />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-2">
                  {formatDate(session.date)}
                </h1>
                <p className="text-gray-600 text-lg">
                  {formatTime(session.date)}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={session.status} />
            {canEdit() && !isEditing && (
              <button
                onClick={handleEditClick}
                className="px-3 py-1 bg-lumea-light text-lumea-primary rounded hover:bg-lumea-light-dark transition-colors text-sm font-medium"
              >
                {t('sessions.editSession')}
              </button>
            )}
          </div>
        </div>

        {/* Client Information */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-3">{t('sessions.client')}</h3>
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-lumea-light flex items-center justify-center mr-3">
              <span className="text-lumea-primary font-semibold">
                {session.client.firstName.charAt(0)}
                {session.client.lastName.charAt(0)}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {session.client.firstName} {session.client.lastName}
              </div>
              <div className="text-gray-500 text-sm">{session.client.email}</div>
            </div>
          </div>
        </div>

        {/* Coach Information (for clients) */}
        {profile?.role === 'client' && session.coach && (
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-medium mb-3">{t('sessions.coach')}</h3>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-lumea-light flex items-center justify-center mr-3">
                <span className="text-lumea-primary font-semibold">
                  {session.coach.firstName.charAt(0)}
                  {session.coach.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {session.coach.firstName} {session.coach.lastName}
                </div>
                <div className="text-gray-500 text-sm">{session.coach.email}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Notes */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{t('sessions.notes')}</h3>
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t('sessions.notesPlaceholder')}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-lumea-primary focus:border-lumea-primary"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-lumea-primary text-white rounded-md hover:bg-lumea-primary-dark transition-colors disabled:opacity-50 flex items-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Saving...
                  </>
                ) : (
                  t('common.save')
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="prose max-w-none">
            {session.notes ? (
              <div className="whitespace-pre-wrap text-gray-700">
                {session.notes}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                {t('sessions.noNotes')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Session Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">{t('sessions.sessionInfo')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">{t('sessions.createdAt')}:</span>
            <span className="ml-2 text-gray-600">
              {format(new Date(session.createdAt), 'PPP p', { locale })}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">{t('sessions.updatedAt')}:</span>
            <span className="ml-2 text-gray-600">
              {format(new Date(session.updatedAt), 'PPP p', { locale })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetail; 