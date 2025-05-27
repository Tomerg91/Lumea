import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Clock, 
  TrendingUp, 
  BarChart3, 
  Calendar,
  Filter,
  Download,
  Users,
  Timer,
  Pause,
  Edit,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getDurationAnalytics, 
  DurationAnalytics, 
  AnalyticsSummary 
} from '../../services/sessionService';
import { cn } from '../../lib/utils';

interface SessionDurationAnalyticsProps {
  className?: string;
  coachId?: string;
  clientId?: string;
  compact?: boolean;
}

interface AnalyticsFilters {
  coachId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  sortBy: 'date' | 'duration' | 'actualDuration' | 'adjustedDuration';
  sortOrder: 'asc' | 'desc';
  limit: number;
  page: number;
}

interface ChartData {
  date: string;
  plannedDuration: number;
  actualDuration: number;
  adjustedDuration?: number;
  efficiency: number; // actual vs planned percentage
}

const SessionDurationAnalytics: React.FC<SessionDurationAnalyticsProps> = ({
  className,
  coachId,
  clientId,
  compact = false
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [analytics, setAnalytics] = useState<DurationAnalytics[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filters, setFilters] = useState<AnalyticsFilters>({
    coachId: coachId || (user?.role === 'coach' ? user.id : undefined),
    clientId: clientId || (user?.role === 'client' ? user.id : undefined),
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0],
    sortBy: 'date',
    sortOrder: 'desc',
    limit: 50,
    page: 1
  });

  const chartData = useMemo<ChartData[]>(() => {
    return analytics.map(session => ({
      date: new Date(session.date).toLocaleDateString(),
      plannedDuration: session.plannedDuration,
      actualDuration: Math.round(session.actualDuration / 60), // Convert to minutes
      adjustedDuration: session.adjustedDuration ? Math.round(session.adjustedDuration / 60) : undefined,
      efficiency: session.plannedDuration > 0 
        ? Math.round((session.durationInMinutes / session.plannedDuration) * 100)
        : 100
    }));
  }, [analytics]);

  const efficiencyStats = useMemo(() => {
    if (analytics.length === 0) return { average: 0, onTime: 0, overTime: 0, underTime: 0 };
    
    const efficiencies = analytics.map(session => 
      session.plannedDuration > 0 
        ? (session.durationInMinutes / session.plannedDuration) * 100
        : 100
    );
    
    const average = Math.round(efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length);
    const onTime = efficiencies.filter(eff => eff >= 95 && eff <= 105).length;
    const overTime = efficiencies.filter(eff => eff > 105).length;
    const underTime = efficiencies.filter(eff => eff < 95).length;
    
    return { average, onTime, overTime, underTime };
  }, [analytics]);

  const fetchAnalytics = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      
      const data = await getDurationAnalytics(filters);
      setAnalytics(data.analytics);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const handleFilterChange = (key: keyof AnalyticsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Coach', 'Client', 'Planned (min)', 'Actual (min)', 'Adjusted (min)', 'Efficiency %', 'Pauses', 'Adjustments'],
      ...analytics.map(session => [
        new Date(session.date).toLocaleDateString(),
        `${session.coach.firstName} ${session.coach.lastName}`,
        `${session.client.firstName} ${session.client.lastName}`,
        session.plannedDuration.toString(),
        session.durationInMinutes.toString(),
        session.adjustedDuration ? Math.round(session.adjustedDuration / 60).toString() : '',
        session.plannedDuration > 0 
          ? Math.round((session.durationInMinutes / session.plannedDuration) * 100).toString()
          : '100',
        session.pauseCount.toString(),
        session.adjustmentCount.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-duration-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && !refreshing) {
    return (
      <div className={cn("bg-white rounded-lg shadow-sm border p-6", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-white rounded-lg shadow-sm border p-6", className)}>
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">
            <BarChart3 className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('analytics.errorTitle', 'Failed to Load Analytics')}
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border", className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('analytics.title', 'Session Duration Analytics')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('analytics.subtitle', 'Track session timing trends and efficiency metrics')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              {t('common.refresh', 'Refresh')}
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('analytics.filters', 'Filters')}
              {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </button>
            
            <button
              onClick={exportData}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('analytics.export', 'Export')}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('analytics.startDate', 'Start Date')}
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('analytics.endDate', 'End Date')}
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('analytics.sortBy', 'Sort By')}
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="date">{t('analytics.sortByDate', 'Date')}</option>
                <option value="duration">{t('analytics.sortByPlanned', 'Planned Duration')}</option>
                <option value="actualDuration">{t('analytics.sortByActual', 'Actual Duration')}</option>
                <option value="adjustedDuration">{t('analytics.sortByAdjusted', 'Adjusted Duration')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('analytics.sortOrder', 'Sort Order')}
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="desc">{t('analytics.descending', 'Newest First')}</option>
                <option value="asc">{t('analytics.ascending', 'Oldest First')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">
                    {t('analytics.totalSessions', 'Total Sessions')}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.totalSessions}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">
                    {t('analytics.totalDuration', 'Total Duration')}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(summary.totalDurationMinutes / 60)}h {summary.totalDurationMinutes % 60}m
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Timer className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">
                    {t('analytics.averageDuration', 'Average Duration')}
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.averageDurationMinutes}m
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Pause className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">
                    {t('analytics.totalPauses', 'Total Pauses')}
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {summary.totalPauses}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Edit className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-900">
                    {t('analytics.totalAdjustments', 'Total Adjustments')}
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {summary.totalAdjustments}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Efficiency Stats */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {t('analytics.efficiencyTitle', 'Session Efficiency')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {efficiencyStats.average}%
            </div>
            <div className="text-sm text-gray-500">
              {t('analytics.averageEfficiency', 'Average Efficiency')}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {efficiencyStats.onTime}
            </div>
            <div className="text-sm text-gray-500">
              {t('analytics.onTime', 'On Time (95-105%)')}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {efficiencyStats.overTime}
            </div>
            <div className="text-sm text-gray-500">
              {t('analytics.overTime', 'Over Time (>105%)')}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {efficiencyStats.underTime}
            </div>
            <div className="text-sm text-gray-500">
              {t('analytics.underTime', 'Under Time (<95%)')}
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {t('analytics.sessionsTitle', 'Recent Sessions')}
        </h3>
        
        {analytics.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('analytics.noData', 'No Analytics Data')}
            </h3>
            <p className="text-gray-500">
              {t('analytics.noDataDescription', 'No session data found for the selected filters.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.date', 'Date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.participants', 'Participants')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.planned', 'Planned')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.actual', 'Actual')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.efficiency', 'Efficiency')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.pauses', 'Pauses')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('analytics.adjustments', 'Adjustments')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.map((session) => {
                  const efficiency = session.plannedDuration > 0 
                    ? Math.round((session.durationInMinutes / session.plannedDuration) * 100)
                    : 100;
                  
                  return (
                    <tr key={session.sessionId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(session.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">
                            {session.coach.firstName} {session.coach.lastName}
                          </div>
                          <div className="text-gray-500">
                            {session.client.firstName} {session.client.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.plannedDuration}m
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div>{session.durationInMinutes}m</div>
                          {session.adjustedDuration && (
                            <div className="text-xs text-orange-600">
                              (Adj: {Math.round(session.adjustedDuration / 60)}m)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          efficiency >= 95 && efficiency <= 105
                            ? "bg-green-100 text-green-800"
                            : efficiency > 105
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        )}>
                          {efficiency}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.pauseCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.adjustmentCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDurationAnalytics; 