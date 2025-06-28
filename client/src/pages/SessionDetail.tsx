import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Session } from '../components/SessionList';
import { fetchSessionById, updateSession } from '../services/sessionService';
import { useAuth } from '../contexts/AuthContext';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { SessionNotes } from '../components/notes';
import MobileSessionDetail from '../components/mobile/MobileSessionDetail';
import SessionTimer from '../components/SessionTimer';
import DurationAdjustment from '../components/DurationAdjustment';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Edit,
  Save,
  X,
  Info,
  AlertTriangle,
  FileText,
  MessageSquare,
  ClipboardList,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';

// Status configuration for display
const statusConfig: { [key in Session['status']]: { label: string; className: string } } = {
  pending: {
    label: 'sessions.status.pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  'in-progress': {
    label: 'sessions.status.inProgress',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  completed: {
    label: 'sessions.status.completed',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  cancelled: {
    label: 'sessions.status.cancelled',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

// Status Badge Component
const StatusBadge: React.FC<{ status: Session['status'] }> = ({ status }) => {
  const { t } = useTranslation();
  const config = statusConfig[status];
  
  const icons: { [key in Session['status']]: React.ReactNode } = {
    pending: <Calendar className="h-4 w-4" />,
    'in-progress': <Clock className="h-4 w-4" />,
    completed: <ClipboardList className="h-4 w-4" />,
    cancelled: <X className="h-4 w-4" />,
  };

  return (
    <span className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${config.className}`}>
      {icons[status]}
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
  const { isMobile } = useMobileDetection();
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
      return format(date, isRTL ? 'EEEE, d MMMM yyyy' : 'EEEE, MMMM d, yyyy', { locale });
    } catch (error) {
      return t('sessions.invalidDate');
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'p', { locale });
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
    const basePath = profile?.role === 'coach' ? '/sessions' : '/sessions';
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
  };

  const handleSaveEdit = async () => {
    if (!session || !sessionId) return;

    setIsSaving(true);
    try {
      const updateData: any = {};
      
      // Only include changed fields
      if (editForm.date && editForm.date !== formatDateTime(session.date)) {
        updateData.date = new Date(editForm.date).toISOString();
      }
      
      if (editForm.notes !== (session.notes || '')) {
        updateData.notes = editForm.notes;
      }

      // Only make API call if there are changes
      if (Object.keys(updateData).length > 0) {
        const updatedSessionData = await updateSession(sessionId, updateData);
        setSession(updatedSessionData);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating session:', error);
      setError(t('errors.updateSessionFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = () => {
    if (profile?.role !== 'coach') return false;
    return session && (session.status === 'pending' || session.status === 'in-progress');
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
        setError(t('errors.loadSessionFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, t]);

  // Use mobile component on mobile devices
  if (isMobile) {
    return <MobileSessionDetail />;
  }

  const PageSkeleton = () => (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Skeleton className="h-8 w-48 mb-6" />
      <Card className="bg-white/90 backdrop-blur-sm border-gray-200/80 shadow-sm mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-t pt-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="flex items-center">
              <Skeleton className="h-12 w-12 rounded-full mr-4" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/90 backdrop-blur-sm border-gray-200/80 shadow-sm mb-6">
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-red-50/90 backdrop-blur-sm border-red-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-6 w-6" />
              {t('common.error')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">{error}</p>
            <Button variant="outline" onClick={handleBackClick}>
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('sessions.backToSessions')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Info className="h-6 w-6" />
              {t('sessions.notFound')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{t('sessions.notFoundText')}</p>
            <Button variant="outline" onClick={handleBackClick}>
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('sessions.backToSessions')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderUserInfo = (user: { firstName: string; lastName: string; email: string; _id?: string }, role: string) => (
    <div className="flex items-center">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-lg font-semibold text-slate-600 ring-2 ring-white/50 mr-4 rtl:mr-0 rtl:ml-4">
        {user.firstName?.charAt(0) || ''}
        {user.lastName?.charAt(0) || ''}
      </div>
      <div>
        <div className="font-semibold text-gray-800">
          {user.firstName} {user.lastName}
        </div>
        <div className="text-gray-500 text-sm">{user.email}</div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" dir={isRTL ? 'rtl' : 'ltr'}>
      <Button variant="ghost" onClick={handleBackClick} className="mb-6">
        <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
        {t('sessions.backToSessions')}
      </Button>

      {/* Session Header Card */}
      <Card className="bg-white/90 backdrop-blur-sm border-gray-200/80 shadow-sm mb-6 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
            <div className="mb-4 md:mb-0">
              {isEditing ? (
                <div className="space-y-2">
                  <label htmlFor="session-date" className="block text-sm font-medium text-gray-700">
                    {t('sessions.sessionDate')}
                  </label>
                  <Input
                    id="session-date"
                    type="datetime-local"
                    value={editForm.date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-500 mb-1">
                    {formatDate(session.date)}
                  </h1>
                  <p className="text-lg text-gray-600 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    {formatTime(session.date)}
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 self-start">
              <StatusBadge status={session.status} />
              {canEdit() && !isEditing && (
                <Button size="sm" variant="outline" onClick={handleEditClick}>
                  <Edit className={`h-3 w-3 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('common.edit')}
                </Button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200/80 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('sessions.client')}
              </h3>
              {renderUserInfo(session.client, 'client')}
            </div>
            {profile?.role === 'client' && session.coach && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('sessions.coach')}
                </h3>
                {renderUserInfo(session.coach, 'coach')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Timer & Duration Adjustment */}
      <SessionTimer
        sessionId={sessionId!}
        sessionStatus={session.status}
        className="mb-6"
      />
      {session.status === 'completed' && (
        <DurationAdjustment
          sessionId={sessionId!}
          sessionStatus={session.status}
          className="mb-6"
        />
      )}

      {/* Session Notes Card */}
      <Card className="bg-white/90 backdrop-blur-sm border-gray-200/80 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800">
            <FileText className="h-5 w-5" />
            {t('sessions.notes')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('sessions.notesPlaceholder')}
                rows={8}
              />
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2 rtl:mr-0 rtl:ml-2" />
                      {t('common.saving')}
                    </>
                  ) : (
                    <>
                      <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {t('common.save')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none prose-p:my-1 prose-ul:my-1">
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
        </CardContent>
      </Card>

      {/* Private Coach Notes Card */}
      <Card className="bg-white/90 backdrop-blur-sm border-gray-200/80 shadow-sm mb-6">
        <SessionNotes
          sessionId={sessionId!}
          clientName={`${session.client.firstName} ${session.client.lastName}`}
          isCoach={profile?.role === 'coach'}
        />
      </Card>

      {/* Session Information Card */}
      <Card className="bg-white/90 backdrop-blur-sm border-gray-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-700">
            <Info className="h-4 w-4" />
            {t('sessions.sessionInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <span className="font-medium text-gray-600">{t('sessions.createdAt')}:</span>
              <span className={`text-gray-500 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                {format(new Date(session.createdAt), 'PPP p', { locale })}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">{t('sessions.updatedAt')}:</span>
              <span className={`text-gray-500 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                {format(new Date(session.updatedAt), 'PPP p', { locale })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionDetail; 