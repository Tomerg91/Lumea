import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Milestone } from '../../types/milestone';

// ====================== TYPES ======================

interface MilestoneProgressPoint {
  date: string;
  progress: number;
  notes?: string;
  sessionId?: string;
}

interface MilestoneProgressChartProps {
  milestone: Milestone;
  height?: number;
  showTarget?: boolean;
  className?: string;
}

// ====================== COMPONENT ======================

export const MilestoneProgressChart: React.FC<MilestoneProgressChartProps> = ({
  milestone,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const locale = isRTL ? he : undefined;

  // Prepare chart data
  const chartData = useMemo((): MilestoneProgressPoint[] => {
    if (!milestone.progress || milestone.progress.length === 0) {
      return [];
    }

    return milestone.progress
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map(progress => ({
        date: format(parseISO(progress.recordedAt), 'MMM dd', { locale }),
        progress: progress.progressPercent,
        notes: progress.notes,
        sessionId: progress.sessionId
      }));
  }, [milestone.progress, locale]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return 'stable';
    
    const latest = chartData[chartData.length - 1].progress;
    const previous = chartData[chartData.length - 2].progress;
    const change = latest - previous;
    
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }, [chartData]);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendLabel = () => {
    switch (trend) {
      case 'up':
        return t('milestone.trend.improving', 'Improving');
      case 'down':
        return t('milestone.trend.declining', 'Needs Attention');
      default:
        return t('milestone.trend.stable', 'Stable');
    }
  };

  const latestProgress = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{milestone.title}</span>
          <div className="flex items-center space-x-2">
            {getTrendIcon()}
            <Badge variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}>
              {getTrendLabel()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {t('milestone.noProgressData', 'No progress data available')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Summary */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">
                  {t('milestone.currentProgress', 'Current Progress')}
                </p>
                <p className="text-2xl font-bold">
                  {latestProgress?.progress || 0}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {t('milestone.lastUpdated', 'Last Updated')}
                </p>
                <p className="text-sm font-medium">
                  {latestProgress?.date || '-'}
                </p>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-sm">
                  {t('milestone.chart.placeholder', 'Progress chart visualization')}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {t('milestone.chart.comingSoon', 'Advanced charts coming soon')}
                </p>
              </div>
            </div>

            {/* Progress History */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                {t('milestone.progressHistory', 'Progress History')}
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {chartData.slice(-5).reverse().map((point, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{point.date}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{point.progress}%</span>
                      {point.notes && (
                        <span className="text-gray-500 text-xs truncate max-w-32">
                          {point.notes}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MilestoneProgressChart; 