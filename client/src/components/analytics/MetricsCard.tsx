import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    suffix?: string;
  };
  className?: string;
  onClick?: () => void;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  className,
  onClick
}) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    // Format large numbers with K, M suffixes
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return val.toString();
  };

  const formatTrendValue = (val: number, suffix?: string): string => {
    const formatted = Math.abs(val) >= 1000 
      ? `${(Math.abs(val) / 1000).toFixed(1)}K`
      : Math.abs(val).toString();
    
    return suffix ? `${formatted}${suffix}` : formatted;
  };

  return (
    <div 
      className={cn(
        "bg-white rounded-lg shadow-sm border p-6 transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-blue-200",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Icon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">
                {title}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(value)}
              </p>
              {subtitle && (
                <p className="text-sm text-gray-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {trend && (
          <div className="flex-shrink-0 ml-4">
            <div className={cn(
              "inline-flex items-center text-sm font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {trend.value > 0 && !trend.isPositive && '-'}
              {formatTrendValue(trend.value, trend.suffix)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 