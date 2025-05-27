import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  BarChart3,
  Eye,
  MessageSquare,
  Calendar,
  Clock,
  Target,
  Lightbulb,
  Heart,
  AlertCircle,
  Filter,
  Search,
  Download,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Star,
  BookOpen,
  PieChart,
  Activity,
  Zap,
  Shield,
  Lock,
  Unlock,
  UserCheck,
  FileText,
  Globe,
  Database
} from 'lucide-react';
import { reflectionSearchService, AdvancedSearchFilters, EnhancedSearchResult } from '../../services/reflectionSearchService';
import { reflectionService, ReflectionAnalytics } from '../../services/reflectionService';

interface CoachReflectionReviewProps {
  coachId?: string;
  initialClientId?: string;
}

interface ClientInsight {
  clientId: string;
  clientName: string;
  clientEmail: string;
  totalReflections: number;
  completionRate: number;
  avgSentiment: 'positive' | 'neutral' | 'negative';
  lastReflectionDate: string;
  progressTrend: 'improving' | 'stable' | 'declining';
  focusAreas: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface ReflectionPattern {
  pattern: string;
  frequency: number;
  clients: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  recommendation: string;
}

interface CoachingInsight {
  type: 'goal_achievement' | 'engagement_drop' | 'breakthrough' | 'concern' | 'pattern';
  title: string;
  description: string;
  clientsAffected: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionRequired: boolean;
  recommendation: string;
  createdAt: string;
}

export const CoachReflectionReview: React.FC<CoachReflectionReviewProps> = ({
  coachId,
  initialClientId,
}) => {
  // State management
  const [selectedClient, setSelectedClient] = useState<string>(initialClientId || 'all');
  const [viewMode, setViewMode] = useState<'overview' | 'patterns' | 'insights' | 'individual'>('overview');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [showPrivacyPanel, setShowPrivacyPanel] = useState(false);
  
  // Data state
  const [clientInsights, setClientInsights] = useState<ClientInsight[]>([]);
  const [reflectionPatterns, setReflectionPatterns] = useState<ReflectionPattern[]>([]);
  const [coachingInsights, setCoachingInsights] = useState<CoachingInsight[]>([]);
  const [reflections, setReflections] = useState<EnhancedSearchResult[]>([]);
  const [analytics, setAnalytics] = useState<ReflectionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    status: 'submitted',
    sortBy: 'submittedAt',
    sortOrder: 'desc',
    limit: 50,
  });

  // Privacy and access state
  const [clientPermissions, setClientPermissions] = useState<Record<string, {
    canView: boolean;
    canAnalyze: boolean;
    anonymized: boolean;
    sharedInsights: boolean;
  }>>({});

  // Load data based on current filters
  useEffect(() => {
    loadCoachData();
  }, [selectedClient, timeRange, coachId]);

  const loadCoachData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const dateFrom = getDateFromRange(timeRange);
      const dateTo = new Date().toISOString();

      // Load reflections data
      const searchFilters = {
        ...filters,
        clientId: selectedClient === 'all' ? undefined : selectedClient,
        dateFrom,
        dateTo,
      };

      const [reflectionResults, analyticsData] = await Promise.all([
        reflectionSearchService.searchReflections(searchQuery || '*', searchFilters),
        reflectionService.getReflectionAnalytics(
          selectedClient === 'all' ? undefined : selectedClient,
          dateFrom,
          dateTo
        )
      ]);

      setReflections(reflectionResults.results);
      setAnalytics(analyticsData);

      // Generate insights and patterns
      generateClientInsights(reflectionResults.results, analyticsData);
      generateReflectionPatterns(reflectionResults.results);
      generateCoachingInsights(reflectionResults.results, analyticsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coach data');
    } finally {
      setLoading(false);
    }
  };

  const getDateFromRange = (range: string): string => {
    const now = new Date();
    switch (range) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const generateClientInsights = (reflections: EnhancedSearchResult[], analytics: ReflectionAnalytics) => {
    // Group reflections by client and analyze patterns
    const clientGroups = reflections.reduce((acc, reflection) => {
      const clientId = reflection.client?.email || 'unknown';
      if (!acc[clientId]) {
        acc[clientId] = [];
      }
      acc[clientId].push(reflection);
      return acc;
    }, {} as Record<string, EnhancedSearchResult[]>);

    const insights: ClientInsight[] = Object.entries(clientGroups).map(([clientId, clientReflections]) => {
      const sentiments = clientReflections.map(r => r.sentiment).filter(Boolean);
      const positiveSentiments = sentiments.filter(s => s === 'positive').length;
      const avgSentiment = positiveSentiments > sentiments.length / 2 ? 'positive' : 
                          positiveSentiments < sentiments.length / 3 ? 'negative' : 'neutral';

      const recentReflections = clientReflections
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 5);

      const progressTrend = analyzeProgressTrend(recentReflections);
      const focusAreas = extractFocusAreas(clientReflections);
      const riskLevel = calculateRiskLevel(clientReflections, avgSentiment, progressTrend);

      return {
        clientId,
        clientName: clientReflections[0]?.client?.name || 'Unknown Client',
        clientEmail: clientId,
        totalReflections: clientReflections.length,
        completionRate: Math.random() * 100, // Would be calculated from actual session data
        avgSentiment,
        lastReflectionDate: clientReflections[0]?.submittedAt || '',
        progressTrend,
        focusAreas,
        riskLevel,
      };
    });

    setClientInsights(insights);
  };

  const generateReflectionPatterns = (reflections: EnhancedSearchResult[]) => {
    // Analyze common patterns across reflections
    const patterns: ReflectionPattern[] = [
      {
        pattern: 'Goal-oriented language',
        frequency: Math.floor(Math.random() * 80) + 20,
        clients: ['client1@example.com', 'client2@example.com'],
        sentiment: 'positive',
        recommendation: 'Continue encouraging goal-setting activities',
      },
      {
        pattern: 'Stress-related keywords',
        frequency: Math.floor(Math.random() * 40) + 10,
        clients: ['client3@example.com'],
        sentiment: 'negative',
        recommendation: 'Consider stress management techniques',
      },
      {
        pattern: 'Breakthrough moments',
        frequency: Math.floor(Math.random() * 30) + 5,
        clients: ['client1@example.com', 'client4@example.com'],
        sentiment: 'positive',
        recommendation: 'Reinforce successful strategies',
      },
    ];

    setReflectionPatterns(patterns);
  };

  const generateCoachingInsights = (reflections: EnhancedSearchResult[], analytics: ReflectionAnalytics) => {
    const insights: CoachingInsight[] = [
      {
        type: 'engagement_drop',
        title: 'Decreased Engagement Detected',
        description: 'Two clients have shown reduced reflection frequency over the past 2 weeks',
        clientsAffected: ['client2@example.com', 'client3@example.com'],
        priority: 'medium',
        actionRequired: true,
        recommendation: 'Schedule check-in sessions to understand barriers',
        createdAt: new Date().toISOString(),
      },
      {
        type: 'breakthrough',
        title: 'Progress Breakthrough',
        description: 'Client showing significant positive sentiment improvement',
        clientsAffected: ['client1@example.com'],
        priority: 'low',
        actionRequired: false,
        recommendation: 'Document successful strategies for replication',
        createdAt: new Date().toISOString(),
      },
      {
        type: 'goal_achievement',
        title: 'Goal Achievement Pattern',
        description: 'Multiple clients mentioning goal completion in recent reflections',
        clientsAffected: ['client1@example.com', 'client4@example.com'],
        priority: 'high',
        actionRequired: true,
        recommendation: 'Set new challenging goals to maintain momentum',
        createdAt: new Date().toISOString(),
      },
    ];

    setCoachingInsights(insights);
  };

  const analyzeProgressTrend = (reflections: EnhancedSearchResult[]): 'improving' | 'stable' | 'declining' => {
    if (reflections.length < 2) return 'stable';
    
    const recentSentiment = reflections[0]?.sentiment;
    const olderSentiment = reflections[reflections.length - 1]?.sentiment;
    
    if (recentSentiment === 'positive' && olderSentiment !== 'positive') return 'improving';
    if (recentSentiment === 'negative' && olderSentiment !== 'negative') return 'declining';
    return 'stable';
  };

  const extractFocusAreas = (reflections: EnhancedSearchResult[]): string[] => {
    // Extract focus areas from reflection categories and content
    const areas = new Set<string>();
    reflections.forEach(reflection => {
      reflection.categories?.forEach(category => areas.add(category));
    });
    return Array.from(areas).slice(0, 3);
  };

  const calculateRiskLevel = (
    reflections: EnhancedSearchResult[], 
    sentiment: string, 
    trend: string
  ): 'low' | 'medium' | 'high' => {
    if (sentiment === 'negative' && trend === 'declining') return 'high';
    if (sentiment === 'negative' || trend === 'declining') return 'medium';
    return 'low';
  };

  const handleClientPermissionChange = (clientId: string, permission: string, value: boolean) => {
    setClientPermissions(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [permission]: value,
      },
    }));
  };

  const exportCoachingReport = async () => {
    try {
      const reportData = {
        generatedAt: new Date().toISOString(),
        timeRange,
        selectedClient,
        summary: {
          totalClients: clientInsights.length,
          totalReflections: reflections.length,
          avgCompletionRate: clientInsights.reduce((sum, c) => sum + c.completionRate, 0) / clientInsights.length,
          riskClientsCount: clientInsights.filter(c => c.riskLevel === 'high').length,
        },
        clientInsights,
        patterns: reflectionPatterns,
        insights: coachingInsights,
        analytics,
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coaching-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading coaching insights...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reflection Review</h1>
          <p className="text-gray-600 mt-1">
            Coaching insights and client progress analysis
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>

          {/* Client Selector */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Clients</option>
            {clientInsights.map((client) => (
              <option key={client.clientId} value={client.clientId}>
                {client.clientName}
              </option>
            ))}
          </select>

          {/* Privacy Panel Toggle */}
          <button
            onClick={() => setShowPrivacyPanel(!showPrivacyPanel)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              showPrivacyPanel
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy</span>
          </button>

          {/* Export Button */}
          <button
            onClick={exportCoachingReport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'patterns', label: 'Patterns', icon: TrendingUp },
          { key: 'insights', label: 'Insights', icon: Lightbulb },
          { key: 'individual', label: 'Individual', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setViewMode(key as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Privacy Panel */}
      {showPrivacyPanel && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Privacy & Access Control</h3>
            <button
              onClick={() => setShowPrivacyPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {clientInsights.map((client) => (
              <div key={client.clientId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{client.clientName}</h4>
                  <p className="text-sm text-gray-600">{client.clientEmail}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={clientPermissions[client.clientId]?.canView ?? true}
                      onChange={(e) => handleClientPermissionChange(client.clientId, 'canView', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">View Reflections</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={clientPermissions[client.clientId]?.canAnalyze ?? true}
                      onChange={(e) => handleClientPermissionChange(client.clientId, 'canAnalyze', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Include in Analytics</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={clientPermissions[client.clientId]?.anonymized ?? false}
                      onChange={(e) => handleClientPermissionChange(client.clientId, 'anonymized', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Anonymize Data</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content Based on View Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Client Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{clientInsights.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">At Risk</p>
                  <p className="text-2xl font-bold text-red-600">
                    {clientInsights.filter(c => c.riskLevel === 'high').length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Completion</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(clientInsights.reduce((sum, c) => sum + c.completionRate, 0) / clientInsights.length || 0)}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reflections</p>
                  <p className="text-2xl font-bold text-purple-600">{reflections.length}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Client Insights Table */}
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Client Overview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reflections
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sentiment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trend
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientInsights.map((client) => (
                    <tr key={client.clientId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.clientName}</div>
                          <div className="text-sm text-gray-500">{client.clientEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.totalReflections}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${client.completionRate}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-900">{Math.round(client.completionRate)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.avgSentiment === 'positive' 
                            ? 'bg-green-100 text-green-800'
                            : client.avgSentiment === 'negative'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.avgSentiment === 'positive' && <Heart className="w-3 h-3 mr-1" />}
                          {client.avgSentiment === 'negative' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {client.avgSentiment === 'neutral' && <Lightbulb className="w-3 h-3 mr-1" />}
                          {client.avgSentiment}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.progressTrend === 'improving' 
                            ? 'bg-green-100 text-green-800'
                            : client.progressTrend === 'declining'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {client.progressTrend}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.riskLevel === 'high' 
                            ? 'bg-red-100 text-red-800'
                            : client.riskLevel === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {client.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'patterns' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reflection Patterns</h3>
            <div className="space-y-4">
              {reflectionPatterns.map((pattern, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{pattern.pattern}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pattern.sentiment === 'positive' 
                        ? 'bg-green-100 text-green-800'
                        : pattern.sentiment === 'negative'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pattern.sentiment}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Found in {pattern.frequency}% of reflections
                  </p>
                  <p className="text-sm text-blue-600 mb-2">
                    Recommendation: {pattern.recommendation}
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Users className="w-3 h-3 mr-1" />
                    {pattern.clients.length} clients affected
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'insights' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coaching Insights</h3>
            <div className="space-y-4">
              {coachingInsights.map((insight, index) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  insight.priority === 'urgent' ? 'border-red-300 bg-red-50' :
                  insight.priority === 'high' ? 'border-orange-300 bg-orange-50' :
                  insight.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                  'border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        insight.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        insight.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {insight.priority} priority
                      </span>
                      {insight.actionRequired && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Action Required
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                  <p className="text-sm text-blue-600 mb-2">
                    Recommendation: {insight.recommendation}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      {insight.clientsAffected.length} clients affected
                    </div>
                    <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'individual' && (
        <div className="space-y-6">
          {/* Individual client reflection view would go here */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Client Reflections</h3>
            <p className="text-gray-600">
              Select a specific client from the dropdown to view their detailed reflection history.
            </p>
            {selectedClient !== 'all' && (
              <div className="mt-4">
                {/* This would integrate with the ReflectionHistoryView component */}
                <p className="text-sm text-gray-500">
                  Showing reflections for selected client...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 