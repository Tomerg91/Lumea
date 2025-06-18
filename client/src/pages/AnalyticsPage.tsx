import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertCircle, BarChart3, Download, RefreshCw, DollarSign, Activity, TrendingUp } from 'lucide-react';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { RevenueAnalyticsDashboard } from '../components/analytics/RevenueAnalyticsDashboard';
import { DateRangePicker } from '../components/analytics/DateRangePicker';
import HIPAAComplianceDashboard from '../components/analytics/HIPAAComplianceDashboard';
import { useAnalyticsData } from '../hooks/useAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const AnalyticsPage: React.FC = () => {
  const { profile } = useAuth();
  const { isRTL, t } = useLanguage();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'realtime' | 'compliance'>('overview');

  const isCoach = profile?.role === 'coach';
  const isAdmin = profile?.role === 'admin';

  // Check if user has access to analytics
  const hasAnalyticsAccess = isCoach || isAdmin;

  // Use the new Supabase-based analytics hook
  const { 
    data: analyticsData, 
    isLoading: loading, 
    error, 
    refetch 
  } = useAnalyticsData(dateRange.startDate, dateRange.endDate);

  const handleExportData = async (format: 'json' | 'csv' | 'pdf' | 'excel') => {
    try {
      if (!analyticsData) {
        console.warn('No analytics data available for export');
        return;
      }

      // Create export data
      const exportData = {
        generatedAt: new Date().toISOString(),
        dateRange: {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        },
        analytics: analyticsData
      };

      let content: string;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(exportData, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'csv': {
          // Convert to CSV format (simplified)
          const csvRows = [
            'Metric,Value',
            `Total Sessions,${analyticsData.overview.totalSessions}`,
            `Total Clients,${analyticsData.overview.totalClients}`,
            `Total Coaches,${analyticsData.overview.totalCoaches}`,
            `Total Reflections,${analyticsData.overview.totalReflections}`,
            `Session Completion Rate,${analyticsData.sessionMetrics.completionRate.toFixed(2)}%`,
            `Client Retention Rate,${analyticsData.clientEngagement.clientRetentionRate.toFixed(2)}%`,
            `Average Sessions per Client,${analyticsData.clientEngagement.averageSessionsPerClient.toFixed(2)}`,
            `Reflection Submission Rate,${analyticsData.reflectionAnalytics.submissionRate.toFixed(2)}%`
          ];
          content = csvRows.join('\n');
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        }
        case 'pdf':
          // For PDF export, we would typically use a library like jsPDF
          console.log('PDF export functionality to be implemented');
          return;
        case 'excel':
          // For Excel export, we would typically use a library like xlsx
          console.log('Excel export functionality to be implemented');
          return;
        default:
          throw new Error(`Export format ${format} not implemented yet`);
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      // You could show a toast notification here
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  if (!hasAnalyticsAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 max-w-md mx-auto text-center shadow-lg">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You need coach or admin privileges to access analytics.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Analytics Dashboard
            </h1>
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading analytics data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-2xl mx-auto">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  Failed to Load Analytics
                </h3>
                <p className="text-red-700 mt-1">
                  {error.message || 'Unable to fetch analytics data. Please try again.'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive insights into your coaching platform
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Date Range Picker */}
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
            />

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <div className="relative">
                <select
                  onChange={(e) => handleExportData(e.target.value as any)}
                  defaultValue=""
                  className="appearance-none bg-blue-600 text-white px-4 py-2 pr-8 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <option value="" disabled>
                    Export
                  </option>
                  <option value="json">Export JSON</option>
                  <option value="csv">Export CSV</option>
                  <option value="pdf">Export PDF</option>
                  <option value="excel">Export Excel</option>
                </select>
                <Download className="w-4 h-4 text-white absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Revenue</span>
            </TabsTrigger>
            <TabsTrigger value="realtime" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Real-time</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="compliance" className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Compliance</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {analyticsData && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <AnalyticsDashboard 
                  data={analyticsData} 
                  className=""
                />
              </div>
            )}
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <RevenueAnalyticsDashboard />
            </div>
          </TabsContent>

          {/* Real-time Tab */}
          <TabsContent value="realtime">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              {/* Real-time Analytics Dashboard - To be implemented */}
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
                <p className="text-gray-600 mb-4">Live data monitoring and real-time KPI tracking</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    🚀 Real-time dashboard coming soon! This will include live session monitoring, 
                    instant notifications, and real-time performance metrics.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Compliance Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="compliance">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <HIPAAComplianceDashboard />
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Loading Indicator for Refresh */}
        {loading && analyticsData && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2">
            <div className="flex items-center space-x-2 text-gray-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Updating...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage; 