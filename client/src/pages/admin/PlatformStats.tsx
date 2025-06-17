import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Enhanced types matching new backend response
type StatsResponse = {
  users: {
    total: number;
    clients: number;
    coaches: number;
    pendingCoaches: number;
    approvedCoaches: number;
    admins: number;
    monthly: Record<string, number>;
  };
  sessions: {
    total: number;
    completed: number;
    monthly: Record<string, number>;
    completionRate: number;
  };
  payments: {
    total: number;
    paid: number;
    totalRevenue: number;
    monthly: Record<string, number>;
    monthlyRevenue: Record<string, number>;
    successRate: number;
  };
  reflections: {
    total: number;
  };
  recentActivity: {
    newUsers: number;
    newSessions: number;
    newPayments: number;
  };
  growthRates: {
    users: number;
    sessions: number;
    revenue: number;
  };
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      activeUsers: number;
      sessionCompletionRate: number;
      paymentSuccessRate: number;
      coachApprovalQueue: number;
    };
  };
};

const PlatformStats: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  // Fetch platform stats
  const { data, isLoading, error } = useQuery<StatsResponse>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await axios.get('/api/admin/stats');
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Convert monthly stats to chart format and sort by date
  const chartData = React.useMemo(() => {
    if (!data?.sessions.monthly) return [];

    return Object.entries(data.sessions.monthly)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, count]) => {
        // Format date label (e.g., "2023-05" to "May 2023")
        const [year, month] = date.split('-');
        const monthNames = {
          '01': t('months.january'),
          '02': t('months.february'),
          '03': t('months.march'),
          '04': t('months.april'),
          '05': t('months.may'),
          '06': t('months.june'),
          '07': t('months.july'),
          '08': t('months.august'),
          '09': t('months.september'),
          '10': t('months.october'),
          '11': t('months.november'),
          '12': t('months.december'),
        };

        const monthLabel = monthNames[month as keyof typeof monthNames] || month;
        const formattedDate = isRTL ? `${monthLabel} ${year}` : `${monthLabel} ${year}`;

        return {
          date: formattedDate,
          count,
        };
      });
  }, [data, t, isRTL]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  // Growth indicator component
  const GrowthIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;
    
    return (
      <div className={`flex items-center text-sm ${
        isNeutral ? 'text-gray-500' : 
        isPositive ? 'text-green-600' : 'text-red-600'
      }`}>
        {!isNeutral && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 mr-1 ${isPositive ? 'rotate-0' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 11l5-5m0 0l5 5m-5-5v12"
            />
          </svg>
        )}
        <span>
          {isNeutral ? '0%' : `${isPositive ? '+' : ''}${formatPercentage(value)}`}
        </span>
      </div>
    );
  };

  // Enhanced stat card component with growth indicator
  const StatCard = ({
    title,
    value,
    growth,
    icon,
    subtitle,
  }: {
    title: string;
    value: string | number;
    growth?: number;
    icon: React.ReactNode;
    subtitle?: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className="bg-lumea-primary/10 p-3 rounded-full mr-4">{icon}</div>
          <div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">{title}</h3>
            <p className="text-2xl font-semibold">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {growth !== undefined && (
          <div className="flex flex-col items-end">
            <GrowthIndicator value={growth} />
            <span className="text-xs text-gray-400 mt-1">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );

  // System health badge
  const SystemHealthBadge = ({ status }: { status: 'healthy' | 'warning' | 'critical' }) => {
    const colors = {
      healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    const labels = {
      healthy: t('admin.healthy', 'Healthy'),
      warning: t('admin.warning', 'Warning'),
      critical: t('admin.critical', 'Critical')
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        <span className={`w-2 h-2 rounded-full mr-1.5 ${
          status === 'healthy' ? 'bg-green-400' :
          status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
        }`}></span>
        {labels[status]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{t('admin.errorLoadingStats')}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{t('admin.platformStats')}</h2>
        {data && (
          <SystemHealthBadge status={data.systemHealth.status} />
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t('admin.totalUsers')}
          value={data?.users.total || 0}
          growth={data?.growthRates.users}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-lumea-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          }
        />
        <StatCard
          title={t('admin.totalSessions')}
          value={data?.sessions.total || 0}
          growth={data?.growthRates.sessions}
          subtitle={`${formatPercentage(data?.sessions.completionRate || 0)} completion rate`}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-lumea-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <StatCard
          title={t('admin.totalRevenue', 'Total Revenue')}
          value={formatCurrency(data?.payments.totalRevenue || 0)}
          growth={data?.growthRates.revenue}
          subtitle={`${data?.payments.paid || 0} paid payments`}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-lumea-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          }
        />
        <StatCard
          title={t('admin.totalReflections')}
          value={data?.reflections.total || 0}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-lumea-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          }
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h3 className="text-lg font-semibold mb-4">{t('admin.recentActivity', 'Recent Activity (Last 30 Days)')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data?.recentActivity.newUsers || 0}</div>
            <div className="text-sm text-blue-600/80">{t('admin.newUsers', 'New Users')}</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data?.recentActivity.newSessions || 0}</div>
            <div className="text-sm text-green-600/80">{t('admin.newSessions', 'New Sessions')}</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{data?.recentActivity.newPayments || 0}</div>
            <div className="text-sm text-purple-600/80">{t('admin.newPayments', 'New Payments')}</div>
          </div>
        </div>
      </div>

      {/* User Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h3 className="text-lg font-semibold mb-4">{t('admin.userBreakdown')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-lumea-primary">{data?.users.clients || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.clients')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-lumea-primary">{data?.users.approvedCoaches || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('admin.activeCoaches')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-500">
              {data?.users.pendingCoaches || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('admin.pendingCoaches')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-500">{data?.users.admins || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.admins')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-500">{data?.users.coaches || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.totalCoaches', 'Total Coaches')}</div>
          </div>
        </div>
      </div>

      {/* System Health Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h3 className="text-lg font-semibold mb-4">{t('admin.systemHealth', 'System Health')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <div className="text-lg font-semibold">{formatPercentage(data?.systemHealth.metrics.sessionCompletionRate || 0)}</div>
            <div className="text-sm text-gray-500">{t('admin.sessionCompletion', 'Session Completion')}</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-lg font-semibold">{formatPercentage(data?.systemHealth.metrics.paymentSuccessRate || 0)}</div>
            <div className="text-sm text-gray-500">{t('admin.paymentSuccess', 'Payment Success')}</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-lg font-semibold">{data?.systemHealth.metrics.activeUsers || 0}</div>
            <div className="text-sm text-gray-500">{t('admin.activeUsers30d', 'Active Users (30d)')}</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className={`text-lg font-semibold ${
              (data?.systemHealth.metrics.coachApprovalQueue || 0) > 10 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {data?.systemHealth.metrics.coachApprovalQueue || 0}
            </div>
            <div className="text-sm text-gray-500">{t('admin.approvalQueue', 'Approval Queue')}</div>
          </div>
        </div>
      </div>

      {/* Monthly Sessions Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">{t('admin.sessionsByMonth')}</h3>

        {chartData.length > 0 ? (
          <div className="relative h-64">
            {/* Use a simple bar chart implementation */}
            <div className="flex items-end h-52 space-x-2 pt-4 px-2">
              {chartData.map((item) => {
                // Calculate height percentage (max 100%)
                const maxValue = Math.max(...chartData.map((d) => d.count));
                const heightPercentage =
                  maxValue > 0
                    ? Math.max((item.count / maxValue) * 100, 5) // at least 5% height for visibility
                    : 5;

                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-lumea-primary rounded-t"
                      style={{ height: `${heightPercentage}%` }}
                    >
                      <div className="text-white text-xs text-center mt-1">{item.count}</div>
                    </div>
                    <div className="text-xs mt-2 text-gray-600 dark:text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                      {item.date}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            {t('admin.noSessionData')}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformStats;
