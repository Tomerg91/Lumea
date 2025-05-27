import React, { useState, useEffect, useMemo } from 'react';
import { CoachNote } from '../../types/coachNote';
import { 
  AnalyticsDashboard as AnalyticsDashboardType,
  AnalyticsFilters,
  AnalyticsPeriod,
  AnalyticsInsight,
  AnalyticsGoal
} from '../../types/analytics';
import { analyticsService } from '../../services/analyticsService';
import { Button } from '../ui/button';

interface AnalyticsDashboardProps {
  notes: CoachNote[];
  onFilterChange?: (filters: AnalyticsFilters) => void;
  onInsightAction?: (insight: AnalyticsInsight) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  notes,
  onFilterChange,
  onInsightAction
}) => {
  const [dashboard, setDashboard] = useState<AnalyticsDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>({
    label: 'Last 30 days',
    value: 'month',
    days: 30
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'engagement' | 'productivity' | 'content' | 'goals'>('overview');

  const periods: AnalyticsPeriod[] = [
    { label: 'Last 7 days', value: 'week', days: 7 },
    { label: 'Last 30 days', value: 'month', days: 30 },
    { label: 'Last 90 days', value: 'quarter', days: 90 },
    { label: 'Last 365 days', value: 'year', days: 365 },
    { label: 'All time', value: 'all', days: 0 }
  ];

  // Generate analytics dashboard
  useEffect(() => {
    const generateAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const filters: AnalyticsFilters = {
          period: selectedPeriod
        };
        
        const analyticsData = await analyticsService.generateDashboard(notes, filters);
        setDashboard(analyticsData);
        
        if (onFilterChange) {
          onFilterChange(filters);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate analytics');
      } finally {
        setLoading(false);
      }
    };

    if (notes.length > 0) {
      generateAnalytics();
    } else {
      setLoading(false);
    }
  }, [notes, selectedPeriod, onFilterChange]);

  // Handle insight actions
  const handleInsightAction = (insight: AnalyticsInsight) => {
    if (onInsightAction) {
      onInsightAction(insight);
    }
  };

  // Export analytics report
  const handleExportReport = async () => {
    if (!dashboard) return;
    
    try {
      const report = await analyticsService.exportReport(dashboard, 'json');
      const dataStr = JSON.stringify(report, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Generating analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-400">⚠️</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Analytics Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Available</h3>
        <p className="text-gray-600">Create some notes to see your analytics dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Last updated: {new Date(dashboard.lastUpdated).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* Period Selector */}
          <select
            value={selectedPeriod.value}
            onChange={(e) => {
              const period = periods.find(p => p.value === e.target.value);
              if (period) setSelectedPeriod(period);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          
          {/* Export Button */}
          <Button
            onClick={handleExportReport}
            variant="outline"
            size="sm"
          >
            📄 Export Report
          </Button>
        </div>
      </div>

      {/* Insights Banner */}
      {dashboard.insights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-3">💡 Key Insights</h3>
          <div className="space-y-2">
            {dashboard.insights.slice(0, 3).map(insight => (
              <div key={insight.id} className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">{insight.title}:</span> {insight.description}
                  </p>
                </div>
                {insight.actionable && insight.action && (
                  <Button
                    onClick={() => handleInsightAction(insight)}
                    variant="outline"
                    size="sm"
                    className="ml-3 text-xs"
                  >
                    {insight.action.label}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'trends', label: 'Trends', icon: '📈' },
            { id: 'engagement', label: 'Engagement', icon: '👥' },
            { id: 'productivity', label: 'Productivity', icon: '⚡' },
            { id: 'content', label: 'Content', icon: '📝' },
            { id: 'goals', label: 'Goals', icon: '🎯' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab dashboard={dashboard} />}
        {activeTab === 'trends' && <TrendsTab dashboard={dashboard} />}
        {activeTab === 'engagement' && <EngagementTab dashboard={dashboard} />}
        {activeTab === 'productivity' && <ProductivityTab dashboard={dashboard} />}
        {activeTab === 'content' && <ContentTab dashboard={dashboard} />}
        {activeTab === 'goals' && <GoalsTab dashboard={dashboard} />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ dashboard: AnalyticsDashboardType }> = ({ dashboard }) => {
  const { overview, comparison } = dashboard;
  
  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Notes"
          value={overview.totalNotes}
          change={comparison.percentageChange.totalNotes}
          icon="📝"
        />
        <MetricCard
          title="This Week"
          value={overview.notesThisWeek}
          subtitle="notes created"
          icon="📅"
        />
        <MetricCard
          title="Avg Words/Note"
          value={Math.round(overview.averageWordsPerNote)}
          change={comparison.percentageChange.averageWordsPerNote}
          icon="✍️"
        />
        <MetricCard
          title="Unique Clients"
          value={overview.uniqueClients}
          change={comparison.percentageChange.uniqueClients}
          icon="👥"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session Analytics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Sessions</span>
              <span className="font-medium">{overview.uniqueSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Notes/Session</span>
              <span className="font-medium">{overview.averageNotesPerSession.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Notes/Client</span>
              <span className="font-medium">{overview.averageNotesPerClient.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Content Volume</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Words</span>
              <span className="font-medium">{overview.totalWords.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">This Month</span>
              <span className="font-medium">{overview.notesThisMonth} notes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Weekly Average</span>
              <span className="font-medium">{overview.averageNotesPerWeek.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Period Comparison</h3>
          <div className="space-y-3">
            <ComparisonItem
              label="Notes"
              change={comparison.percentageChange.totalNotes}
            />
            <ComparisonItem
              label="Words/Note"
              change={comparison.percentageChange.averageWordsPerNote}
            />
            <ComparisonItem
              label="Clients"
              change={comparison.percentageChange.uniqueClients}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Trends Tab Component
const TrendsTab: React.FC<{ dashboard: AnalyticsDashboardType }> = ({ dashboard }) => {
  const { timeSeriesData, tagAnalytics } = dashboard;
  
  return (
    <div className="space-y-6">
      {/* Time Series Chart Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Notes Over Time</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-2">📊</div>
            <p className="text-gray-600">Time series chart would be rendered here</p>
            <p className="text-sm text-gray-500 mt-1">
              {timeSeriesData.length} data points available
            </p>
          </div>
        </div>
      </div>

      {/* Tag Analytics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">🏷️ Tag Usage Analytics</h3>
        <div className="space-y-3">
          {tagAnalytics.slice(0, 10).map(tag => (
            <div key={tag.tagName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{tag.tagName}</span>
                  <span className="text-sm text-gray-600">{tag.count} uses</span>
                </div>
                <div className="flex items-center mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, tag.percentage)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">{tag.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Engagement Tab Component
const EngagementTab: React.FC<{ dashboard: AnalyticsDashboardType }> = ({ dashboard }) => {
  const { clientEngagement } = dashboard;
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">👥 Client Engagement</h3>
        <div className="space-y-4">
          {clientEngagement.slice(0, 10).map(client => (
            <div key={client.clientId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{client.clientName}</h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    client.noteFrequency === 'high' ? 'bg-green-100 text-green-800' :
                    client.noteFrequency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {client.noteFrequency} frequency
                  </span>
                  <span className="text-sm font-medium text-blue-600">
                    Score: {client.engagementScore}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Notes:</span>
                  <span className="ml-1 font-medium">{client.noteCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sessions:</span>
                  <span className="ml-1 font-medium">{client.sessionCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Words:</span>
                  <span className="ml-1 font-medium">{Math.round(client.averageWordsPerNote)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Last Note:</span>
                  <span className="ml-1 font-medium">
                    {new Date(client.lastNoteDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {client.topTags.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm text-gray-600">Top Tags: </span>
                  <div className="inline-flex flex-wrap gap-1 mt-1">
                    {client.topTags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Productivity Tab Component
const ProductivityTab: React.FC<{ dashboard: AnalyticsDashboardType }> = ({ dashboard }) => {
  const { productivity } = dashboard;
  
  return (
    <div className="space-y-6">
      {/* Productivity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Daily Average"
          value={productivity.dailyAverage.toFixed(1)}
          subtitle="notes per day"
          icon="📅"
        />
        <MetricCard
          title="Weekly Average"
          value={productivity.weeklyAverage.toFixed(1)}
          subtitle="notes per week"
          icon="📊"
        />
        <MetricCard
          title="Consistency Score"
          value={`${productivity.consistencyScore.toFixed(0)}%`}
          subtitle="regular note-taking"
          icon="🎯"
        />
      </div>

      {/* Best Periods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🏆 Best Day</h3>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {productivity.bestDay.noteCount}
            </div>
            <div className="text-sm text-gray-600">notes on</div>
            <div className="text-sm font-medium text-gray-900">
              {productivity.bestDay.date ? new Date(productivity.bestDay.date).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📅 Best Week</h3>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {productivity.bestWeek.noteCount}
            </div>
            <div className="text-sm text-gray-600">notes in week of</div>
            <div className="text-sm font-medium text-gray-900">
              {productivity.bestWeek.startDate ? new Date(productivity.bestWeek.startDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📆 Best Month</h3>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {productivity.bestMonth.noteCount}
            </div>
            <div className="text-sm text-gray-600">notes in</div>
            <div className="text-sm font-medium text-gray-900">
              {productivity.bestMonth.month} {productivity.bestMonth.year}
            </div>
          </div>
        </div>
      </div>

      {/* Productivity Trend */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Productivity Trend</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className={`text-4xl mb-2 ${
              productivity.productivityTrend === 'improving' ? 'text-green-600' :
              productivity.productivityTrend === 'declining' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {productivity.productivityTrend === 'improving' ? '📈' :
               productivity.productivityTrend === 'declining' ? '📉' : '➡️'}
            </div>
            <div className="text-lg font-medium text-gray-900 capitalize">
              {productivity.productivityTrend}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Your note-taking productivity is {productivity.productivityTrend}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Content Tab Component
const ContentTab: React.FC<{ dashboard: AnalyticsDashboardType }> = ({ dashboard }) => {
  const { content } = dashboard;
  
  return (
    <div className="space-y-6">
      {/* Content Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Avg Words"
          value={Math.round(content.averageWordCount)}
          subtitle="per note"
          icon="✍️"
        />
        <MetricCard
          title="Median Words"
          value={Math.round(content.medianWordCount)}
          subtitle="per note"
          icon="📊"
        />
        <MetricCard
          title="Readability"
          value={`${content.readabilityScore}%`}
          subtitle="score"
          icon="📖"
        />
        <MetricCard
          title="Complexity"
          value={`${content.complexityScore}%`}
          subtitle="score"
          icon="🧠"
        />
      </div>

      {/* Note Length Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📏 Note Length Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{content.shortNotes}</div>
            <div className="text-sm text-gray-600">Short Notes</div>
            <div className="text-xs text-gray-500">(&lt; 50 words)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{content.mediumNotes}</div>
            <div className="text-sm text-gray-600">Medium Notes</div>
            <div className="text-xs text-gray-500">(50-200 words)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{content.longNotes}</div>
            <div className="text-sm text-gray-600">Long Notes</div>
            <div className="text-xs text-gray-500">(&gt; 200 words)</div>
          </div>
        </div>
      </div>

      {/* Most Common Words */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">🔤 Most Common Words</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {content.mostCommonWords.slice(0, 15).map(word => (
            <div key={word.word} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="font-medium text-gray-900">{word.word}</div>
              <div className="text-sm text-gray-600">{word.count} times</div>
              <div className="text-xs text-gray-500">{word.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">😊 Sentiment Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{content.sentimentDistribution.positive}</div>
            <div className="text-sm text-gray-600">Positive</div>
            <div className="text-xs text-gray-500">😊 Optimistic tone</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 mb-1">{content.sentimentDistribution.neutral}</div>
            <div className="text-sm text-gray-600">Neutral</div>
            <div className="text-xs text-gray-500">😐 Balanced tone</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">{content.sentimentDistribution.negative}</div>
            <div className="text-sm text-gray-600">Negative</div>
            <div className="text-xs text-gray-500">😔 Concerning tone</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Goals Tab Component
const GoalsTab: React.FC<{ dashboard: AnalyticsDashboardType }> = ({ dashboard }) => {
  const { goals } = dashboard;
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">🎯 Your Goals</h3>
        <div className="space-y-4">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: string;
}> = ({ title, value, change, subtitle, icon }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="text-2xl">{icon}</div>
    </div>
    {change !== undefined && (
      <div className="mt-2">
        <span className={`text-sm font-medium ${
          change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
        }`}>
          {change > 0 ? '↗️' : change < 0 ? '↘️' : '➡️'} {Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500 ml-1">vs previous period</span>
      </div>
    )}
  </div>
);

const ComparisonItem: React.FC<{ label: string; change: number }> = ({ label, change }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-600">{label}</span>
    <span className={`font-medium ${
      change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
    }`}>
      {change > 0 ? '+' : ''}{change.toFixed(1)}%
    </span>
  </div>
);

const GoalCard: React.FC<{ goal: AnalyticsGoal }> = ({ goal }) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-medium text-gray-900">{goal.description}</h4>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        goal.status === 'completed' ? 'bg-green-100 text-green-800' :
        goal.status === 'on_track' ? 'bg-blue-100 text-blue-800' :
        goal.status === 'ahead' ? 'bg-purple-100 text-purple-800' :
        'bg-red-100 text-red-800'
      }`}>
        {goal.status.replace('_', ' ')}
      </span>
    </div>
    
    <div className="mb-3">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Progress</span>
        <span>{goal.progress.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            goal.status === 'completed' ? 'bg-green-500' :
            goal.status === 'on_track' ? 'bg-blue-500' :
            goal.status === 'ahead' ? 'bg-purple-500' :
            'bg-red-500'
          }`}
          style={{ width: `${Math.min(100, goal.progress)}%` }}
        ></div>
      </div>
    </div>
    
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">Current: {goal.current.toFixed(1)}</span>
      <span className="text-gray-600">Target: {goal.target}</span>
    </div>
  </div>
); 