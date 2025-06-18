import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  FileText, 
  Plus,
  MessageSquare,
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { ClientNotesView } from '../components/notes/ClientNotesView';
import { Button } from '../components/ui/button';

interface ClientSession {
  _id: string;
  date: string;
  status: string;
  notes?: string;
}

interface ClientDetails {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  lastSessionDate: string | null;
  totalSessions: number;
  upcomingSessions: number;
  sessions: ClientSession[];
}

const ClientDetailPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { isMobile } = useMobileDetection();
  const isRTL = i18n.language === 'he';
  const locale = isRTL ? he : undefined;

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'sessions'>('overview');

  useEffect(() => {
    if (clientId) {
      loadClientDetails();
    }
  }, [clientId]);

  const loadClientDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch client details
      const response = await fetch(`/api/clients/${clientId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load client details');
      }

      const data = await response.json();
      setClient(data);
    } catch (err) {
      console.error('Error loading client details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate('/coach/clients');
  };

  const handleCreateSession = () => {
    navigate(`/coach/sessions?clientId=${clientId}`);
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/coach/sessions/${sessionId}`);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'PPP', { locale });
    } catch (error) {
      return t('clients.invalidDate');
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'PPP p', { locale });
    } catch (error) {
      return t('clients.invalidDate');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={handleBackClick}
            className="text-lumea-primary hover:text-lumea-primary-dark"
          >
            {t('clients.backToClients')}
          </button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-8">
          <h3 className="text-lg font-medium mb-2">Client not found</h3>
          <button
            onClick={handleBackClick}
            className="text-lumea-primary hover:text-lumea-primary-dark"
          >
            {t('clients.backToClients')}
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
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('clients.backToClients')}
        </button>
      </nav>

      {/* Client Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="h-16 w-16 rounded-full bg-lumea-light flex items-center justify-center mr-4">
              <span className="text-lumea-primary font-bold text-xl">
                {client.firstName.charAt(0)}
                {client.lastName.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-gray-600 flex items-center mt-1">
                <Mail className="w-4 h-4 mr-1" />
                {client.email}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {t('clients.memberSince')} {formatDate(client.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(`mailto:${client.email}`, '_blank')}
              className="flex items-center"
            >
              <Mail className="w-4 h-4 mr-2" />
              {t('clients.message')}
            </Button>
            <Button
              onClick={handleCreateSession}
              className="flex items-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('clients.schedule')}
            </Button>
          </div>
        </div>

        {/* Client Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-lumea-primary">{client.totalSessions}</div>
            <div className="text-gray-600 text-sm">{t('clients.totalSessions')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-lumea-primary">{client.upcomingSessions}</div>
            <div className="text-gray-600 text-sm">{t('clients.upcomingSessions')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-lumea-primary">
              {client.lastSessionDate ? formatDate(client.lastSessionDate) : t('clients.never')}
            </div>
            <div className="text-gray-600 text-sm">{t('clients.lastSession')}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-lumea-primary text-lumea-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              {t('clients.overview')}
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-lumea-primary text-lumea-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              {t('clients.sessions')} ({client.sessions.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notes'
                  ? 'border-lumea-primary text-lumea-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              {t('clients.notes')}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">{t('clients.clientInformation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('clients.fullName')}
                    </label>
                    <p className="mt-1 text-gray-900">{client.firstName} {client.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('clients.email')}
                    </label>
                    <p className="mt-1 text-gray-900">{client.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('clients.memberSince')}
                    </label>
                    <p className="mt-1 text-gray-900">{formatDate(client.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('clients.lastSession')}
                    </label>
                    <p className="mt-1 text-gray-900">
                      {client.lastSessionDate ? formatDate(client.lastSessionDate) : t('clients.never')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Sessions */}
              <div>
                <h3 className="text-lg font-medium mb-4">{t('clients.recentSessions')}</h3>
                {client.sessions.length === 0 ? (
                  <p className="text-gray-500 italic">{t('clients.noSessions')}</p>
                ) : (
                  <div className="space-y-3">
                    {client.sessions.slice(0, 3).map((session) => (
                      <div
                        key={session._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleViewSession(session._id)}
                      >
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium">{formatDateTime(session.date)}</p>
                            {session.notes && (
                              <p className="text-sm text-gray-600 truncate max-w-md">
                                {session.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                    ))}
                    {client.sessions.length > 3 && (
                      <button
                        onClick={() => setActiveTab('sessions')}
                        className="text-lumea-primary hover:text-lumea-primary-dark text-sm font-medium"
                      >
                        {t('clients.viewAllSessions')} ({client.sessions.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{t('clients.allSessions')}</h3>
                <Button onClick={handleCreateSession} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('sessions.createSession')}
                </Button>
              </div>
              
              {client.sessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    {t('clients.noSessions')}
                  </h4>
                  <p className="text-gray-600 mb-4">
                    {t('clients.noSessionsMessage')}
                  </p>
                  <Button onClick={handleCreateSession}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('sessions.createFirstSession')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.sessions.map((session) => (
                    <div
                      key={session._id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleViewSession(session._id)}
                    >
                      <div className="flex items-center flex-1">
                        <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{formatDateTime(session.date)}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                              {session.status}
                            </span>
                          </div>
                          {session.notes && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {session.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <ClientNotesView
              clientId={clientId!}
              clientName={`${client.firstName} ${client.lastName}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailPage; 