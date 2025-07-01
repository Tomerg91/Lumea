import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useRealtimeSessions } from '../hooks/useSessions';
import { useRealtimeReflections } from '../hooks/useReflections';
import {
  Calendar,
  MessageSquare,
  Users,
  Clock,
  ArrowRight,
  Target,
  Video,
  PenTool,
  AlertCircle,
  CheckCircle,
  Zap,
  BarChart3,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import SessionDurationAnalytics from '../components/analytics/SessionDurationAnalytics';
import { useMobileDetection } from '../hooks/useMobileDetection';
import MobileSessionDurationAnalytics from '../components/analytics/MobileSessionDurationAnalytics';
import { cn } from '../lib/utils';
import { 
  LoadingSkeleton,
  LoadingSpinner,
  StatsCardSkeleton, 
  QuickActionCardSkeleton,
  StatusIndicator,
  LoadingButton
} from '../components/LoadingSystem';
import { toUIStatus } from '@/utils/status';

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

// Helper Components
interface StatsCardProps {
  icon: React.ComponentType<any>;
  title: string;
  value: number;
  color: string;
  isRTL: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon: Icon, title, value, color, isRTL }) => (
  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
    <div className={cn(
      "flex items-center justify-between",
      isRTL && "flex-row-reverse"
    )}>
      <div>
        <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r",
        color
      )}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

interface QuickActionCardProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  action: () => void;
  color: string;
  isRTL: boolean;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  color, 
  isRTL 
}) => (
  <button
    onClick={action}
    className="w-full bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left"
  >
    <div className={cn(
      "flex items-center gap-4",
      isRTL && "flex-row-reverse text-right"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        color
      )}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <ArrowRight className={cn(
        "w-5 h-5 text-gray-400",
        isRTL && "rotate-180"
      )} />
    </div>
  </button>
);

interface SessionCardProps {
  session: UpcomingSession;
  isRTL: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, isRTL }) => (
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
    <div className={cn(
      "flex items-center justify-between",
      isRTL && "flex-row-reverse"
    )}>
      <div className={cn(isRTL && "text-right")}>
        <h3 className="font-semibold text-gray-900 mb-1">{session.title}</h3>
        <div className={cn(
          "flex items-center gap-4 text-sm text-gray-600",
          isRTL && "flex-row-reverse"
        )}>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {session.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {session.time}
          </span>
        </div>
        {(session.coach || session.client) && (
          <p className="text-sm text-gray-700 mt-1">
            {session.coach ? `Coach: ${session.coach}` : `Client: ${session.client}`}
          </p>
        )}
      </div>
      <div className={cn(
        "flex items-center gap-2",
        isRTL && "flex-row-reverse"
      )}>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          session.status === 'confirmed' ? 'bg-green-100 text-green-800' :
          toUIStatus(session.status) === 'pending' ? 'bg-blue-100 text-blue-800' :
          'bg-yellow-100 text-yellow-800'
        )}>
          {session.status === 'confirmed' ? 'Confirmed' :
           toUIStatus(session.status) === 'pending' ? 'Scheduled' : 'Pending'}
        </span>
        <Video className="w-5 h-5 text-blue-500" />
      </div>
    </div>
  </div>
);

interface ReflectionCardProps {
  reflection: RecentReflection;
  isRTL: boolean;
}

const ReflectionCard: React.FC<ReflectionCardProps> = ({ reflection, isRTL }) => (
  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
    <div className={cn(
      "flex items-start justify-between",
      isRTL && "flex-row-reverse"
    )}>
      <div className={cn("flex-1", isRTL && "text-right")}>
        <div className={cn(
          "flex items-center gap-2 mb-2",
          isRTL && "flex-row-reverse"
        )}>
          <span className="text-lg">{reflection.mood}</span>
          <h3 className="font-semibold text-gray-900">{reflection.title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-2">{reflection.preview}</p>
        <p className="text-xs text-gray-500">{reflection.date}</p>
      </div>
      <PenTool className="w-5 h-5 text-purple-500 ml-3" />
    </div>
  </div>
);

interface EmptyStateProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  actionText: string;
  onAction: () => void;
  isRTL: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  actionText, 
  onAction, 
  isRTL 
}) => (
  <div className={cn(
    "text-center py-8",
    isRTL && "text-right"
  )}>
    <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-gray-500" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{description}</p>
    <button
      onClick={onAction}
      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
    >
      {actionText}
    </button>
  </div>
);

