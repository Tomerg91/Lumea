import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Users, Heart, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ClientEngagementData {
  totalClients: number;
  activeClients: number;
  clientRetentionRate: number;
  averageSessionsPerClient: number;
  reflectionSubmissionRate: number;
  clientEngagementTrends: Array<{
    date: string;
    activeClients: number;
    reflectionsSubmitted: number;
  }>;
}

interface ClientEngagementChartProps {
  data: ClientEngagementData;
  className?: string;
}

export const ClientEngagementChart: React.FC<ClientEngagementChartProps> = ({
  data,
  className
}) => {
  const { t } = useTranslation();

  // Prepare trend data
  const trendData = data.clientEngagementTrends.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    engagementRate: data.totalClients > 0 
      ? Math.round((item.activeClients / data.totalClients) * 100)
      : 0
  }));

  // Prepare radial chart data for key metrics
  const radialData = [
    {
      name: 'Retention Rate',
      value: data.clientRetentionRate,
      fill: '#10b981'
    },
    {
      name: 'Reflection Rate',
      value: data.reflectionSubmissionRate,
      fill: '#3b82f6'
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey === 'engagementRate' && '%'}
            </p>
          ))}
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
          <Users className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('analytics.clientEngagement.title', 'Client Engagement')}
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          {data.activeClients} / {data.totalClients} active
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{data.clientRetentionRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-500">Retention Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{data.averageSessionsPerClient.toFixed(1)}</div>
          <div className="text-sm text-gray-500">Avg Sessions/Client</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{data.reflectionSubmissionRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-500">Reflection Rate</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trends */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('analytics.clientEngagement.trends', 'Engagement Trends')}
          </h4>
          <div className="h-[200px] bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-gray-500 text-sm">Chart temporarily disabled for testing</div>
          </div>
        </div>

        {/* Key Metrics Radial Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('analytics.clientEngagement.keyMetrics', 'Key Metrics')}
          </h4>
          <div className="h-[200px] bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-gray-500 text-sm">Radial chart temporarily disabled for testing</div>
          </div>
        </div>
      </div>

      {/* Engagement Rate Trend */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {t('analytics.clientEngagement.engagementRate', 'Client Engagement Rate')}
        </h4>
        <div className="h-[150px] bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-gray-500 text-sm">Engagement rate chart temporarily disabled for testing</div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start">
          <Heart className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h5 className="text-sm font-medium text-blue-900 mb-1">
              {t('analytics.clientEngagement.insights', 'Engagement Insights')}
            </h5>
            <div className="text-sm text-blue-700 space-y-1">
              <p>
                • {data.activeClients} out of {data.totalClients} clients are currently active
              </p>
              <p>
                • Average of {data.averageSessionsPerClient.toFixed(1)} sessions per client
              </p>
              <p>
                • {data.reflectionSubmissionRate.toFixed(1)}% of clients submit reflections regularly
              </p>
              {data.clientRetentionRate > 80 && (
                <p>• Excellent retention rate indicates strong client satisfaction</p>
              )}
              {data.reflectionSubmissionRate < 50 && (
                <p>• Consider strategies to improve reflection submission rates</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 