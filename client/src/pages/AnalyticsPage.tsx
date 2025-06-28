import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { AlertCircle, BarChart3, Download, RefreshCw, DollarSign, Activity, TrendingUp, Sparkles, Shield } from 'lucide-react';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { RevenueAnalyticsDashboard } from '../components/analytics/RevenueAnalyticsDashboard';
import { DateRangePicker } from '../components/analytics/DateRangePicker';
import HIPAAComplianceDashboard from '../components/analytics/HIPAAComplianceDashboard';
import { useAnalyticsData } from '../hooks/useAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LoadingSkeleton,
  LoadingSpinner,
  StatusIndicator
} from '../components/LoadingSystem';

const AnalyticsPage: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
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
      <div className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center",
        isRTL && "rtl"
      )}>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto text-center shadow-lg border border-white/20">
          <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl w-fit mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            {t('analytics.accessDenied')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('analytics.accessDeniedDesc')}
          </p>
        </div>
      </div>
    );
  }

  if (loading && !analyticsData) {
    return (
      <div className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100",
        isRTL && "rtl"
      )}>
        <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
          {/* Header Skeleton */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <LoadingSkeleton width="56px" height="56px" variant="rounded" />
              <LoadingSkeleton width="200px" height="48px" />
            </div>
            <LoadingSkeleton width="400px" height="20px" className="mx-auto" />
          </div>

          {/* Controls Skeleton */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <div className={cn(
              "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4",
              isRTL && "lg:flex-row-reverse"
            )}>
              {/* Date Range Picker Skeleton */}
              <div className="flex items-center gap-3">
                <LoadingSkeleton width="80px" height="16px" />
                <LoadingSkeleton width="200px" height="40px" variant="rounded" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className={cn(
                "flex gap-2",
                isRTL && "flex-row-reverse"
              )}>
                <LoadingSkeleton width="100px" height="40px" variant="button" />
                <LoadingSkeleton width="120px" height="40px" variant="button" />
              </div>
            </div>
          </div>

          {/* Analytics Tabs Skeleton */}
          <div className="space-y-6">
            {/* Tab Navigation Skeleton */}
            <div className="bg-gray-100/80 p-1 rounded-xl">
              <div className={cn(
                "grid w-full gap-1",
                isAdmin ? "grid-cols-4" : "grid-cols-3"
              )}>
                {Array.from({ length: isAdmin ? 4 : 3 }).map((_, index) => (
                  <LoadingSkeleton 
                    key={index} 
                    height="48px" 
                    variant="rounded" 
                    delay={index * 50}
                  />
                ))}
              </div>
            </div>

            {/* Tab Content Skeleton */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <LoadingSkeleton width="24px" height="24px" variant="rounded" />
                <LoadingSkeleton width="180px" height="32px" />
              </div>
              
              {/* Dashboard Content Skeleton */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6">
                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="bg-white/80 rounded-xl p-4">
                      <LoadingSkeleton width="100px" height="16px" className="mb-2" />
                      <LoadingSkeleton width="60px" height="32px" className="mb-2" />
                      <LoadingSkeleton width="80px" height="14px" />
                    </div>
                  ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white/80 rounded-xl p-6">
                    <LoadingSkeleton width="150px" height="20px" className="mb-4" />
                    <LoadingSkeleton width="100%" height="200px" variant="rounded" />
                  </div>
                  <div className="bg-white/80 rounded-xl p-6">
                    <LoadingSkeleton width="150px" height="20px" className="mb-4" />
                    <LoadingSkeleton width="100%" height="200px" variant="rounded" />
                  </div>
                </div>

                {/* Additional Content Skeleton */}
                <div className="mt-6 bg-white/80 rounded-xl p-6">
                  <LoadingSkeleton width="200px" height="20px" className="mb-4" />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <LoadingSkeleton width="150px" height="16px" />
                        <LoadingSkeleton width="60px" height="16px" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Status Indicator */}
          <div className="fixed bottom-4 right-4">
            <StatusIndicator 
              status="loading" 
              message={t('analytics.loading')}
              className="bg-white/90 backdrop-blur-sm shadow-lg" 
            />
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
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-2xl mx-auto shadow-lg">
            <div className={cn(
              "flex items-center",
              isRTL && "flex-row-reverse"
            )}>
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  {t('analytics.loadError')}
                </h3>
                <p className="text-red-700 mt-1">
                  {error.message || t('analytics.loadErrorDesc')}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={handleRefresh}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('analytics.retry')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100",
      isRTL && "rtl"
    )}>
      <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {t('analytics.title')}
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t('analytics.description')}
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className={cn(
            "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4",
            isRTL && "lg:flex-row-reverse"
          )}>
            {/* Date Range Picker */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">{t('analytics.dateRange')}:</span>
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
              />
            </div>

            {/* Action Buttons */}
            <div className={cn(
              "flex gap-2",
              isRTL && "flex-row-reverse"
            )}>
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin", !isRTL && "mr-2", isRTL && "ml-2")} />
                {t('analytics.refresh')}
              </Button>

              <div className="relative">
                <select
                  onChange={(e) => handleExportData(e.target.value as any)}
                  defaultValue=""
                  className="appearance-none bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 pr-8 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 cursor-pointer shadow-lg"
                >
                  <option value="" disabled>
                    {t('analytics.export')}
                  </option>
                  <option value="json">{t('analytics.exportJson')}</option>
                  <option value="csv">{t('analytics.exportCsv')}</option>
                  <option value="pdf">{t('analytics.exportPdf')}</option>
                  <option value="excel">{t('analytics.exportExcel')}</option>
                </select>
                <Download className="w-4 h-4 text-white absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className={cn(
            "grid w-full bg-gray-100/80 p-1 rounded-xl",
            isAdmin ? "grid-cols-4" : "grid-cols-3"
          )}>
            <TabsTrigger 
              value="overview" 
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg",
                isRTL && "flex-row-reverse"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t('analytics.overview')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="revenue" 
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg",
                isRTL && "flex-row-reverse"
              )}
            >
              <DollarSign className="w-4 h-4" />
              <span>{t('analytics.revenue')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="realtime" 
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg",
                isRTL && "flex-row-reverse"
              )}
            >
              <Activity className="w-4 h-4" />
              <span>{t('analytics.realtime')}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="compliance" 
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg",
                  isRTL && "flex-row-reverse"
                )}
              >
                <Shield className="w-4 h-4" />
                <span>{t('analytics.compliance')}</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {analyticsData && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {t('analytics.overviewTitle')}
                  </h2>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6">
                  <AnalyticsDashboard 
                    data={analyticsData} 
                    className=""
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {t('analytics.revenueTitle')}
                </h2>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6">
                <RevenueAnalyticsDashboard />
              </div>
            </div>
          </TabsContent>

          {/* Real-time Tab */}
          <TabsContent value="realtime">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {t('analytics.realtimeTitle')}
                </h2>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
                {/* Real-time Analytics Dashboard - To be implemented */}
                <div className="text-center py-12">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl w-fit mx-auto mb-6">
                    <Activity className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('analytics.realtimeComingSoon')}</h3>
                  <p className="text-gray-600 mb-4">{t('analytics.realtimeDesc')}</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-sm text-blue-800">
                      🚀 {t('analytics.realtimeFeatures')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Compliance Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="compliance">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {t('analytics.complianceTitle')}
                  </h2>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6">
                  <HIPAAComplianceDashboard />
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Loading Indicator for Refresh */}
        {loading && analyticsData && (
          <div className={cn(
            "fixed bottom-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2 border border-white/20",
            isRTL ? "left-4" : "right-4"
          )}>
            <div className={cn(
              "flex items-center gap-2 text-gray-600",
              isRTL && "flex-row-reverse"
            )}>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('analytics.updating')}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>{t('analytics.footerText')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage; 