import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertCircle, BarChart3, Download } from 'lucide-react';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { DateRangePicker } from '../components/analytics/DateRangePicker';

interface AnalyticsData {
  overview: {
    totalSessions: number;
    totalClients: number;
    totalCoaches: number;
    totalReflections: number;
    lastUpdated: Date;
  };
  sessionMetrics: any;
  clientEngagement: any;
  coachPerformance: any;
  reflectionAnalytics: any;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

const AnalyticsPage: React.FC = () => {
  const { profile } = useAuth();
  const { isRTL, t } = useLanguage();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  });
  const [refreshing, setRefreshing] = useState(false);

  const isCoach = profile?.role === 'coach';
  const isAdmin = profile?.role === 'admin';

  // Check if user has access to analytics
  const hasAnalyticsAccess = isCoach || isAdmin;

  useEffect(() => {
    if (hasAnalyticsAccess) {
      fetchAnalyticsData();
    }
  }, [hasAnalyticsAccess, dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      });

      const response = await fetch(`/api/analytics/dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized access');
        } else if (response.status === 403) {
          throw new Error('Access denied');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setAnalyticsData(data);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics data');
      
      // Set mock data for development/testing
      setAnalyticsData({
        overview: {
          totalSessions: 156,
          totalClients: 23,
          totalCoaches: 4,
          totalReflections: 342,
          lastUpdated: new Date()
        },
        sessionMetrics: {
          totalSessions: 156,
          completedSessions: 142,
          cancelledSessions: 8,
          completionRate: 91.0,
          sessionsByStatus: { completed: 142, cancelled: 8, pending: 6 },
          averageSessionsPerWeek: 12.3,
          sessionTrends: [
            { date: '2024-01-01', sessions: 8, completed: 7 },
            { date: '2024-01-02', sessions: 12, completed: 11 },
            { date: '2024-01-03', sessions: 6, completed: 6 },
            { date: '2024-01-04', sessions: 15, completed: 13 },
            { date: '2024-01-05', sessions: 9, completed: 8 }
          ]
        },
        clientEngagement: {
          totalClients: 23,
          activeClients: 18,
          clientRetentionRate: 78.3,
          averageSessionsPerClient: 6.8,
          reflectionSubmissionRate: 67.5,
          clientEngagementTrends: [
            { date: '2024-01-01', activeClients: 15, reflectionsSubmitted: 12 },
            { date: '2024-01-02', activeClients: 18, reflectionsSubmitted: 16 },
            { date: '2024-01-03', activeClients: 16, reflectionsSubmitted: 11 },
            { date: '2024-01-04', activeClients: 19, reflectionsSubmitted: 18 },
            { date: '2024-01-05', activeClients: 17, reflectionsSubmitted: 14 }
          ]
        },
        coachPerformance: {
          totalCoaches: 4,
          activeCoaches: 4,
          coaches: [
            {
              coachId: '1',
              coachName: 'Dr. Sarah Cohen',
              totalSessions: 45,
              completedSessions: 42,
              totalClients: 8,
              averageSessionDuration: 52.5,
              clientSatisfactionScore: 4.7,
              notesTaken: 38
            },
            {
              coachId: '2',
              coachName: 'Michael Rosen',
              totalSessions: 38,
              completedSessions: 35,
              totalClients: 6,
              averageSessionDuration: 48.2,
              clientSatisfactionScore: 4.5,
              notesTaken: 31
            }
          ]
        },
        reflectionAnalytics: {
          totalReflections: 342,
          submissionRate: 67.5,
          averageCompletionTime: 18.5,
          reflectionsByCategory: {
            personal: 89,
            goals: 76,
            challenges: 58,
            growth: 63,
            relationships: 56
          },
          categoryEngagement: [
            { category: 'personal', averageScore: 4.2, responseCount: 89 },
            { category: 'goals', averageScore: 4.0, responseCount: 76 },
            { category: 'challenges', averageScore: 3.8, responseCount: 58 },
            { category: 'growth', averageScore: 4.3, responseCount: 63 },
            { category: 'relationships', averageScore: 3.9, responseCount: 56 }
          ]
        },
        dateRange
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExportData = async (format: 'json' | 'csv' | 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams({
        format,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      });

      const response = await fetch(`/api/analytics/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Set appropriate file extension
        const extension = format === 'excel' ? 'xlsx' : format;
        a.download = `analytics-${new Date().toISOString().split('T')[0]}.${extension}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data');
    }
  };

  if (!hasAnalyticsAccess) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="card-lumea-strong max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gradient-purple mb-4">
            Analytics Access Required / נדרשת גישה לאנליטיקה
          </h2>
          <p className="opacity-80 mb-6">
            Analytics are available for coaches and administrators only. / 
            אנליטיקה זמינה למאמנים ומנהלים בלבד.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary"
          >
            Go Back / חזור
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="glass-card-strong rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-gradient-teal-blue rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <p className="text-lg font-medium">Loading Analytics... / טוען אנליטיקה...</p>
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
        <div className="mb-6 lg:mb-8 animate-fade-in">
          <div className="flex flex-col space-y-6 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gradient-purple mb-2 lg:mb-4">
                Analytics Dashboard / לוח אנליטיקה
              </h1>
              <p className="text-lg lg:text-xl opacity-80">
                Comprehensive insights and performance metrics / 
                תובנות מקיפות ומדדי ביצועים
              </p>
            </div>
            
            {/* Controls - Mobile Optimized */}
            <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:space-x-4">
              {/* Date Range Picker - Full width on mobile */}
              <div className="w-full lg:w-auto">
                <DateRangePicker
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={setDateRange}
                />
              </div>
              
              {/* Export Buttons - Mobile Grid */}
              <div className="grid grid-cols-2 lg:flex gap-2 lg:gap-2">
                <button
                  onClick={() => handleExportData('csv')}
                  className="btn-secondary flex items-center justify-center space-x-2 text-sm lg:text-base"
                  disabled={refreshing}
                  title="Export as CSV file"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={() => handleExportData('excel')}
                  className="btn-secondary flex items-center justify-center space-x-2 text-sm lg:text-base"
                  disabled={refreshing}
                  title="Export as Excel file"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                  onClick={() => handleExportData('pdf')}
                  className="btn-secondary flex items-center justify-center space-x-2 text-sm lg:text-base"
                  disabled={refreshing}
                  title="Export as PDF report"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={() => handleExportData('json')}
                  className="btn-secondary flex items-center justify-center space-x-2 text-sm lg:text-base"
                  disabled={refreshing}
                  title="Export as JSON data"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          {analyticsData && (
            <div className="text-sm opacity-70">
              Last updated: {new Date(analyticsData.overview.lastUpdated).toLocaleString()} /
              עדכון אחרון: {new Date(analyticsData.overview.lastUpdated).toLocaleString('he-IL')}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
              <button
                onClick={fetchAnalyticsData}
                className="ml-auto btn-tertiary text-sm"
              >
                Retry / נסה שוב
              </button>
            </div>
          </div>
        )}

        {/* Analytics Dashboard */}
        {analyticsData && (
          <div className="animate-fade-in">
            <AnalyticsDashboard data={analyticsData} />
          </div>
        )}

        {/* Refresh Indicator */}
        {refreshing && (
          <div className="fixed bottom-4 right-4 glass-card p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Refreshing... / מרענן...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage; 