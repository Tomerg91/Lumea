import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Calendar, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SessionMetricsData {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  completionRate: number;
  sessionsByStatus: Record<string, number>;
  averageSessionsPerWeek: number;
  sessionTrends: Array<{
    date: string;
    sessions: number;
    completed: number;
  }>;
}

interface SessionMetricsChartProps {
  data: SessionMetricsData;
  className?: string;
}

const COLORS = {
  completed: '#10b981',
  cancelled: '#ef4444',
  pending: '#f59e0b',
  scheduled: '#3b82f6'
};

export const SessionMetricsChart = React.memo(({
  data,
  className
}: SessionMetricsChartProps) => {
  const { t } = useTranslation();

  // Prepare data for pie chart
  const statusData = Object.entries(data.sessionsByStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: COLORS[status as keyof typeof COLORS] || '#6b7280'
  }));

  // Prepare trend data for line chart
  const trendData = data.sessionTrends.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    completionRate: item.sessions > 0 ? Math.round((item.completed / item.sessions) * 100) : 0
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey === 'completionRate' && '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{data.value} sessions</p>
          <p className="text-sm text-gray-600">
            {((data.value / data.payload.total) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('analytics.sessionMetrics.title', 'Session Metrics')}
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          {data.averageSessionsPerWeek.toFixed(1)} sessions/week avg
        </div>
      </div>

      {/* Summary Stats - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{data.totalSessions}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Sessions</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-xl sm:text-2xl font-bold text-green-600">{data.completedSessions}</div>
          <div className="text-xs sm:text-sm text-gray-500">Completed</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-xl sm:text-2xl font-bold text-blue-600">{data.completionRate.toFixed(1)}%</div>
          <div className="text-xs sm:text-sm text-gray-500">Completion Rate</div>
        </div>
      </div>

      {/* Charts - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Session Trends Line Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('analytics.sessionMetrics.trends', 'Session Trends')}
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={trendData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name={t('analytics.sessionMetrics.totalSessions')}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#82ca9d"
                name={t('analytics.sessionMetrics.completedSessions')}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Session Status Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('analytics.sessionMetrics.statusDistribution', 'Status Distribution')}
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Completion Rate Trend */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {t('analytics.sessionMetrics.completionTrend', 'Completion Rate Trend')}
        </h4>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart
            data={trendData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="completionRate" fill="#82ca9d" name={t('analytics.sessionMetrics.completionRate')} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});