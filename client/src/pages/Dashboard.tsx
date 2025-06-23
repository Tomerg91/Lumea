import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import {
  Calendar,
  MessageSquare,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  BookOpen,
  Target,
  Activity,
  Plus,
  Video,
  PenTool,
  AlertCircle,
  CheckCircle,
  Star,
  Heart,
  Zap,
  BarChart3
} from 'lucide-react';
import SessionDurationAnalytics from '../components/analytics/SessionDurationAnalytics';
import { useMobileDetection } from '../hooks/useMobileDetection';
import MobileSessionDurationAnalytics from '../components/analytics/MobileSessionDurationAnalytics';

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalReflections: number;
  weeklyProgress: number;
}

interface UpcomingSession {
  id: string;
  title: string;
  date: string;
  time: string;
  coach?: string;
  client?: string;
  status: 'scheduled' | 'confirmed' | 'pending';
}

interface RecentReflection {
  id: string;
  title: string;
  date: string;
  mood: string;
  preview: string;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobile } = useMobileDetection();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [recentReflections, setRecentReflections] = useState<RecentReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCoach = profile?.role === 'coach';
  const isClient = profile?.role === 'client';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to fetch from backend API first
        try {
          // Get the current session to extract the access token
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.access_token) {
            console.log('No authentication token, using mock data');
            throw new Error('Not authenticated');
          }

          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          };

          const [statsResponse, sessionsResponse, reflectionsResponse] = await Promise.all([
            fetch('/api/dashboard/stats', { headers }),
            fetch('/api/sessions/upcoming', { headers }),
            fetch('/api/reflections/recent', { headers })
          ]);

          if (statsResponse.ok && sessionsResponse.ok && reflectionsResponse.ok) {
            const [statsData, sessionsData, reflectionsData] = await Promise.all([
              statsResponse.json(),
              sessionsResponse.json(),
              reflectionsResponse.json()
            ]);

            console.log('Successfully fetched live data:', { statsData, sessionsData, reflectionsData });
            setStats(statsData);
            setUpcomingSessions(sessionsData);
            setRecentReflections(reflectionsData);
            return;
          } else {
            console.log('API responses not OK:', {
              stats: statsResponse.status,
              sessions: sessionsResponse.status,
              reflections: reflectionsResponse.status
            });
          }
        } catch (apiError) {
          console.log('API error, using mock data:', apiError);
        }

        // Fallback to mock data with appropriate content for role
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

        if (isCoach) {
          setStats({
            totalSessions: 47,
            completedSessions: 42,
            upcomingSessions: 5,
            totalReflections: 89,
            weeklyProgress: 85
          });

          setUpcomingSessions([
            {
              id: '1',
              title: t('dashboard.upcomingSessions.title'),
              date: '2024-01-15',
              time: '14:00',
              client: 'שרה מזרחי / Sarah Mizrahi',
              status: 'confirmed'
            },
            {
              id: '2',
              title: t('dashboard.upcomingSessions.title'), 
              date: '2024-01-16',
              time: '10:30',
              client: 'דוד כהן / David Cohen',
              status: 'scheduled'
            }
          ]);
        } else {
          setStats({
            totalSessions: 12,
            completedSessions: 8,
            upcomingSessions: 2,
            totalReflections: 24,
            weeklyProgress: 75
          });

          setUpcomingSessions([
            {
              id: '1',
              title: t('dashboard.upcomingSessions.title'),
              date: '2024-01-15',
              time: '14:00',
              coach: 'ד"ר רונית לוי / Dr. Ronit Levy',
              status: 'confirmed'
            }
          ]);
        }

        setRecentReflections([
          {
            id: '1',
            title: isCoach ? t('dashboard.recentReflections.assessmentTitle') : t('dashboard.recentReflections.journalTitle'),
            date: '2024-01-14',
            mood: '😊',
            preview: isCoach 
              ? t('dashboard.recentReflections.assessmentPreview')
              : t('dashboard.recentReflections.journalPreview')
          },
          {
            id: '2', 
            title: isCoach ? t('dashboard.recentReflections.insightsTitle') : t('dashboard.recentReflections.goalsTitle'),
            date: '2024-01-12',
            mood: '🎯',
            preview: isCoach
              ? t('dashboard.recentReflections.insightsPreview')
              : t('dashboard.recentReflections.goalsPreview')
          }
        ]);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isCoach, t]);

  const quickActions = isCoach ? [
    {
      icon: <Plus className="w-6 h-6" />,
      title: t('dashboard.quickActions.addClient.title'),
      description: t('dashboard.quickActions.addClient.description'),
      action: () => navigate('/coach/clients?action=add'),
      gradient: 'bg-gradient-coral-teal'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: t('dashboard.quickActions.scheduleSession.title'),
      description: t('dashboard.quickActions.scheduleSession.description'),
      action: () => navigate('/coach/sessions?action=schedule'),
      gradient: 'bg-gradient-yellow-coral'
    },
    {
      icon: <PenTool className="w-6 h-6" />,
      title: t('dashboard.quickActions.writeAssessment.title'),
      description: t('dashboard.quickActions.writeAssessment.description'),
      action: () => navigate('/coach/assessments'),
      gradient: 'bg-gradient-warm'
    }
  ] : [
    {
      icon: <Calendar className="w-6 h-6" />,
      title: t('dashboard.quickActions.bookSession.title'),
      description: t('dashboard.quickActions.bookSession.description'),
      action: () => navigate('/client/sessions?action=book'),
      gradient: 'bg-gradient-coral-teal'
    },
    {
      icon: <PenTool className="w-6 h-6" />,
      title: t('dashboard.quickActions.writeReflection.title'),
      description: t('dashboard.quickActions.writeReflection.description'),
      action: () => navigate('/client/reflections?action=new'),
      gradient: 'bg-gradient-yellow-coral'
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: t('dashboard.quickActions.updateGoals.title'),
      description: t('dashboard.quickActions.updateGoals.description'),
      action: () => navigate('/client/goals'),
      gradient: 'bg-gradient-warm'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="glass-card-strong rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-gradient-coral-teal rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <p className="text-lg font-medium">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="card-lumea-strong max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gradient-coral mb-4">
            {t('dashboard.error')}
          </h2>
          <p className="opacity-80 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            {t('dashboard.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-coral-teal rounded-full opacity-10 animate-float"></div>
        <div className="absolute top-60 right-20 w-24 h-24 bg-gradient-cream-peach rounded-full opacity-15 animate-float-delayed"></div>
        <div className="absolute bottom-32 left-32 w-40 h-40 bg-gradient-warm rounded-full opacity-10 animate-float"></div>
      </div>

      <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl-text-right' : ''}`}>
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-bold text-gradient-coral mb-4">
            {isCoach 
              ? t('dashboard.welcome.coach')
              : t('dashboard.welcome.client')
            }
          </h1>
          <p className="text-xl opacity-80">
            {String(profile?.full_name || profile?.name || 'User')}
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card-lumea hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">
                    {isCoach ? t('dashboard.stats.totalClients') : t('dashboard.stats.totalSessions')}
                  </p>
                  <p className="text-3xl font-bold text-gradient-teal">
                    {isCoach ? '12' : stats.totalSessions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-coral-teal rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="card-lumea hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">
                    {t('dashboard.stats.weekSessions')}
                  </p>
                  <p className="text-3xl font-bold text-gradient-coral">
                    {stats.upcomingSessions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-yellow-coral rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="card-lumea hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">
                    {t('dashboard.stats.reflections')}
                  </p>
                  <p className="text-3xl font-bold text-gradient-teal">
                    {stats.totalReflections}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-warm rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="card-lumea hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">
                    {t('dashboard.stats.progress')}
                  </p>
                  <p className="text-3xl font-bold text-gradient-coral">
                    {stats.weeklyProgress}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-coral-teal rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upcoming Sessions */}
          <div className="lg:col-span-2">
            <div className="card-lumea-strong">
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'rtl-flex-row-reverse' : ''}`}>
                <h2 className="text-2xl font-bold text-gradient-teal">
                  {t('dashboard.upcomingSessions.title')}
                </h2>
                <button 
                  onClick={() => navigate(`/${isCoach ? 'coach' : 'client'}/sessions`)}
                  className="btn-tertiary flex items-center space-x-2"
                >
                  <span>{t('dashboard.upcomingSessions.viewAll')}</span>
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rtl-flip' : ''}`} />
                </button>
              </div>

              <div className="space-y-4">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session) => (
                    <div key={session.id} className="glass-card rounded-xl p-4 hover-lift">
                      <div className={`flex items-center justify-between ${isRTL ? 'rtl-flex-row-reverse' : ''}`}>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{session.title}</h3>
                          <div className={`flex items-center space-x-4 text-sm opacity-70 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              <Calendar className="w-4 h-4" />
                              <span>{session.date}</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              <Clock className="w-4 h-4" />
                              <span>{session.time}</span>
                            </div>
                          </div>
                          {(session.coach || session.client) && (
                            <p className="text-sm mt-1 opacity-80">
                              {isCoach ? `${t('dashboard.upcomingSessions.with')} ${session.client}` : `${t('dashboard.upcomingSessions.coach')} ${session.coach}`}
                            </p>
                          )}
                        </div>
                        <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            session.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : session.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {session.status === 'confirmed' ? t('dashboard.upcomingSessions.status.confirmed') : 
                             session.status === 'scheduled' ? t('dashboard.upcomingSessions.status.scheduled') : 
                             t('dashboard.upcomingSessions.status.pending')}
                          </span>
                          <button className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200">
                            <Video className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 opacity-70">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('dashboard.upcomingSessions.noSessions')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="card-lumea-strong">
              <h2 className="text-2xl font-bold text-gradient-coral mb-6">
                {t('dashboard.quickActions.title')}
              </h2>
              <div className="space-y-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full glass-card rounded-xl p-4 hover-lift text-start transition-all duration-300"
                  >
                    <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`${action.gradient} w-12 h-12 rounded-xl flex items-center justify-center`}>
                        {React.cloneElement(action.icon, { className: 'w-6 h-6 text-white' })}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{action.title}</h3>
                        <p className="text-sm opacity-70">{action.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Reflections */}
            <div className="card-lumea-strong">
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'rtl-flex-row-reverse' : ''}`}>
                <h2 className="text-2xl font-bold text-gradient-coral">
                  {t('dashboard.recentReflections.title')}
                </h2>
                <button 
                  onClick={() => navigate(`/${isCoach ? 'coach' : 'client'}/reflections`)}
                  className="btn-tertiary"
                >
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rtl-flip' : ''}`} />
                </button>
              </div>

              <div className="space-y-4">
                {recentReflections.map((reflection) => (
                  <div key={reflection.id} className="glass-card rounded-xl p-4 hover-lift">
                    <div className={`flex items-start space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <span className="text-2xl">{reflection.mood}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{reflection.title}</h3>
                        <p className="text-sm opacity-70 mb-2">{reflection.date}</p>
                        <p className="text-sm opacity-80">{reflection.preview}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Session Duration Analytics (Coach Only) */}
        {isCoach && (
          <div className="mt-8 animate-fade-in">
            <div className="card-lumea-strong">
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'rtl-flex-row-reverse' : ''}`}>
                <div>
                  <h2 className="text-2xl font-bold text-gradient-coral mb-2">
                    {t('dashboard.analytics.title')}
                  </h2>
                  <p className="text-sm opacity-70">
                    {t('dashboard.analytics.subtitle')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-coral-teal rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
              
              {isMobile ? (
                <MobileSessionDurationAnalytics
                  coachId={profile?.id}
                  compact={true}
                />
              ) : (
                <SessionDurationAnalytics
                  coachId={profile?.id}
                  compact={true}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
