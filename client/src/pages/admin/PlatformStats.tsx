import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Types
type StatsResponse = {
  users: {
    total: number;
    clients: number;
    coaches: number;
    pendingCoaches: number;
    admins: number;
  };
  sessions: {
    total: number;
    monthly: Record<string, number>;
  };
  reflections: {
    total: number;
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

  // Simple stat card component
  const StatCard = ({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center">
      <div className="bg-lumea-primary/10 p-3 rounded-full mr-4">
        {icon}
      </div>
      <div>
        <h3 className="text-gray-500 dark:text-gray-400 text-sm">{title}</h3>
        <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      </div>
    </div>
  );

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
      <h2 className="text-xl font-semibold mb-4">{t('admin.platformStats')}</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard 
          title={t('admin.totalUsers')} 
          value={data?.users.total || 0} 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-lumea-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard 
          title={t('admin.totalSessions')} 
          value={data?.sessions.total || 0} 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-lumea-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard 
          title={t('admin.totalReflections')} 
          value={data?.reflections.total || 0} 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-lumea-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          }
        />
      </div>
      
      {/* User Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8">
        <h3 className="text-lg font-semibold mb-4">{t('admin.userBreakdown')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-lumea-primary">{data?.users.clients || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.clients')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-lumea-primary">{data?.users.coaches || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.activeCoaches')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-500">{data?.users.pendingCoaches || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.pendingCoaches')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-500">{data?.users.admins || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('admin.admins')}</div>
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
              {chartData.map(item => {
                // Calculate height percentage (max 100%)
                const maxValue = Math.max(...chartData.map(d => d.count));
                const heightPercentage = maxValue > 0 
                  ? Math.max((item.count / maxValue) * 100, 5) // at least 5% height for visibility
                  : 5;
                
                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-lumea-primary rounded-t"
                      style={{ height: `${heightPercentage}%` }}
                    >
                      <div className="text-white text-xs text-center mt-1">
                        {item.count}
                      </div>
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