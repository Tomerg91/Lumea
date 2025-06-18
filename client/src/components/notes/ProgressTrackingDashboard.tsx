import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Target, 
  Users, 
  Download,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { CoachNote } from '../../types/coachNote';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface ProgressMetric {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  period: string;
}

interface ClientProgress {
  clientId: string;
  clientName: string;
  totalNotes: number;
  recentNotes: number;
  lastNoteDate: string;
  engagementScore: number;
  progressTrend: 'improving' | 'declining' | 'stable';
  keyInsights: string[];
}

interface ProgressTrackingDashboardProps {
  notes: CoachNote[];
  onExportProgress?: (format: 'json' | 'csv' | 'pdf') => void;
  onSetGoal?: (metric: string, target: number) => void;
}

export const ProgressTrackingDashboard: React.FC<ProgressTrackingDashboardProps> = ({
  notes,
  onExportProgress,
  onSetGoal
}) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [loading, setLoading] = useState(false);

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    const now = new Date();
    const periodStart = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        periodStart.setMonth(now.getMonth() - 3);
        break;
    }

    const periodNotes = notes.filter(note => 
      new Date(note.createdAt) >= periodStart
    );

    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setTime(periodStart.getTime() - (now.getTime() - periodStart.getTime()));
    
    const previousPeriodNotes = notes.filter(note => {
      const noteDate = new Date(note.createdAt);
      return noteDate >= previousPeriodStart && noteDate < periodStart;
    });

    const metrics: ProgressMetric[] = [
      {
        id: 'total_notes',
        title: 'Notes Created',
        current: periodNotes.length,
        target: selectedPeriod === 'week' ? 10 : selectedPeriod === 'month' ? 40 : 120,
        unit: 'notes',
        trend: periodNotes.length > previousPeriodNotes.length ? 'up' : 
               periodNotes.length < previousPeriodNotes.length ? 'down' : 'stable',
        change: periodNotes.length - previousPeriodNotes.length,
        period: selectedPeriod
      },
      {
        id: 'avg_words',
        title: 'Avg Words per Note',
        current: Math.round(periodNotes.reduce((sum, note) => 
          sum + (note.textContent?.split(' ').length || 0), 0) / (periodNotes.length || 1)),
        target: 150,
        unit: 'words',
        trend: 'stable',
        change: 0,
        period: selectedPeriod
      },
      {
        id: 'clients_documented',
        title: 'Clients Documented',
        current: new Set(periodNotes.map(note => note.clientId).filter(Boolean)).size,
        target: selectedPeriod === 'week' ? 5 : selectedPeriod === 'month' ? 15 : 45,
        unit: 'clients',
        trend: 'up',
        change: 2,
        period: selectedPeriod
      },
      {
        id: 'session_coverage',
        title: 'Session Coverage',
        current: Math.round((periodNotes.filter(note => note.sessionId).length / (periodNotes.length || 1)) * 100),
        target: 85,
        unit: '%',
        trend: 'up',
        change: 5,
        period: selectedPeriod
      }
    ];

    return metrics;
  }, [notes, selectedPeriod]);

  // Calculate client progress
  const clientProgress = useMemo(() => {
    const clientMap = new Map<string, ClientProgress>();
    
    notes.forEach(note => {
      if (!note.clientId) return;
      
      const existing = clientMap.get(note.clientId) || {
        clientId: note.clientId,
        clientName: note.client || 'Unknown Client',
        totalNotes: 0,
        recentNotes: 0,
        lastNoteDate: note.createdAt,
        engagementScore: 0,
        progressTrend: 'stable' as const,
        keyInsights: []
      };

      existing.totalNotes++;
      
      // Count recent notes (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (new Date(note.createdAt) >= thirtyDaysAgo) {
        existing.recentNotes++;
      }

      // Update last note date
      if (new Date(note.createdAt) > new Date(existing.lastNoteDate)) {
        existing.lastNoteDate = note.createdAt;
      }

      clientMap.set(note.clientId, existing);
    });

    // Calculate engagement scores and trends
    clientMap.forEach((client, clientId) => {
      client.engagementScore = Math.min(100, (client.recentNotes / 4) * 100); // Target 4 notes per month
      
      // Determine trend based on recent activity
      const recentActivity = client.recentNotes;
      const daysSinceLastNote = Math.floor(
        (Date.now() - new Date(client.lastNoteDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (recentActivity >= 4 && daysSinceLastNote <= 7) {
        client.progressTrend = 'improving';
      } else if (recentActivity <= 1 || daysSinceLastNote > 14) {
        client.progressTrend = 'declining';
      } else {
        client.progressTrend = 'stable';
      }

      // Generate key insights
      client.keyInsights = [];
      if (client.totalNotes > 10) {
        client.keyInsights.push('Well-documented client relationship');
      }
      if (client.recentNotes >= 4) {
        client.keyInsights.push('High recent engagement');
      }
      if (daysSinceLastNote <= 3) {
        client.keyInsights.push('Recent interaction documented');
      }
      if (daysSinceLastNote > 14) {
        client.keyInsights.push('May need follow-up');
      }
    });

    return Array.from(clientMap.values())
      .sort((a, b) => b.engagementScore - a.engagementScore);
  }, [notes]);

  const handleExportProgress = async (format: 'json' | 'csv' | 'pdf') => {
    setLoading(true);
    try {
      const exportData = {
        generatedAt: new Date().toISOString(),
        period: selectedPeriod,
        coachId: profile?.id,
        coachName: profile?.name,
        metrics: progressMetrics,
        clientProgress: clientProgress.slice(0, 10), // Top 10 clients
        summary: {
          totalNotes: notes.length,
          totalClients: clientProgress.length,
          avgEngagementScore: Math.round(
            clientProgress.reduce((sum, c) => sum + c.engagementScore, 0) / (clientProgress.length || 1)
          ),
          highPerformingClients: clientProgress.filter(c => c.engagementScore >= 75).length
        }
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `progress-tracking-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const csvData = [
          ['Metric', 'Current', 'Target', 'Progress %', 'Trend'],
          ...progressMetrics.map(m => [
            m.title,
            `${m.current} ${m.unit}`,
            `${m.target} ${m.unit}`,
            `${Math.round((m.current / m.target) * 100)}%`,
            m.trend
          ]),
          [],
          ['Client', 'Total Notes', 'Recent Notes', 'Engagement Score', 'Trend'],
          ...clientProgress.slice(0, 10).map(c => [
            c.clientName,
            c.totalNotes.toString(),
            c.recentNotes.toString(),
            `${c.engagementScore}%`,
            c.progressTrend
          ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `progress-tracking-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }

      if (onExportProgress) {
        onExportProgress(format);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Progress Tracking
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor your coaching documentation progress and client engagement
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'quarter')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
          <div className="flex gap-1">
            <Button
              onClick={() => handleExportProgress('json')}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-1" />
              JSON
            </Button>
            <Button
              onClick={() => handleExportProgress('csv')}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {progressMetrics.map((metric) => (
          <Card key={metric.id} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {metric.title}
                </CardTitle>
                {getTrendIcon(metric.trend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {metric.current}
                  </span>
                  <span className="text-sm text-gray-500">
                    / {metric.target} {metric.unit}
                  </span>
                </div>
                
                <Progress 
                  value={Math.min(100, (metric.current / metric.target) * 100)}
                  className="h-2"
                />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {Math.round((metric.current / metric.target) * 100)}% of target
                  </span>
                  {metric.change !== 0 && (
                    <span className={`flex items-center gap-1 ${
                      metric.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change > 0 ? '+' : ''}{metric.change}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Client Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientProgress.slice(0, 8).map((client) => (
              <div key={client.clientId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900">{client.clientName}</h4>
                    <Badge variant={
                      client.progressTrend === 'improving' ? 'default' :
                      client.progressTrend === 'declining' ? 'destructive' : 'secondary'
                    }>
                      {client.progressTrend}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{client.totalNotes} total notes</span>
                    <span>{client.recentNotes} recent notes</span>
                    <span>Last: {new Date(client.lastNoteDate).toLocaleDateString()}</span>
                  </div>
                  {client.keyInsights.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {client.keyInsights.slice(0, 2).map((insight, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {insight}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 mb-1">
                    {client.engagementScore}%
                  </div>
                  <div className="w-24">
                    <Progress 
                      value={client.engagementScore}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {clientProgress.length > 8 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  View All {clientProgress.length} Clients
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 