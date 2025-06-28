import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
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
  Phone,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Loader2,
  UserCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { ClientNotesView } from '../components/notes/ClientNotesView';
import { Button } from '../components/ui/button';
import { ClientProgressTimeline } from '../components/progress/ClientProgressTimeline';
import { cn } from '@/lib/utils';

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
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { profile } = useAuth();
  const { isMobile } = useMobileDetection();
  const locale = isRTL ? he : undefined;

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'sessions' | 'progress'>('overview');

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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100",
        isRTL && "rtl"
      )}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                {t('clients.loading')}
              </h2>
              <p className="text-gray-600">{t('clients.loadingDetails')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100",
        isRTL && "rtl"
      )}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 max-w-2xl mx-auto">
            <div className={cn(
              "flex items-center mb-6",
              isRTL && "flex-row-reverse"
            )}>
              <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl mr-4">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-2">
                  {t('clients.error')}
                </h3>
                <p className="text-gray-700">{error}</p>
              </div>
            </div>
            <Button
              onClick={handleBackClick}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <ArrowLeft className={cn("w-4 h-4", !isRTL && "mr-2", isRTL && "ml-2")} />
              {t('clients.backToClients')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100",
        isRTL && "rtl"
      )}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 max-w-2xl mx-auto text-center">
            <div className="p-4 bg-gradient-to-r from-gray-500 to-gray-600 rounded-2xl w-fit mx-auto mb-6">
              <UserCircle className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              {t('clients.notFound')}
            </h3>
            <p className="text-gray-600 mb-6">{t('clients.notFoundMessage')}</p>
            <Button
              onClick={handleBackClick}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <ArrowLeft className={cn("w-4 h-4", !isRTL && "mr-2", isRTL && "ml-2")} />
              {t('clients.backToClients')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { value: 'overview', label: t('clients.overview'), icon: <User className="w-4 h-4" /> },
    { value: 'sessions', label: `${t('clients.sessions')} (${client.sessions.length})`, icon: <Calendar className="w-4 h-4" /> },
    { value: 'notes', label: t('clients.notes'), icon: <FileText className="w-4 h-4" /> },
    { value: 'progress', label: t('clients.progress'), icon: <TrendingUp className="w-4 h-4" /> }
  ];

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100",
      isRTL && "rtl"
    )}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8">
          <Button
            onClick={handleBackClick}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <ArrowLeft className={cn("w-4 h-4", !isRTL && "mr-2", isRTL && "ml-2")} />
            {t('clients.backToClients')}
          </Button>
        </nav>

        {/* Client Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 mb-8">
          <div className={cn(
            "flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6",
            isRTL && "lg:flex-row-reverse"
          )}>
            <div className={cn(
              "flex items-center gap-6",
              isRTL && "flex-row-reverse"
            )}>
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {client.firstName.charAt(0)}
                  {client.lastName.charAt(0)}
                </span>
              </div>
              <div className={cn(isRTL && "text-right")}>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  {client.firstName} {client.lastName}
                </h1>
                <p className={cn(
                  "text-gray-600 flex items-center gap-2 mb-1",
                  isRTL && "flex-row-reverse"
                )}>
                  <Mail className="w-4 h-4" />
                  {client.email}
                </p>
                <p className="text-gray-500 text-sm">
                  {t('clients.memberSince')} {formatDate(client.createdAt)}
                </p>
              </div>
            </div>
            
            <div className={cn(
              "flex gap-3",
              isRTL && "flex-row-reverse"
            )}>
              <Button
                variant="outline"
                onClick={() => window.open(`mailto:${client.email}`, '_blank')}
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Mail className={cn("w-4 h-4", !isRTL && "mr-2", isRTL && "ml-2")} />
                {t('clients.message')}
              </Button>
              <Button
                onClick={handleCreateSession}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Calendar className={cn("w-4 h-4", !isRTL && "mr-2", isRTL && "ml-2")} />
                {t('clients.schedule')}
              </Button>
            </div>
          </div>

          {/* Client Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-200">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {client.totalSessions}
              </div>
              <div className="text-gray-600 text-sm font-medium mt-1">{t('clients.totalSessions')}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                {client.upcomingSessions}
              </div>
              <div className="text-gray-600 text-sm font-medium mt-1">{t('clients.upcomingSessions')}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
              <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {client.lastSessionDate ? formatDate(client.lastSessionDate) : t('clients.never')}
              </div>
              <div className="text-gray-600 text-sm font-medium mt-1">{t('clients.lastSession')}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-8">
          <div className="border-b border-gray-200 p-2">
            <nav className={cn(
              "flex gap-2 overflow-x-auto",
              isRTL && "flex-row-reverse"
            )}>
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap",
                    activeTab === tab.value
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100",
                    isRTL && "flex-row-reverse"
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
                    {t('clients.clientInformation')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('clients.fullName')}
                      </label>
                      <p className="text-gray-900 font-medium">{client.firstName} {client.lastName}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('clients.email')}
                      </label>
                      <p className="text-gray-900 font-medium">{client.email}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('clients.memberSince')}
                      </label>
                      <p className="text-gray-900 font-medium">{formatDate(client.createdAt)}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('clients.lastSession')}
                      </label>
                      <p className="text-gray-900 font-medium">
                        {client.lastSessionDate ? formatDate(client.lastSessionDate) : t('clients.never')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Sessions */}
                <div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
                    {t('clients.recentSessions')}
                  </h3>
                  {client.sessions.length === 0 ? (
                    <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
                      <div className="p-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl w-fit mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-gray-500 italic">{t('clients.noSessions')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {client.sessions.slice(0, 3).map((session) => (
                        <div
                          key={session._id}
                          className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl hover:from-purple-50 hover:to-blue-50 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                          onClick={() => handleViewSession(session._id)}
                        >
                          <div className={cn(
                            "flex items-center gap-4",
                            isRTL && "flex-row-reverse"
                          )}>
                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div className={cn(isRTL && "text-right")}>
                              <p className="font-semibold text-gray-900">{formatDateTime(session.date)}</p>
                              {session.notes && (
                                <p className="text-sm text-gray-600 truncate max-w-md mt-1">
                                  {session.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border",
                            getStatusColor(session.status)
                          )}>
                            {session.status}
                          </span>
                        </div>
                      ))}
                      {client.sessions.length > 3 && (
                        <button
                          onClick={() => setActiveTab('sessions')}
                          className="w-full text-center py-4 text-purple-600 hover:text-purple-700 font-medium bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl hover:from-purple-100 hover:to-blue-100 transition-all duration-300"
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
              <div className="space-y-6">
                <div className={cn(
                  "flex justify-between items-center",
                  isRTL && "flex-row-reverse"
                )}>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {t('clients.allSessions')}
                  </h3>
                  <Button 
                    onClick={handleCreateSession} 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Plus className={cn("w-4 h-4", !isRTL && "mr-2", isRTL && "ml-2")} />
                    {t('sessions.createSession')}
                  </Button>
                </div>
                
                {client.sessions.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
                    <div className="p-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl w-fit mx-auto mb-6">
                      <Calendar className="w-12 h-12 text-white" />
                    </div>
                    <h4 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                      {t('clients.noSessions')}
                    </h4>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      {t('clients.noSessionsMessage')}
                    </p>
                    <Button 
                      onClick={handleCreateSession}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className={cn("w-4 h-4", !isRTL && "mr-2", isRTL && "ml-2")} />
                      {t('sessions.createFirstSession')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {client.sessions.map((session) => (
                      <div
                        key={session._id}
                        className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl hover:from-purple-50 hover:to-blue-50 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                        onClick={() => handleViewSession(session._id)}
                      >
                        <div className={cn(
                          "flex items-center gap-4 flex-1",
                          isRTL && "flex-row-reverse"
                        )}>
                          <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div className={cn("flex-1", isRTL && "text-right")}>
                            <div className={cn(
                              "flex items-center justify-between mb-1",
                              isRTL && "flex-row-reverse"
                            )}>
                              <p className="font-semibold text-gray-900">{formatDateTime(session.date)}</p>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-medium border",
                                getStatusColor(session.status)
                              )}>
                                {session.status}
                              </span>
                            </div>
                            {session.notes && (
                              <p className="text-sm text-gray-600 line-clamp-2">
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
              <div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
                  {t('clients.clientNotes')}
                </h3>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6">
                  <ClientNotesView
                    clientId={clientId!}
                    clientName={`${client.firstName} ${client.lastName}`}
                  />
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
                  {t('clients.progressTracking')}
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
                  <ClientProgressTimeline
                    clientId={clientId!}
                    clientName={`${client.firstName} ${client.lastName}`}
                    timeRange="all"
                    showFilters={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>{t('clients.footerText')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailPage; 