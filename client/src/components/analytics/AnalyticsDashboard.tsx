import React from 'react';
import { SessionMetricsChart } from './SessionMetricsChart';
import { ClientEngagementChart } from './ClientEngagementChart';
import { CoachPerformanceChart } from './CoachPerformanceChart';
import { ReflectionAnalyticsChart } from './ReflectionAnalyticsChart';
import { MetricsCard } from './MetricsCard';
import { 
  Calendar, 
  Users, 
  MessageSquare, 
  Star,
  TrendingUp,
  UserCheck,
  Clock,
  Activity
} from 'lucide-react';

interface AnalyticsDashboardData {
  overview: {
    totalSessions: number;
    totalClients: number;
    totalCoaches: number;
    totalReflections: number;
    lastUpdated: Date;
  };
  sessionMetrics: {
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
  };
  clientEngagement: {
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
  };
  coachPerformance: {
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
  };
  reflectionAnalytics: {
    totalReflections: number;
    submissionRate: number;
    averageCompletionTime: number;
    reflectionsByCategory: Record<string, number>;
    categoryEngagement: Array<{
      category: string;
      averageScore: number;
      responseCount: number;
    }>;
  };
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

interface AnalyticsDashboardProps {
  data: AnalyticsDashboardData;
  className?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  data,
  className = ''
}) => {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Overview Metrics Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <MetricsCard
          title="Total Sessions"
          value={data.overview.totalSessions}
          icon={Calendar}
          subtitle="All time"
          trend={{
            value: data.sessionMetrics.completionRate,
            isPositive: data.sessionMetrics.completionRate > 80,
            suffix: '% completion'
          }}
        />
        
        <MetricsCard
          title="Active Clients"
          value={data.clientEngagement.activeClients}
          icon={Users}
          subtitle={`of ${data.overview.totalClients} total`}
          trend={{
            value: data.clientEngagement.clientRetentionRate,
            isPositive: data.clientEngagement.clientRetentionRate > 70,
            suffix: '% retention'
          }}
        />
        
        <MetricsCard
          title="Total Reflections"
          value={data.overview.totalReflections}
          icon={MessageSquare}
          subtitle="Submitted"
          trend={{
            value: data.reflectionAnalytics.submissionRate,
            isPositive: data.reflectionAnalytics.submissionRate > 60,
            suffix: '% rate'
          }}
        />
        
        <MetricsCard
          title="Active Coaches"
          value={data.coachPerformance.activeCoaches}
          icon={Star}
          subtitle={`of ${data.overview.totalCoaches} total`}
          trend={{
            value: data.coachPerformance.coaches.length > 0 
              ? data.coachPerformance.coaches.reduce((sum, coach) => sum + coach.clientSatisfactionScore, 0) / data.coachPerformance.coaches.length
              : 0,
            isPositive: true,
            suffix: '/5 satisfaction'
          }}
        />
      </div>

      {/* Session Metrics */}
      <div className="card-lumea-strong">
        <SessionMetricsChart data={data.sessionMetrics} />
      </div>

      {/* Client Engagement and Coach Performance - Mobile Optimized */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <div className="card-lumea-strong">
          <ClientEngagementChart data={data.clientEngagement} />
        </div>
        
        <div className="card-lumea-strong">
          <CoachPerformanceChart data={data.coachPerformance} />
        </div>
      </div>

      {/* Reflection Analytics */}
      <div className="card-lumea-strong">
        <ReflectionAnalyticsChart data={data.reflectionAnalytics} />
      </div>

      {/* Additional Insights - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="card-lumea p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-teal-blue rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <span className="text-xs lg:text-sm font-medium text-green-600">
              +{data.sessionMetrics.averageSessionsPerWeek.toFixed(1)}/week
            </span>
          </div>
          <h3 className="text-base lg:text-lg font-semibold mb-1 lg:mb-2">Session Growth</h3>
          <p className="text-xs lg:text-sm opacity-70">
            Average sessions per week with positive growth trend
          </p>
        </div>

        <div className="card-lumea p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-purple rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <span className="text-xs lg:text-sm font-medium text-blue-600">
              {data.clientEngagement.averageSessionsPerClient.toFixed(1)} avg
            </span>
          </div>
          <h3 className="text-base lg:text-lg font-semibold mb-1 lg:mb-2">Client Engagement</h3>
          <p className="text-xs lg:text-sm opacity-70">
            Average sessions per client showing good engagement
          </p>
        </div>

        <div className="card-lumea p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-yellow-peach rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <span className="text-xs lg:text-sm font-medium text-purple-600">
              {data.reflectionAnalytics.averageCompletionTime.toFixed(0)}min
            </span>
          </div>
          <h3 className="text-base lg:text-lg font-semibold mb-1 lg:mb-2">Reflection Time</h3>
          <p className="text-xs lg:text-sm opacity-70">
            Average time spent on thoughtful reflections
          </p>
        </div>

        <div className="card-lumea p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-pink rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <span className="text-xs lg:text-sm font-medium text-emerald-600">
              {Object.keys(data.reflectionAnalytics.reflectionsByCategory).length} categories
            </span>
          </div>
          <h3 className="text-base lg:text-lg font-semibold mb-1 lg:mb-2">Coverage</h3>
          <p className="text-xs lg:text-sm opacity-70">
            Different reflection categories being explored
          </p>
        </div>
      </div>

      {/* Data Summary - Mobile Optimized */}
      <div className="card-lumea-strong bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="p-4 lg:p-6">
          <h3 className="text-lg lg:text-xl font-bold text-gradient-purple mb-4">
            Analytics Summary
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2 text-sm lg:text-base">Performance Highlights</h4>
              <ul className="space-y-1 text-xs lg:text-sm text-gray-600">
                <li>• {data.sessionMetrics.completionRate.toFixed(1)}% session completion rate</li>
                <li>• {data.clientEngagement.clientRetentionRate.toFixed(1)}% client retention</li>
                <li>• {data.reflectionAnalytics.submissionRate.toFixed(1)}% reflection submission</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2 text-sm lg:text-base">Activity Overview</h4>
              <ul className="space-y-1 text-xs lg:text-sm text-gray-600">
                <li>• {data.sessionMetrics.averageSessionsPerWeek.toFixed(1)} sessions per week</li>
                <li>• {data.clientEngagement.averageSessionsPerClient.toFixed(1)} sessions per client</li>
                <li>• {data.reflectionAnalytics.averageCompletionTime.toFixed(0)} min avg reflection time</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2 text-sm lg:text-base">Quality Metrics</h4>
              <ul className="space-y-1 text-xs lg:text-sm text-gray-600">
                <li>• {data.coachPerformance.coaches.length > 0 
                  ? (data.coachPerformance.coaches.reduce((sum, coach) => sum + coach.clientSatisfactionScore, 0) / data.coachPerformance.coaches.length).toFixed(1)
                  : '0.0'}/5.0 coach satisfaction</li>
                <li>• {Object.keys(data.reflectionAnalytics.reflectionsByCategory).length} reflection categories</li>
                <li>• {data.coachPerformance.activeCoaches}/{data.overview.totalCoaches} coaches active</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 