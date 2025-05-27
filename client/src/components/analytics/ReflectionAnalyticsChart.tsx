import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Clock, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ReflectionAnalyticsData {
  totalReflections: number;
  submissionRate: number;
  averageCompletionTime: number;
  reflectionsByCategory: Record<string, number>;
  categoryEngagement: Array<{
    category: string;
    averageScore: number;
    responseCount: number;
  }>;
}

interface ReflectionAnalyticsChartProps {
  data: ReflectionAnalyticsData;
  className?: string;
}

export const ReflectionAnalyticsChart: React.FC<ReflectionAnalyticsChartProps> = ({
  data,
  className
}) => {
  const { t } = useTranslation();

  const topCategories = Object.entries(data.reflectionsByCategory)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  const totalCategoryReflections = Object.values(data.reflectionsByCategory)
    .reduce((sum: number, count: number) => sum + (count as number), 0);

  const topEngagementCategories = data.categoryEngagement
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes.toFixed(0)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toFixed(0)}m`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('analytics.reflectionAnalytics.title', 'Reflection Analytics')}
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          {data.submissionRate.toFixed(1)}% submission rate
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{data.totalReflections}</div>
          <div className="text-sm text-gray-500">Total Reflections</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{data.submissionRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-500">Submission Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{formatTime(data.averageCompletionTime)}</div>
          <div className="text-sm text-gray-500">Avg Completion</div>
        </div>
      </div>

      {/* Category Distribution */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {t('analytics.reflectionAnalytics.categoryDistribution', 'Category Distribution')}
        </h4>
        <div className="space-y-3">
          {topCategories.map(([category, count]) => {
            const countNum = count as number;
            const percentage = (totalCategoryReflections as number) > 0 
              ? (countNum / (totalCategoryReflections as number)) * 100 
              : 0;
            
            return (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <span className="text-sm font-medium text-gray-900 w-32 truncate">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 w-16 text-right">
                    {countNum} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Engagement */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {t('analytics.reflectionAnalytics.categoryEngagement', 'Category Engagement')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topEngagementCategories.map((category) => (
            <div key={category.category} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-900">
                  {category.category.charAt(0).toUpperCase() + category.category.slice(1)}
                </h5>
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm font-medium text-green-600">
                    {category.averageScore.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {category.responseCount} responses
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(category.averageScore / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
            <h5 className="text-sm font-medium text-blue-900">Submission Patterns</h5>
          </div>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Regular Submitters</span>
              <span className="text-blue-600 font-medium">
                {Math.round(data.submissionRate)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Total Reflections</span>
              <span className="text-blue-600 font-medium">{data.totalReflections}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Avg Completion Time</span>
              <span className="text-blue-600 font-medium">
                {formatTime(data.averageCompletionTime)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-green-600 mr-2" />
            <h5 className="text-sm font-medium text-green-900">Quality Metrics</h5>
          </div>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-green-700">Categories Covered</span>
              <span className="text-green-600 font-medium">
                {Object.keys(data.reflectionsByCategory).length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-700">Avg Engagement Score</span>
              <span className="text-green-600 font-medium">
                {data.categoryEngagement.length > 0
                  ? (data.categoryEngagement.reduce((sum, cat) => sum + cat.averageScore, 0) / data.categoryEngagement.length).toFixed(1)
                  : '0.0'
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-700">Total Responses</span>
              <span className="text-green-600 font-medium">
                {data.categoryEngagement.reduce((sum, cat) => sum + cat.responseCount, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-purple-50 rounded-lg p-4">
        <div className="flex items-start">
          <MessageSquare className="h-5 w-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h5 className="text-sm font-medium text-purple-900 mb-1">
              {t('analytics.reflectionAnalytics.insights', 'Reflection Insights')}
            </h5>
            <div className="text-sm text-purple-700 space-y-1">
              <p>
                • {data.totalReflections} reflections submitted with {data.submissionRate.toFixed(1)}% submission rate
              </p>
              <p>
                • Average completion time: {formatTime(data.averageCompletionTime)}
              </p>
              <p>
                • {Object.keys(data.reflectionsByCategory).length} different categories being explored
              </p>
              {data.submissionRate > 70 && (
                <p>• Excellent reflection engagement from clients</p>
              )}
              {data.submissionRate < 40 && (
                <p>• Consider strategies to encourage more reflection submissions</p>
              )}
              {data.averageCompletionTime > 30 && (
                <p>• Clients are taking time for thoughtful reflections</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 