const Dashboard = () => {
  const { profile } = useAuth();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isMobile } = useMobileDetection();
  const { data: sessionsData, isLoading: isLoadingSessions, error: sessionsError } = useRealtimeSessions();
  const { data: reflectionsData, isLoading: isLoadingReflections, error: reflectionsError } = useRealtimeReflections();

  const isCoach = profile?.role === 'coach';
  const isClient = profile?.role === 'client';

  const sessions = sessionsData || [];
  const reflections = reflectionsData || [];

  const now = new Date();
  const upcomingSessions = sessions.filter(session => new Date(session.date) > now);
  const completedSessions = sessions.filter(session => session.status === 'Completed');

  const stats: DashboardStats = {
    totalSessions: sessions.length,
    completedSessions: completedSessions.length,
    upcomingSessions: upcomingSessions.length,
    totalReflections: reflections.length,
    weeklyProgress: sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0
  };

  const formattedUpcomingSessions = upcomingSessions.slice(0, 3).map(session => ({
    id: session.id,
    title: isCoach ? 'Coaching Session' : 'Session with Coach',
    date: new Date(session.date).toLocaleDateString(),
    time: new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    coach: isCoach ? undefined : 'Dr. Satya',
    client: isCoach ? 'Client' : undefined,
    status: session.status === 'Upcoming' ? 'scheduled' : session.status === 'Completed' ? 'confirmed' : 'pending'
  }));

  const recentReflections = reflections.map(reflection => ({
    id: reflection.id,
    title: (reflection as any).title || (reflection as any).content?.slice(0, 50) + '...' || 'Reflection',
    date: new Date((reflection as any).created_at || reflection.created_at).toLocaleDateString(),
    mood: (reflection as any).mood_rating ? getMoodEmoji((reflection as any).mood_rating) : '😊',
    preview: (reflection as any).content?.slice(0, 100) + ((reflection as any).content?.length > 100 ? '...' : '') || 'No content'
  }));

  // Helper function to safely get display name
  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.email) {
      return (profile.email as string).split('@')[0];
    }
    return 'User';
  };

  const getMoodEmoji = (rating: number): string => {
    if (rating >= 8) return '😊';
    if (rating >= 6) return '😐';
    if (rating >= 4) return '😔';
    return '😢';
  };

  const quickActions = isCoach ? [
    {
      icon: Users,
      title: 'View Clients',
      description: 'Manage your client relationships',
      action: () => navigate('/coach/clients'),
      color: 'bg-blue-500'
    },
    {
      icon: Calendar,
      title: 'Schedule Session',
      description: 'Book new coaching sessions',
      action: () => navigate('/coach/sessions'),
      color: 'bg-green-500'
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'View performance insights',
      action: () => navigate('/coach/analytics'),
      color: 'bg-purple-500'
    }
  ] : [
    {
      icon: Calendar,
      title: 'Book Session',
      description: 'Schedule your next coaching session',
      action: () => navigate('/sessions'),
      color: 'bg-blue-500'
    },
    {
      icon: PenTool,
      title: 'Write Reflection',
      description: 'Capture your thoughts and insights',
      action: () => navigate('/reflections'),
      color: 'bg-green-500'
    },
    {
      icon: Target,
      title: 'View Goals',
      description: 'Track your progress and achievements',
      action: () => navigate('/goals'),
      color: 'bg-purple-500'
    }
  ];

  if (isLoadingSessions || isLoadingReflections) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className={cn(
          "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
          isRTL && "direction-rtl"
        )}>
          {/* Welcome Header Skeleton */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-8">
            <div className={cn(
              "flex items-center justify-between",
              isRTL && "flex-row-reverse"
            )}>
              <div className="flex-1">
                <LoadingSkeleton width="280px" height="36px" className="mb-2" />
                <LoadingSkeleton width="200px" height="20px" />
              </div>
              <div className="hidden md:block">
                <LoadingSkeleton width="64px" height="64px" variant="rounded" />
              </div>
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <StatsCardSkeleton key={index} delay={index * 100} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <LoadingSkeleton width="24px" height="24px" variant="rounded" />
                  <LoadingSkeleton width="120px" height="24px" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <QuickActionCardSkeleton key={index} delay={index * 150} />
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Sessions Skeleton */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className={cn(
                  "flex items-center justify-between mb-6",
                  isRTL && "flex-row-reverse"
                )}>
                  <div className="flex items-center gap-3">
                    <LoadingSkeleton width="24px" height="24px" variant="rounded" />
                    <LoadingSkeleton width="140px" height="24px" />
                  </div>
                  <LoadingSkeleton width="80px" height="20px" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="bg-gray-50/50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <LoadingSkeleton width="160px" height="20px" />
                        <LoadingSkeleton width="60px" height="16px" variant="badge" />
                      </div>
                      <LoadingSkeleton width="120px" height="16px" className="mb-1" />
                      <LoadingSkeleton width="80px" height="14px" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Reflections Skeleton (for clients) */}
              {!isCoach && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <div className={cn(
                    "flex items-center justify-between mb-6",
                    isRTL && "flex-row-reverse"
                  )}>
                    <div className="flex items-center gap-3">
                      <LoadingSkeleton width="24px" height="24px" variant="rounded" />
                      <LoadingSkeleton width="150px" height="24px" />
                    </div>
                    <LoadingSkeleton width="80px" height="20px" />
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="bg-gray-50/50 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <LoadingSkeleton width="180px" height="18px" />
                          <LoadingSkeleton width="20px" height="20px" variant="circle" />
                        </div>
                        <LoadingSkeleton width="100px" height="14px" className="mb-2" />
                        <LoadingSkeleton width="240px" height="14px" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Analytics Section Skeleton */}
          <div className="mt-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <LoadingSkeleton width="24px" height="24px" variant="rounded" />
                <LoadingSkeleton width="100px" height="24px" />
              </div>
              <LoadingSkeleton width="100%" height="200px" variant="rounded" />
            </div>
          </div>

          {/* Loading Status Indicator */}
          <div className="fixed bottom-4 right-4">
            <StatusIndicator 
              status="loading" 
              message={`${t('loading')}...`}
              className="bg-white/90 backdrop-blur-sm shadow-lg" 
            />
          </div>
        </div>
      </div>
    );
  }

  if (sessionsError || reflectionsError) {
    const errorMessage = sessionsError?.message || reflectionsError?.message || "An unknown error occurred.";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className={cn(
        "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
        isRTL && "direction-rtl"
      )}>
        {/* Welcome Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg mb-8">
          <div className={cn(
            "flex items-center justify-between",
            isRTL && "flex-row-reverse"
          )}>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                {t('dashboard.welcome')}, {getDisplayName()}!
              </h1>
              <p className="text-gray-600 text-lg">
                {isCoach 
                  ? t('dashboard.coachWelcome')
                  : t('dashboard.clientWelcome')
                }
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              icon={Users}
              title={t('dashboard.totalSessions')}
              value={stats.totalSessions}
              color="from-blue-500 to-cyan-500"
              isRTL={isRTL}
            />
            <StatsCard
              icon={CheckCircle}
              title={t('dashboard.completedSessions')}
              value={stats.completedSessions}
              color="from-green-500 to-emerald-500"
              isRTL={isRTL}
            />
            <StatsCard
              icon={Calendar}
              title={t('dashboard.upcomingSessions')}
              value={stats.upcomingSessions}
              color="from-orange-500 to-amber-500"
              isRTL={isRTL}
            />
            <StatsCard
              icon={MessageSquare}
              title={t('dashboard.totalReflections')}
              value={stats.totalReflections}
              color="from-purple-500 to-pink-500"
              isRTL={isRTL}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-teal-500" />
                {t('dashboard.quickActions')}
              </h2>
              <div className="space-y-4">
                {quickActions.map((action, index) => (
                  <QuickActionCard
                    key={index}
                    {...action}
                    isRTL={isRTL}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Sessions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className={cn(
                "flex items-center justify-between mb-6",
                isRTL && "flex-row-reverse"
              )}>
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-blue-500" />
                  {t('dashboard.upcomingSessions')}
                </h2>
                <button
                  onClick={() => navigate('/sessions')}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  {t('dashboard.viewAll')}
                  <ChevronRight className={cn(
                    "w-4 h-4",
                    isRTL && "rotate-180"
                  )} />
                </button>
              </div>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isRTL={isRTL}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title={t('dashboard.noUpcomingSessions')}
                  description={t('dashboard.scheduleNewSession')}
                  actionText={t('dashboard.bookSession')}
                  onAction={() => navigate('/sessions')}
                  isRTL={isRTL}
                />
              )}
            </div>

            {/* Recent Reflections */}
            {!isCoach && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className={cn(
                  "flex items-center justify-between mb-6",
                  isRTL && "flex-row-reverse"
                )}>
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-purple-500" />
                    {t('dashboard.recentReflections')}
                  </h2>
                  <button
                    onClick={() => navigate('/reflections')}
                    className="text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200 flex items-center gap-2"
                  >
                    {t('dashboard.viewAll')}
                    <ChevronRight className={cn(
                      "w-4 h-4",
                      isRTL && "rotate-180"
                    )} />
                  </button>
                </div>
                {recentReflections.length > 0 ? (
                  <div className="space-y-4">
                    {recentReflections.map((reflection) => (
                      <ReflectionCard
                        key={reflection.id}
                        reflection={reflection}
                        isRTL={isRTL}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title={t('dashboard.noReflections')}
                    description={t('dashboard.writeFirstReflection')}
                    actionText={t('dashboard.createReflection')}
                    onAction={() => navigate('/reflections')}
                    isRTL={isRTL}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mt-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-indigo-500" />
              {t('dashboard.analytics')}
            </h2>
            {isMobile ? (
              <MobileSessionDurationAnalytics />
            ) : (
              <SessionDurationAnalytics />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
