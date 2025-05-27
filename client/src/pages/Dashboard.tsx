import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
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
  Zap
} from 'lucide-react';

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
  const { isRTL, t } = useLanguage();
  const navigate = useNavigate();
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
          const [statsResponse, sessionsResponse, reflectionsResponse] = await Promise.all([
            fetch('/api/dashboard/stats'),
            fetch('/api/sessions/upcoming'),
            fetch('/api/reflections/recent')
          ]);

          if (statsResponse.ok && sessionsResponse.ok && reflectionsResponse.ok) {
            const [statsData, sessionsData, reflectionsData] = await Promise.all([
              statsResponse.json(),
              sessionsResponse.json(),
              reflectionsResponse.json()
            ]);

            setStats(statsData);
            setUpcomingSessions(sessionsData);
            setRecentReflections(reflectionsData);
            return;
          }
        } catch (apiError) {
          console.log('API unavailable, using mock data');
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
              title: 'מפגש עם שרה מזרחי / Session with Sarah Mizrahi',
              date: '2024-01-15',
              time: '14:00',
              client: 'שרה מזרחי / Sarah Mizrahi',
              status: 'confirmed'
            },
            {
              id: '2',
              title: 'מפגש עם דוד כהן / Session with David Cohen', 
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
              title: 'מפגש הנחיה אישית / Personal Guidance Session',
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
            title: isCoach ? 'הערכה שבועית / Weekly Assessment' : 'יומן אישי / Personal Journal',
            date: '2024-01-14',
            mood: '😊',
            preview: isCoach 
              ? 'התקדמות מעולה של הלקוחות השבוע... / Excellent client progress this week...'
              : 'היום הרגשתי יותר בטוח בעצמי... / Today I felt more confident...'
          },
          {
            id: '2', 
            title: isCoach ? 'תובנות מפגש / Session Insights' : 'מחשבות על המטרות / Thoughts on Goals',
            date: '2024-01-12',
            mood: '🎯',
            preview: isCoach
              ? 'גילויים חשובים במפגש עם לקוח... / Important discoveries in client session...'
              : 'הבנתי שאני צריך להתמקד יותר ב... / I realized I need to focus more on...'
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
  }, [isCoach]);

  const quickActions = isCoach ? [
    {
      icon: <Plus className="w-6 h-6" />,
      title: 'הוסף לקוח חדש / Add New Client',
      description: 'צור פרופיל לקוח חדש / Create new client profile',
      action: () => navigate('/coach/clients?action=add'),
      gradient: 'bg-gradient-teal-blue'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'תזמן מפגש / Schedule Session',
      description: 'הזמן מפגש עם לקוח / Schedule a client session',
      action: () => navigate('/coach/sessions?action=schedule'),
      gradient: 'bg-gradient-purple'
    },
    {
      icon: <PenTool className="w-6 h-6" />,
      title: 'כתוב הערכה / Write Assessment',
      description: 'צור הערכה חדשה / Create new assessment',
      action: () => navigate('/coach/assessments'),
      gradient: 'bg-gradient-yellow-peach'
    }
  ] : [
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'הזמן מפגש / Book Session',
      description: 'הזמן מפגש חדש / Schedule new session',
      action: () => navigate('/client/sessions?action=book'),
      gradient: 'bg-gradient-teal-blue'
    },
    {
      icon: <PenTool className="w-6 h-6" />,
      title: 'כתוב הרהור / Write Reflection',
      description: 'שתף את המחשבות שלך / Share your thoughts',
      action: () => navigate('/client/reflections?action=new'),
      gradient: 'bg-gradient-purple'
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: 'עדכן מטרות / Update Goals',
      description: 'עקוב אחר ההתקדמות / Track your progress',
      action: () => navigate('/client/goals'),
      gradient: 'bg-gradient-yellow-peach'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="glass-card-strong rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-gradient-teal-blue rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <p className="text-lg font-medium">טוען נתונים... / Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="card-lumea-strong max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gradient-purple mb-4">
            שגיאה / Error
          </h2>
          <p className="opacity-80 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            נסה שוב / Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-pink rounded-full opacity-10 animate-float"></div>
        <div className="absolute top-60 right-20 w-24 h-24 bg-gradient-lavender rounded-full opacity-15 animate-float-delayed"></div>
        <div className="absolute bottom-32 left-32 w-40 h-40 bg-gradient-yellow-peach rounded-full opacity-10 animate-float"></div>
      </div>

      <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl-text-right' : ''}`}>
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-bold text-gradient-purple mb-4">
            {isCoach 
              ? 'ברוך הבא, מאמן / Welcome, Coach' 
              : 'ברוך הבא / Welcome'
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
                    {isCoach ? 'סה"כ לקוחות / Total Clients' : 'סה"כ מפגשים / Total Sessions'}
                  </p>
                  <p className="text-3xl font-bold text-gradient-teal">
                    {isCoach ? '12' : stats.totalSessions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-teal-blue rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="card-lumea hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">
                    מפגשים השבוע / This Week's Sessions
                  </p>
                  <p className="text-3xl font-bold text-gradient-purple">
                    {stats.upcomingSessions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-purple rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="card-lumea hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">
                    הרהורים / Reflections
                  </p>
                  <p className="text-3xl font-bold text-gradient-teal">
                    {stats.totalReflections}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-yellow-peach rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="card-lumea hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">
                    התקדמות / Progress
                  </p>
                  <p className="text-3xl font-bold text-gradient-purple">
                    {stats.weeklyProgress}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-pink rounded-xl flex items-center justify-center">
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
                  מפגשים קרובים / Upcoming Sessions
                </h2>
                <button 
                  onClick={() => navigate(`/${isCoach ? 'coach' : 'client'}/sessions`)}
                  className="btn-tertiary flex items-center space-x-2"
                >
                  <span>צפה בכל / View All</span>
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
                              {isCoach ? `עם: ${session.client}` : `מאמן: ${session.coach}`}
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
                            {session.status === 'confirmed' ? '✅ מאושר / Confirmed' : 
                             session.status === 'scheduled' ? '📅 מתוזמן / Scheduled' : 
                             '⏱️ ממתין / Pending'}
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
                    <p>אין מפגשים קרובים / No upcoming sessions</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="card-lumea-strong">
              <h2 className="text-2xl font-bold text-gradient-purple mb-6">
                פעולות מהירות / Quick Actions
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
                <h2 className="text-2xl font-bold text-gradient-purple">
                  הרהורים אחרונים / Recent Reflections
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
      </div>
    </div>
  );
};

export default Dashboard;
