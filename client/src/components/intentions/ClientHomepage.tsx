/**
 * Client Homepage Component
 * 
 * Displays the client's daily dashboard including:
 * - Daily intentions (selected beings)
 * - Upcoming session information
 * - Progress tracking and motivation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  Heart, 
  Plus, 
  Star,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  MessageCircle,
  Target,
  BookOpen
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

interface ClientHomepageProps {
  className?: string;
}

export const ClientHomepage: React.FC<ClientHomepageProps> = ({ className }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessions, loading: sessionsLoading } = useSessions();
  
  const [dailyIntentions, setDailyIntentions] = useState<DailyIntention[]>([]);
  const [intentionStats, setIntentionStats] = useState<IntentionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<'en' | 'he'>('en');

  // Load client's daily data
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

  // Get upcoming sessions for client
  const upcomingSessions = sessions.filter(session => {
    const sessionDate = new Date(session.date);
    const now = new Date();
    return sessionDate >= now && (session.status === 'Upcoming' || session.status === 'upcoming');
  });

  const nextSession = upcomingSessions[0];
  const isToday = nextSession && new Date(nextSession.date).toDateString() === new Date().toDateString();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4',
      className
    )}>
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {language === 'he' ? 'שלום' : 'Welcome back'}, {user?.name || 'Client'}
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
                    ? 'bg-green-600 text-white' 
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
                    ? 'bg-green-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-300'
                )}
              >
                עב
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Daily Intentions & Stats */}
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
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  {language === 'he' ? 'עדכן' : 'Update'}
                </button>
              </div>

              {dailyIntentions.length > 0 ? (
                <div className="space-y-2">
                  {dailyIntentions.map((intention, index) => (
                    <div
                      key={intention.being_id}
                      className="flex items-center p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg"
                    >
                      <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-800 font-medium">
                        {formatBeingLabel(intention, language)}
                      </span>
                    </div>
                  ))}
                  
                  {/* Motivational message */}
                  <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg text-center">
                    <p className="text-sm text-gray-700">
                      {language === 'he' 
                        ? 'זכרו את הכוונות שלכם לאורך היום ✨'
                        : 'Remember your intentions throughout the day ✨'
                      }
                    </p>
                  </div>
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
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {language === 'he' ? 'בחר כוונות' : 'Select Intentions'}
                  </button>
                </div>
              )}
            </div>

            {/* Progress Stats Card */}
            {intentionStats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {language === 'he' ? 'ההתקדמות שלי' : 'My Progress'}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* Current Streak */}
                  <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {intentionStats.selection_streak}
                    </div>
                    <div className="text-sm text-gray-600">
                      {language === 'he' ? 'ימים ברצף' : 'day streak'}
                    </div>
                  </div>
                  
                  {/* Activity Rate */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      {language === 'he' ? 'ימים פעילים' : 'Active Days'}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-blue-600">
                        {intentionStats.days_with_selections}
                      </span>
                      <span className="text-gray-500 text-sm">
                        /{intentionStats.total_days}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${(intentionStats.days_with_selections / intentionStats.total_days) * 100}%` 
                      }}
                    />
                  </div>
                  
                  {intentionStats.most_selected_being_en && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">
                        {language === 'he' ? 'הכוונה הפופולרית שלי' : 'My Favorite Intention'}
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
            
            {/* Next Session Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {language === 'he' ? 'הפגישה הבאה' : 'Next Session'}
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
              ) : nextSession ? (
                <div 
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/sessions/${nextSession.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {nextSession.coach?.name || 'Your Coach'}
                        </p>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {isToday ? (
                            language === 'he' ? 'היום' : 'Today'
                          ) : (
                            new Date(nextSession.date).toLocaleDateString(
                              language === 'he' ? 'he-IL' : 'en-US'
                            )
                          )}
                          <Clock className="w-3 h-3 ml-3 mr-1" />
                          {new Date(nextSession.date).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {isToday && (
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {language === 'he' ? 'היום' : 'Today'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {nextSession.notes && (
                    <div className="mt-3 p-2 bg-white rounded text-sm text-gray-600">
                      {nextSession.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">
                    {language === 'he' 
                      ? 'אין פגישות מתוכננות'
                      : 'No upcoming sessions scheduled'
                    }
                  </p>
                  <p className="text-sm text-gray-400">
                    {language === 'he' 
                      ? 'צרו קשר עם המאמן שלכם לתיאום פגישה'
                      : 'Contact your coach to schedule a session'
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
                  onClick={() => navigate('/reflections/new')}
                  className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-colors text-left"
                >
                  <BookOpen className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'he' ? 'רפלקציה יומית' : 'Daily Reflection'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'he' ? 'חשבו על היום שלכם' : 'Reflect on your day'}
                    </p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/goals')}
                  className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-colors text-left"
                >
                  <Target className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'he' ? 'המטרות שלי' : 'My Goals'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'he' ? 'עקבו אחר ההתקדמות' : 'Track your progress'}
                    </p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/sessions')}
                  className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-colors text-left"
                >
                  <Calendar className="w-5 h-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'he' ? 'הפגישות שלי' : 'My Sessions'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'he' ? 'היסטוריית פגישות' : 'Session history'}
                    </p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/resources')}
                  className="flex items-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-colors text-left"
                >
                  <BookOpen className="w-5 h-5 text-orange-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'he' ? 'משאבים' : 'Resources'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'he' ? 'חומרי למידה' : 'Learning materials'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Motivational Quote */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center mb-3">
                <Star className="w-5 h-5 text-yellow-300 mr-2" />
                <h3 className="text-lg font-semibold">
                  {language === 'he' ? 'השראה להיום' : 'Today\'s Inspiration'}
                </h3>
              </div>
              <p className="text-indigo-100 italic">
                {language === 'he' 
                  ? '"כל יום הוא הזדמנות חדשה לגדול ולהתפתח"'
                  : '"Every day is a new opportunity to grow and evolve"'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientHomepage;