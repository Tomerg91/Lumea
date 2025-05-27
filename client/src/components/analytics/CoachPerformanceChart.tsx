import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Users, Clock, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CoachPerformanceData {
  totalCoaches: number;
  activeCoaches: number;
  coaches: Array<{
    coachId: string;
    coachName: string;
    totalSessions: number;
    completedSessions: number;
    totalClients: number;
    averageSessionDuration: number;
    clientSatisfactionScore: number;
    notesTaken: number;
  }>;
}

interface CoachPerformanceChartProps {
  data: CoachPerformanceData;
  className?: string;
}

export const CoachPerformanceChart: React.FC<CoachPerformanceChartProps> = ({
  data,
  className
}) => {
  const { t } = useTranslation();

  const topPerformers = data.coaches
    .sort((a, b) => b.clientSatisfactionScore - a.clientSatisfactionScore)
    .slice(0, 5);

  const averageSatisfaction = data.coaches.length > 0
    ? data.coaches.reduce((sum, coach) => sum + coach.clientSatisfactionScore, 0) / data.coaches.length
    : 0;

  const totalSessions = data.coaches.reduce((sum, coach) => sum + coach.totalSessions, 0);
  const totalClients = data.coaches.reduce((sum, coach) => sum + coach.totalClients, 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Star className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('analytics.coachPerformance.title', 'Coach Performance')}
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          {data.activeCoaches} / {data.totalCoaches} active
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{averageSatisfaction.toFixed(1)}</div>
          <div className="text-sm text-gray-500">Avg Satisfaction</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalSessions}</div>
          <div className="text-sm text-gray-500">Total Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{totalClients}</div>
          <div className="text-sm text-gray-500">Total Clients</div>
        </div>
      </div>

      {/* Top Performers */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {t('analytics.coachPerformance.topPerformers', 'Top Performers')}
        </h4>
        <div className="space-y-3">
          {topPerformers.map((coach, index) => (
            <div key={coach.coachId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{coach.coachName}</p>
                  <p className="text-xs text-gray-500">
                    {coach.totalClients} clients • {coach.completedSessions} sessions
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {coach.clientSatisfactionScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">satisfaction</div>
                </div>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < Math.round(coach.clientSatisfactionScore)
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <h5 className="text-sm font-medium text-blue-900">Client Distribution</h5>
          </div>
          <div className="mt-2 space-y-2">
            {data.coaches.slice(0, 3).map((coach) => (
              <div key={coach.coachId} className="flex justify-between text-sm">
                <span className="text-blue-700">{coach.coachName}</span>
                <span className="text-blue-600 font-medium">{coach.totalClients} clients</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-green-600 mr-2" />
            <h5 className="text-sm font-medium text-green-900">Session Efficiency</h5>
          </div>
          <div className="mt-2 space-y-2">
            {data.coaches.slice(0, 3).map((coach) => (
              <div key={coach.coachId} className="flex justify-between text-sm">
                <span className="text-green-700">{coach.coachName}</span>
                <span className="text-green-600 font-medium">
                  {coach.averageSessionDuration.toFixed(0)}min avg
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-yellow-50 rounded-lg p-4">
        <div className="flex items-start">
          <MessageSquare className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h5 className="text-sm font-medium text-yellow-900 mb-1">
              {t('analytics.coachPerformance.insights', 'Performance Insights')}
            </h5>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>
                • Average satisfaction score: {averageSatisfaction.toFixed(1)}/5.0
              </p>
              <p>
                • {data.activeCoaches} coaches are currently active
              </p>
              <p>
                • Total of {totalSessions} sessions completed across all coaches
              </p>
              {averageSatisfaction > 4.0 && (
                <p>• Excellent overall coach performance and client satisfaction</p>
              )}
              {averageSatisfaction < 3.5 && (
                <p>• Consider additional coach training and support programs</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 