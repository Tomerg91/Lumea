/**
 * Coach Homepage Component
 * 
 * Displays the coach's daily dashboard including:
 * - Daily intentions (selected beings)
 * - Today's session schedule
 * - Quick actions and overview
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Users, 
  Heart, 
  Plus, 
  Settings,
  Star,
  TrendingUp,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { 
  intentionService, 
  DailyIntention, 
  IntentionStats,
  formatBeingLabel
} from '../../services/intentionService';
import { useAuth } from '../../contexts/AuthContext';
import { useSessions } from '../../hooks/useSessions';

interface CoachHomepageProps {
  className?: string;
}

export const CoachHomepage: React.FC<CoachHomepageProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  
  const [dailyIntentions, setDailyIntentions] = useState<DailyIntention[]>([]);
  const [intentionStats, setIntentionStats] = useState<IntentionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'en' | 'he'>('en');

  // Load coach's daily data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load today's intentions
      const intentions = await intentionService.getDailyIntentions();
      setDailyIntentions(intentions);
      
      // Load intention statistics
      const stats = await intentionService.getIntentionStats();
      setIntentionStats(stats);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNewIntentions = () => {
    navigate('/select-intentions');
  };

  const handleViewAllSessions = () => {
    navigate('/sessions');
  };

  // Get today's sessions
  const todaySessions = sessions.filter(session => {
    const sessionDate = new Date(session.date).toDateString();
    const today = new Date().toDateString();
    return sessionDate === today;
  });

  const upcomingSessions = todaySessions.filter(session => 
    session.status !== 'Completed' && session.status !== 'Cancelled'
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4',
      className
    )}>
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {language === 'he' ? 'שלום' : 'Welcome back'}, {user?.email?.split('@')[0] || 'Coach'}
              </h1>
              <p className="text-gray-600 mt-1">
                {language === 'he' 
                  ? new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                }
              </p>
            </div>
            
            {/* Language toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  'px-3 py-1 rounded-l-lg text-sm font-medium',
                  language === 'en' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-300'
                )}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('he')}
                className={cn(
                  'px-3 py-1 rounded-r-lg text-sm font-medium',
                  language === 'he' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-300'
                )}
              >
                עב
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Daily Intentions */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Daily Intentions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Heart className="w-5 h-5 text-pink-500 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {language === 'he' ? 'הכוונות שלי היום' : 'My Intentions Today'}
                  </h2>
                </div>
                <button
                  onClick={handleSelectNewIntentions}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  {language === 'he' ? 'עדכן' : 'Update'}
                </button>
              </div>

              {dailyIntentions.length > 0 ? (
                <div className="space-y-2">
                  {dailyIntentions.map((intention) => (
                    <div
                      key={intention.being_id}
                      className="flex items-center p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg"
                    >
                      <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-800 font-medium">
                        {formatBeingLabel(intention, language)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">
                    {language === 'he' 
                      ? 'טרם בחרת כוונות להיום'
                      : 'No intentions selected for today'
                    }
                  </p>
                  <button
                    onClick={handleSelectNewIntentions}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {language === 'he' ? 'בחר כוונות' : 'Select Intentions'}
                  </button>
                </div>
              )}
            </div>

            {/* Intention Stats Card */}
            {intentionStats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {language === 'he' ? 'הסטטיסטיקה שלי' : 'My Stats'}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      {language === 'he' ? 'רצף נוכחי' : 'Current Streak'}
                    </span>
                    <span className="font-bold text-indigo-600">
                      {intentionStats.selection_streak} {language === 'he' ? 'ימים' : 'days'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      {language === 'he' ? 'ימים פעילים (30 ימים)' : 'Active Days (30d)'}
                    </span>
                    <span className="font-bold text-green-600">
                      {intentionStats.days_with_selections}/{intentionStats.total_days}
                    </span>
                  </div>
                  
                  {intentionStats.most_selected_being_en && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">
                        {language === 'he' ? 'הכוונה הפופולרית ביותר' : 'Most Selected'}
                      </p>
                      <p className="font-medium text-gray-900">
                        {language === 'he' 
                          ? intentionStats.most_selected_being_he 
                          : intentionStats.most_selected_being_en
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sessions and Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Today's Sessions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {language === 'he' ? 'הפגישות שלי היום' : "Today's Sessions"}
                  </h2>
                </div>
                <button
                  onClick={handleViewAllSessions}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  {language === 'he' ? 'הצג הכל' : 'View All'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              {sessionsLoading ? (
                <div className="text-center py-6">
                  <div className="w-8 h-8 mx-auto border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {upcomingSessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                    >
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-blue-500 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {session.client?.name || 'Unknown Client'}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(session.date).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                  
                  {upcomingSessions.length > 3 && (
                    <button
                      onClick={handleViewAllSessions}
                      className="w-full p-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      +{upcomingSessions.length - 3} {language === 'he' ? 'עוד' : 'more sessions'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {language === 'he' 
                      ? 'אין פגישות מתוכננות להיום'
                      : 'No sessions scheduled for today'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                {language === 'he' ? 'פעולות מהירות' : 'Quick Actions'}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/sessions/new')}
                  className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-colors text-left"
                >
                  <Plus className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'he' ? 'פגישה חדשה' : 'New Session'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'he' ? 'תזמן פגישה עם לקוח' : 'Schedule with a client'}
                    </p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/clients')}
                  className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-colors text-left"
                >
                  <Users className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'he' ? 'הלקוחות שלי' : 'My Clients'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'he' ? 'נהל פרופילי לקוחות' : 'Manage client profiles'}
                    </p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/analytics')}
                  className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-colors text-left"
                >
                  <TrendingUp className="w-5 h-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'he' ? 'אנליטיקה' : 'Analytics'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'he' ? 'נתוני ביצועים' : 'Performance insights'}
                    </p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg hover:from-gray-100 hover:to-slate-100 transition-colors text-left"
                >
                  <Settings className="w-5 h-5 text-gray-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'he' ? 'הגדרות' : 'Settings'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'he' ? 'העדפות אישיות' : 'Personal preferences'}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachHomepage;