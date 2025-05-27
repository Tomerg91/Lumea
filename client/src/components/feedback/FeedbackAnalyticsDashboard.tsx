import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '../../hooks/use-toast';
import { feedbackService } from '../../services/feedbackService';
import { FeedbackAnalytics } from '../../types/feedback';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Star, 
  Users, 
  Clock, 
  Download,
  RefreshCw,
  Activity,
  Target,
  Award,
  MessageSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface FeedbackAnalyticsDashboardProps {
  entityId: string;
  entityType: 'coach' | 'client';
  className?: string;
}

interface AnalyticsState {
  data: FeedbackAnalytics | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const FeedbackAnalyticsDashboard: React.FC<FeedbackAnalyticsDashboardProps> = ({
  entityId,
  entityType,
  className,
}) => {
  const { toast } = useToast();
  
  const [analytics, setAnalytics] = useState<AnalyticsState>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setAnalytics(prev => ({ ...prev, loading: true, error: null }));
      
      const response = entityType === 'coach'
        ? await feedbackService.getCoachAnalytics(entityId, { period: 'monthly' })
        : await feedbackService.getClientAnalytics(entityId, { period: 'monthly' });
      
      setAnalytics({
        data: response.analytics,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalytics({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load analytics',
        lastUpdated: null,
      });
      
      toast({
        title: 'Error Loading Analytics',
        description: 'Failed to load feedback analytics. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [entityId, entityType]);

  const exportData = () => {
    if (!analytics.data) return;
    
    const dataStr = JSON.stringify(analytics.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-analytics-${entityType}-${entityId}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTrendDirection = (current: number, previous?: number) => {
    if (!previous) return 'stable';
    const diff = current - previous;
    if (diff > 0.1) return 'up';
    if (diff < -0.1) return 'down';
    return 'stable';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (analytics.loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (analytics.error || !analytics.data) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Available</h3>
            <p className="text-muted-foreground mb-4">
              {analytics.error || 'No feedback data available for the selected period.'}
            </p>
            <Button onClick={loadAnalytics} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = analytics.data;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold capitalize">{entityType} Analytics</h2>
          <p className="text-muted-foreground">
            Feedback insights and performance metrics
            {analytics.lastUpdated && (
              <span className="ml-2">
                • Updated {format(analytics.lastUpdated, 'MMM d, yyyy HH:mm')}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={loadAnalytics} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Button onClick={exportData} variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{data.ratings.overall.toFixed(1)}</p>
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < Math.round(data.ratings.overall)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {getTrendIcon(getTrendDirection(data.ratings.overall, data.previousPeriodRatings?.overall))}
                  <span>vs previous period</span>
                </div>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{data.metrics.responseRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">
                  {data.metrics.submittedCount} of {data.metrics.totalFeedbacks} collected
                </p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Goals Met</p>
                <p className="text-2xl font-bold">{data.sessionGoalsMetPercentage.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">of sessions achieved goals</p>
              </div>
              <Award className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{data.metrics.averageResponseTime.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">time to complete feedback</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rating Categories</CardTitle>
            <CardDescription>
              Performance across different feedback categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Overall Satisfaction', value: data.ratings.overallSatisfaction },
                { label: 'Coach Effectiveness', value: data.ratings.coachEffectiveness },
                { label: 'Session Quality', value: data.ratings.sessionQuality },
                { label: 'Goal Progress', value: data.ratings.goalProgress },
                { label: 'Communication Quality', value: data.ratings.communicationQuality },
                { label: 'Would Recommend', value: data.ratings.wouldRecommend },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-4 h-4",
                            i < Math.round(item.value)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          )}
                        />
                      ))}
                    </div>
                    <Badge variant="outline">{item.value.toFixed(1)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback Insights</CardTitle>
            <CardDescription>
              Key themes and areas for improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2">Top Strengths</h4>
                <div className="space-y-1">
                  {data.topStrengths.length > 0 ? (
                    data.topStrengths.slice(0, 3).map((strength, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {strength}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No specific strengths identified yet.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-orange-700 mb-2">Improvement Areas</h4>
                <div className="space-y-1">
                  {data.improvementAreas.length > 0 ? (
                    data.improvementAreas.slice(0, 3).map((area, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No specific areas identified yet.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-blue-700 mb-2">Common Challenges</h4>
                <div className="space-y-1">
                  {data.commonChallenges.length > 0 ? (
                    data.commonChallenges.slice(0, 3).map((challenge, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {challenge}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No common challenges identified yet.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample Size Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Analytics based on {data.sampleSize} feedback responses
            </span>
            <span>
              Last calculated: {format(new Date(data.lastCalculated), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 