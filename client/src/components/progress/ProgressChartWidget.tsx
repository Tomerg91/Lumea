import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Activity, Target, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

interface ProgressDataPoint {
  id: string;
  title: string;
  progress: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  category?: string;
  categoryColor?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

interface ProgressChartWidgetProps {
  title: string;
  data: ProgressDataPoint[];
  showTrends?: boolean;
  showCategories?: boolean;
  layout?: 'grid' | 'list';
  className?: string;
}

export const ProgressChartWidget: React.FC<ProgressChartWidgetProps> = ({
  title,
  data,
  showTrends = false,
  showCategories = false,
  layout = 'list',
  className = ''
}) => {
  const { t } = useTranslation();

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'active':
        return <Target className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderGridLayout = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(item.status)}
                <h4 className="font-medium text-sm truncate">{item.title}</h4>
              </div>
              {showTrends && item.trend && (
                <div className="flex items-center space-x-1">
                  {getTrendIcon(item.trend)}
                  {item.trendValue && (
                    <span className={`text-xs font-medium ${
                      item.trend === 'up' ? 'text-green-600' : 
                      item.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {item.trend === 'up' ? '+' : item.trend === 'down' ? '-' : ''}{Math.abs(item.trendValue || 0)}%
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {showCategories && item.category && (
              <div className="flex items-center space-x-2">
                {item.categoryColor && (
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: item.categoryColor }}
                  />
                )}
                <span className="text-xs text-gray-600">{item.category}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('progress.progress', 'Progress')}</span>
                <span>{item.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(item.progress)}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
            
            <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
              {item.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderListLayout = () => (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
          <div className="flex items-center space-x-2">
            {getStatusIcon(item.status)}
            {showCategories && item.categoryColor && (
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.categoryColor }}
              />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium truncate">{item.title}</h4>
              <div className="flex items-center space-x-2">
                {showTrends && item.trend && (
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(item.trend)}
                    {item.trendValue && (
                      <span className={`text-sm font-medium ${
                        item.trend === 'up' ? 'text-green-600' : 
                        item.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {item.trend === 'up' ? '+' : item.trend === 'down' ? '-' : ''}{Math.abs(item.trendValue || 0)}%
                      </span>
                    )}
                  </div>
                )}
                <span className="text-sm font-medium">{item.progress}%</span>
              </div>
            </div>
            
            {showCategories && item.category && (
              <p className="text-sm text-gray-600 mb-2">{item.category}</p>
            )}
            
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <Progress value={item.progress} className="h-2" />
              </div>
              <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                {item.status}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline">{data.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{t('progress.noData', 'No progress data available')}</p>
          </div>
        ) : (
          layout === 'grid' ? renderGridLayout() : renderListLayout()
        )}
      </CardContent>
    </Card>
  );
};

export default ProgressChartWidget; 