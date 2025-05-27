import { reflectionService, ReflectionAnalytics } from './reflectionService';
import { reflectionSearchService, EnhancedSearchResult } from './reflectionSearchService';

// Advanced analytics interfaces
export interface ReflectionInsight {
  id: string;
  type: 'trend' | 'pattern' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  recommendation?: string;
  dataPoints: Array<{
    label: string;
    value: number | string;
    trend?: 'up' | 'down' | 'stable';
  }>;
  timeframe: string;
  createdAt: string;
}

export interface ClientProgressMetrics {
  clientId: string;
  clientName: string;
  overallProgress: number; // 0-100
  engagementScore: number; // 0-100
  consistencyScore: number; // 0-100
  goalAchievementRate: number; // 0-100
  emotionalWellbeingTrend: 'improving' | 'stable' | 'declining';
  keyMetrics: {
    totalReflections: number;
    avgCompletionTime: number;
    streakDays: number;
    responseQuality: number; // 0-100
  };
  riskFactors: string[];
  strengths: string[];
  opportunities: string[];
}

export interface CoachingRecommendation {
  id: string;
  clientId: string;
  type: 'intervention' | 'goal_adjustment' | 'technique' | 'follow_up' | 'celebration';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  rationale: string;
  suggestedActions: string[];
  expectedOutcome: string;
  timeframe: string;
  confidence: number;
  createdAt: string;
}

export interface ReflectionTrend {
  metric: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  dataPoints: Array<{
    date: string;
    value: number;
    label?: string;
  }>;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  significance: 'low' | 'medium' | 'high';
}

export interface BenchmarkComparison {
  clientId: string;
  metric: string;
  clientValue: number;
  benchmarkValue: number;
  percentile: number;
  category: 'below' | 'average' | 'above' | 'exceptional';
  interpretation: string;
}

class ReflectionAnalyticsService {
  private insights: ReflectionInsight[] = [];
  private recommendations: CoachingRecommendation[] = [];

  // Generate comprehensive analytics insights
  async generateInsights(
    clientId?: string,
    timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<{
    insights: ReflectionInsight[];
    progressMetrics: ClientProgressMetrics[];
    recommendations: CoachingRecommendation[];
    trends: ReflectionTrend[];
    benchmarks: BenchmarkComparison[];
  }> {
    try {
      // Get reflection data
      const dateFrom = this.getDateFromTimeframe(timeframe);
      const [analytics, reflections] = await Promise.all([
        reflectionService.getReflectionAnalytics(clientId, dateFrom),
        reflectionSearchService.searchReflections('*', {
          clientId,
          dateFrom,
          limit: 1000,
        })
      ]);

      // Generate different types of insights
      const insights = await this.generateReflectionInsights(reflections.results, analytics);
      const progressMetrics = await this.calculateProgressMetrics(reflections.results, analytics);
      const recommendations = await this.generateCoachingRecommendations(reflections.results, progressMetrics);
      const trends = await this.analyzeTrends(reflections.results, timeframe);
      const benchmarks = await this.calculateBenchmarks(progressMetrics);

      return {
        insights,
        progressMetrics,
        recommendations,
        trends,
        benchmarks,
      };
    } catch (error) {
      console.error('Failed to generate analytics insights:', error);
      throw error;
    }
  }

  // Generate specific reflection insights
  private async generateReflectionInsights(
    reflections: EnhancedSearchResult[],
    analytics: ReflectionAnalytics
  ): Promise<ReflectionInsight[]> {
    const insights: ReflectionInsight[] = [];

    // Sentiment trend analysis
    const sentimentInsight = this.analyzeSentimentTrend(reflections);
    if (sentimentInsight) insights.push(sentimentInsight);

    // Engagement pattern analysis
    const engagementInsight = this.analyzeEngagementPatterns(reflections, analytics);
    if (engagementInsight) insights.push(engagementInsight);

    // Response quality analysis
    const qualityInsight = this.analyzeResponseQuality(reflections);
    if (qualityInsight) insights.push(qualityInsight);

    // Consistency analysis
    const consistencyInsight = this.analyzeConsistency(reflections, analytics);
    if (consistencyInsight) insights.push(consistencyInsight);

    // Topic/theme analysis
    const themeInsight = this.analyzeThemes(reflections);
    if (themeInsight) insights.push(themeInsight);

    // Goal achievement prediction
    const predictionInsight = this.predictGoalAchievement(reflections);
    if (predictionInsight) insights.push(predictionInsight);

    return insights;
  }

  // Calculate comprehensive progress metrics
  private async calculateProgressMetrics(
    reflections: EnhancedSearchResult[],
    analytics: ReflectionAnalytics
  ): Promise<ClientProgressMetrics[]> {
    // Group reflections by client
    const clientGroups = this.groupReflectionsByClient(reflections);
    
    return Object.entries(clientGroups).map(([clientId, clientReflections]) => {
      const overallProgress = this.calculateOverallProgress(clientReflections);
      const engagementScore = this.calculateEngagementScore(clientReflections, analytics);
      const consistencyScore = this.calculateConsistencyScore(clientReflections);
      const goalAchievementRate = this.calculateGoalAchievementRate(clientReflections);
      const emotionalWellbeingTrend = this.analyzeEmotionalTrend(clientReflections);
      
      return {
        clientId,
        clientName: clientReflections[0]?.client?.name || 'Unknown',
        overallProgress,
        engagementScore,
        consistencyScore,
        goalAchievementRate,
        emotionalWellbeingTrend,
        keyMetrics: {
          totalReflections: clientReflections.length,
          avgCompletionTime: this.calculateAvgCompletionTime(clientReflections),
          streakDays: this.calculateStreakDays(clientReflections),
          responseQuality: this.calculateResponseQuality(clientReflections),
        },
        riskFactors: this.identifyRiskFactors(clientReflections),
        strengths: this.identifyStrengths(clientReflections),
        opportunities: this.identifyOpportunities(clientReflections),
      };
    });
  }

  // Generate coaching recommendations based on insights
  private async generateCoachingRecommendations(
    reflections: EnhancedSearchResult[],
    progressMetrics: ClientProgressMetrics[]
  ): Promise<CoachingRecommendation[]> {
    const recommendations: CoachingRecommendation[] = [];

    progressMetrics.forEach(metrics => {
      // Low engagement recommendations
      if (metrics.engagementScore < 60) {
        recommendations.push({
          id: `engagement-${metrics.clientId}-${Date.now()}`,
          clientId: metrics.clientId,
          type: 'intervention',
          priority: metrics.engagementScore < 40 ? 'high' : 'medium',
          title: 'Improve Engagement',
          description: 'Client showing signs of low engagement with reflection process',
          rationale: `Engagement score of ${metrics.engagementScore}% indicates potential barriers`,
          suggestedActions: [
            'Schedule a check-in call to understand challenges',
            'Explore alternative reflection formats',
            'Adjust reflection frequency or timing',
            'Provide more guided reflection prompts'
          ],
          expectedOutcome: 'Increased participation and deeper reflections',
          timeframe: '2-3 weeks',
          confidence: 0.85,
          createdAt: new Date().toISOString(),
        });
      }

      // Declining emotional wellbeing
      if (metrics.emotionalWellbeingTrend === 'declining') {
        recommendations.push({
          id: `wellbeing-${metrics.clientId}-${Date.now()}`,
          clientId: metrics.clientId,
          type: 'intervention',
          priority: 'high',
          title: 'Address Emotional Wellbeing Decline',
          description: 'Client showing declining emotional wellbeing trend',
          rationale: 'Recent reflections indicate negative sentiment trend',
          suggestedActions: [
            'Immediate check-in to assess support needs',
            'Review current goals and stress factors',
            'Consider additional resources or referrals',
            'Increase session frequency temporarily'
          ],
          expectedOutcome: 'Stabilized or improved emotional state',
          timeframe: '1-2 weeks',
          confidence: 0.90,
          createdAt: new Date().toISOString(),
        });
      }

      // High performance celebration
      if (metrics.overallProgress > 80 && metrics.engagementScore > 80) {
        recommendations.push({
          id: `celebration-${metrics.clientId}-${Date.now()}`,
          clientId: metrics.clientId,
          type: 'celebration',
          priority: 'low',
          title: 'Celebrate Achievements',
          description: 'Client demonstrating excellent progress and engagement',
          rationale: `Strong performance with ${metrics.overallProgress}% progress and ${metrics.engagementScore}% engagement`,
          suggestedActions: [
            'Acknowledge specific achievements in next session',
            'Document successful strategies for future reference',
            'Consider setting more challenging goals',
            'Share success story (with permission) to inspire others'
          ],
          expectedOutcome: 'Reinforced positive behavior and motivation',
          timeframe: 'Next session',
          confidence: 0.95,
          createdAt: new Date().toISOString(),
        });
      }

      // Consistency improvements
      if (metrics.consistencyScore < 70 && metrics.consistencyScore > 40) {
        recommendations.push({
          id: `consistency-${metrics.clientId}-${Date.now()}`,
          clientId: metrics.clientId,
          type: 'technique',
          priority: 'medium',
          title: 'Improve Reflection Consistency',
          description: 'Moderate consistency issues that could benefit from structure',
          rationale: `Consistency score of ${metrics.consistencyScore}% suggests room for improvement`,
          suggestedActions: [
            'Establish specific reflection times/days',
            'Set up reminder systems',
            'Start with shorter, more frequent reflections',
            'Create accountability check-ins'
          ],
          expectedOutcome: 'More regular reflection practice',
          timeframe: '3-4 weeks',
          confidence: 0.75,
          createdAt: new Date().toISOString(),
        });
      }
    });

    return recommendations;
  }

  // Analyze trends over time
  private async analyzeTrends(
    reflections: EnhancedSearchResult[],
    timeframe: string
  ): Promise<ReflectionTrend[]> {
    const trends: ReflectionTrend[] = [];

    // Engagement trend
    const engagementTrend = this.calculateEngagementTrend(reflections, timeframe);
    trends.push(engagementTrend);

    // Sentiment trend
    const sentimentTrend = this.calculateSentimentTrend(reflections, timeframe);
    trends.push(sentimentTrend);

    // Completion time trend
    const completionTimeTrend = this.calculateCompletionTimeTrend(reflections, timeframe);
    trends.push(completionTimeTrend);

    // Response quality trend
    const qualityTrend = this.calculateQualityTrend(reflections, timeframe);
    trends.push(qualityTrend);

    return trends;
  }

  // Calculate benchmark comparisons
  private async calculateBenchmarks(
    progressMetrics: ClientProgressMetrics[]
  ): Promise<BenchmarkComparison[]> {
    const benchmarks: BenchmarkComparison[] = [];

    // Calculate aggregate benchmarks
    const avgEngagement = progressMetrics.reduce((sum, m) => sum + m.engagementScore, 0) / progressMetrics.length;
    const avgProgress = progressMetrics.reduce((sum, m) => sum + m.overallProgress, 0) / progressMetrics.length;
    const avgConsistency = progressMetrics.reduce((sum, m) => sum + m.consistencyScore, 0) / progressMetrics.length;

    progressMetrics.forEach(metrics => {
      // Engagement benchmark
      benchmarks.push({
        clientId: metrics.clientId,
        metric: 'Engagement Score',
        clientValue: metrics.engagementScore,
        benchmarkValue: avgEngagement,
        percentile: this.calculatePercentile(metrics.engagementScore, progressMetrics.map(m => m.engagementScore)),
        category: this.categorizePerformance(metrics.engagementScore, avgEngagement),
        interpretation: this.interpretBenchmark('engagement', metrics.engagementScore, avgEngagement),
      });

      // Progress benchmark
      benchmarks.push({
        clientId: metrics.clientId,
        metric: 'Overall Progress',
        clientValue: metrics.overallProgress,
        benchmarkValue: avgProgress,
        percentile: this.calculatePercentile(metrics.overallProgress, progressMetrics.map(m => m.overallProgress)),
        category: this.categorizePerformance(metrics.overallProgress, avgProgress),
        interpretation: this.interpretBenchmark('progress', metrics.overallProgress, avgProgress),
      });
    });

    return benchmarks;
  }

  // Helper methods for analysis
  private analyzeSentimentTrend(reflections: EnhancedSearchResult[]): ReflectionInsight | null {
    if (reflections.length < 5) return null;

    const sentiments = reflections.map(r => r.sentiment).filter(Boolean);
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    const positiveRatio = positiveCount / sentiments.length;

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let description = '';
    let recommendation = '';

    if (positiveRatio > 0.7) {
      severity = 'low';
      description = 'Consistently positive sentiment in reflections indicates strong emotional wellbeing';
      recommendation = 'Continue current approaches and consider setting more challenging goals';
    } else if (positiveRatio < 0.3) {
      severity = negativeCount > positiveCount * 2 ? 'high' : 'medium';
      description = 'Concerning trend of negative sentiment requires attention';
      recommendation = 'Schedule immediate check-in to address potential issues';
    } else {
      severity = 'low';
      description = 'Balanced sentiment with room for improvement';
      recommendation = 'Focus on identifying and reinforcing positive patterns';
    }

    return {
      id: `sentiment-trend-${Date.now()}`,
      type: 'trend',
      title: 'Emotional Sentiment Analysis',
      description,
      confidence: 0.8,
      severity,
      actionable: severity !== 'low',
      recommendation,
      dataPoints: [
        { label: 'Positive Reflections', value: positiveCount },
        { label: 'Neutral Reflections', value: sentiments.length - positiveCount - negativeCount },
        { label: 'Negative Reflections', value: negativeCount },
        { label: 'Positive Ratio', value: Math.round(positiveRatio * 100) + '%' },
      ],
      timeframe: 'Last 30 days',
      createdAt: new Date().toISOString(),
    };
  }

  private analyzeEngagementPatterns(
    reflections: EnhancedSearchResult[],
    analytics: ReflectionAnalytics
  ): ReflectionInsight | null {
    if (!analytics.overview || reflections.length < 3) return null;

    const completionRate = analytics.overview.completionRate;
    const avgLength = reflections.reduce((sum, r) => {
      const textAnswers = r.preview.filter(p => typeof p.value === 'string');
      const avgTextLength = textAnswers.reduce((s, p) => s + (p.value as string).length, 0) / textAnswers.length;
      return sum + avgTextLength;
    }, 0) / reflections.length;

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let description = '';
    
    if (completionRate < 50) {
      severity = 'high';
      description = 'Low completion rate indicates engagement challenges';
    } else if (avgLength < 50) {
      severity = 'medium';
      description = 'Short responses suggest surface-level engagement';
    } else {
      severity = 'low';
      description = 'Good engagement levels with thoughtful responses';
    }

    return {
      id: `engagement-${Date.now()}`,
      type: 'pattern',
      title: 'Engagement Pattern Analysis',
      description,
      confidence: 0.85,
      severity,
      actionable: severity !== 'low',
      recommendation: severity !== 'low' ? 'Consider adjusting reflection format or frequency' : undefined,
      dataPoints: [
        { label: 'Completion Rate', value: `${Math.round(completionRate)}%` },
        { label: 'Avg Response Length', value: Math.round(avgLength) },
        { label: 'Total Reflections', value: reflections.length },
      ],
      timeframe: 'Recent activity',
      createdAt: new Date().toISOString(),
    };
  }

  private analyzeResponseQuality(reflections: EnhancedSearchResult[]): ReflectionInsight | null {
    if (reflections.length < 3) return null;

    const qualityScore = this.calculateResponseQuality(reflections);
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let description = '';
    
    if (qualityScore < 40) {
      severity = 'medium';
      description = 'Response quality could be improved with more depth and reflection';
    } else if (qualityScore > 80) {
      severity = 'low';
      description = 'Excellent response quality showing deep self-reflection';
    } else {
      severity = 'low';
      description = 'Good response quality with consistent engagement';
    }

    return {
      id: `quality-${Date.now()}`,
      type: 'pattern',
      title: 'Response Quality Assessment',
      description,
      confidence: 0.75,
      severity,
      actionable: severity !== 'low',
      recommendation: severity !== 'low' ? 'Provide more detailed prompts or examples of thoughtful responses' : undefined,
      dataPoints: [
        { label: 'Quality Score', value: Math.round(qualityScore) },
        { label: 'Analyzed Responses', value: reflections.length },
      ],
      timeframe: 'Recent submissions',
      createdAt: new Date().toISOString(),
    };
  }

  private analyzeConsistency(
    reflections: EnhancedSearchResult[],
    analytics: ReflectionAnalytics
  ): ReflectionInsight | null {
    if (reflections.length < 5) return null;

    const dates = reflections.map(r => new Date(r.submittedAt)).sort((a, b) => a.getTime() - b.getTime());
    const gaps = [];
    
    for (let i = 1; i < dates.length; i++) {
      const gap = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const consistency = Math.max(0, 100 - (avgGap - 1) * 10); // Penalty for gaps > 1 day

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let description = '';
    
    if (consistency < 50) {
      severity = 'medium';
      description = 'Irregular reflection schedule may impact progress';
    } else if (consistency > 80) {
      severity = 'low';
      description = 'Excellent consistency in reflection practice';
    } else {
      severity = 'low';
      description = 'Good consistency with room for improvement';
    }

    return {
      id: `consistency-${Date.now()}`,
      type: 'pattern',
      title: 'Reflection Consistency Analysis',
      description,
      confidence: 0.80,
      severity,
      actionable: severity !== 'low',
      recommendation: severity !== 'low' ? 'Establish regular reflection schedule with reminders' : undefined,
      dataPoints: [
        { label: 'Consistency Score', value: Math.round(consistency) },
        { label: 'Average Gap (days)', value: Math.round(avgGap * 10) / 10 },
        { label: 'Total Reflections', value: reflections.length },
      ],
      timeframe: 'Historical pattern',
      createdAt: new Date().toISOString(),
    };
  }

  private analyzeThemes(reflections: EnhancedSearchResult[]): ReflectionInsight | null {
    if (reflections.length < 3) return null;

    // Extract themes from reflection content (simplified)
    const themes = new Map<string, number>();
    const keywords = ['goal', 'challenge', 'success', 'stress', 'growth', 'confidence', 'relationship', 'work', 'health'];
    
    reflections.forEach(reflection => {
      reflection.preview.forEach(preview => {
        if (typeof preview.value === 'string') {
          const text = preview.value.toLowerCase();
          keywords.forEach(keyword => {
            if (text.includes(keyword)) {
              themes.set(keyword, (themes.get(keyword) || 0) + 1);
            }
          });
        }
      });
    });

    const topThemes = Array.from(themes.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    if (topThemes.length === 0) return null;

    return {
      id: `themes-${Date.now()}`,
      type: 'pattern',
      title: 'Common Themes Analysis',
      description: `Most frequently mentioned themes: ${topThemes.map(([theme]) => theme).join(', ')}`,
      confidence: 0.70,
      severity: 'low',
      actionable: true,
      recommendation: 'Focus coaching sessions on identified themes for targeted support',
      dataPoints: topThemes.map(([theme, count]) => ({
        label: theme.charAt(0).toUpperCase() + theme.slice(1),
        value: count,
      })),
      timeframe: 'Content analysis',
      createdAt: new Date().toISOString(),
    };
  }

  private predictGoalAchievement(reflections: EnhancedSearchResult[]): ReflectionInsight | null {
    if (reflections.length < 5) return null;

    // Simple prediction based on sentiment trend and engagement
    const recentReflections = reflections.slice(0, 3);
    const positiveRecent = recentReflections.filter(r => r.sentiment === 'positive').length;
    const engagementTrend = this.calculateResponseQuality(recentReflections);
    
    const predictionScore = (positiveRecent / recentReflections.length) * 0.6 + (engagementTrend / 100) * 0.4;
    const achievementProbability = Math.round(predictionScore * 100);

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let description = '';
    
    if (achievementProbability < 40) {
      severity = 'medium';
      description = 'Current trajectory suggests goals may need adjustment or additional support';
    } else if (achievementProbability > 80) {
      severity = 'low';
      description = 'Strong indicators suggest high likelihood of goal achievement';
    } else {
      severity = 'low';
      description = 'Moderate progress toward goals with consistent effort';
    }

    return {
      id: `prediction-${Date.now()}`,
      type: 'prediction',
      title: 'Goal Achievement Prediction',
      description,
      confidence: 0.65,
      severity,
      actionable: severity !== 'low',
      recommendation: severity !== 'low' ? 'Review current goals and adjust strategies if needed' : undefined,
      dataPoints: [
        { label: 'Achievement Probability', value: `${achievementProbability}%` },
        { label: 'Recent Positive Sentiment', value: `${Math.round((positiveRecent / recentReflections.length) * 100)}%` },
        { label: 'Engagement Level', value: Math.round(engagementTrend) },
      ],
      timeframe: 'Predictive analysis',
      createdAt: new Date().toISOString(),
    };
  }

  // Utility calculation methods
  private groupReflectionsByClient(reflections: EnhancedSearchResult[]): Record<string, EnhancedSearchResult[]> {
    return reflections.reduce((acc, reflection) => {
      const clientId = reflection.client?.email || 'unknown';
      if (!acc[clientId]) {
        acc[clientId] = [];
      }
      acc[clientId].push(reflection);
      return acc;
    }, {} as Record<string, EnhancedSearchResult[]>);
  }

  private calculateOverallProgress(reflections: EnhancedSearchResult[]): number {
    // Simplified calculation based on frequency, quality, and sentiment
    const frequency = Math.min(100, reflections.length * 10);
    const quality = this.calculateResponseQuality(reflections);
    const sentimentScore = this.calculateSentimentScore(reflections);
    
    return Math.round((frequency * 0.3 + quality * 0.4 + sentimentScore * 0.3));
  }

  private calculateEngagementScore(reflections: EnhancedSearchResult[], analytics: ReflectionAnalytics): number {
    const completionRate = analytics.overview?.completionRate || 0;
    const avgResponseLength = this.calculateAvgResponseLength(reflections);
    const followUpRate = this.calculateFollowUpRate(reflections);
    
    return Math.round((completionRate * 0.4 + avgResponseLength * 0.4 + followUpRate * 0.2));
  }

  private calculateConsistencyScore(reflections: EnhancedSearchResult[]): number {
    if (reflections.length < 2) return 0;
    
    const dates = reflections.map(r => new Date(r.submittedAt)).sort((a, b) => a.getTime() - b.getTime());
    const gaps = [];
    
    for (let i = 1; i < dates.length; i++) {
      const gap = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    return Math.max(0, Math.round(100 - (avgGap - 1) * 10));
  }

  private calculateGoalAchievementRate(reflections: EnhancedSearchResult[]): number {
    // Simplified calculation based on positive sentiment and goal-related keywords
    const goalMentions = reflections.filter(r => 
      r.preview.some(p => 
        typeof p.value === 'string' && 
        (p.value.toLowerCase().includes('goal') || 
         p.value.toLowerCase().includes('achieve'))
      )
    ).length;
    
    const positiveMentions = reflections.filter(r => r.sentiment === 'positive').length;
    
    if (goalMentions === 0) return Math.round((positiveMentions / reflections.length) * 60);
    return Math.round((positiveMentions / reflections.length) * 100);
  }

  private analyzeEmotionalTrend(reflections: EnhancedSearchResult[]): 'improving' | 'stable' | 'declining' {
    if (reflections.length < 3) return 'stable';
    
    const recentThird = reflections.slice(0, Math.floor(reflections.length / 3));
    const olderThird = reflections.slice(-Math.floor(reflections.length / 3));
    
    const recentPositive = recentThird.filter(r => r.sentiment === 'positive').length / recentThird.length;
    const olderPositive = olderThird.filter(r => r.sentiment === 'positive').length / olderThird.length;
    
    if (recentPositive > olderPositive + 0.1) return 'improving';
    if (recentPositive < olderPositive - 0.1) return 'declining';
    return 'stable';
  }

  private calculateAvgCompletionTime(reflections: EnhancedSearchResult[]): number {
    const withTime = reflections.filter(r => r.completionTime && r.completionTime > 0);
    if (withTime.length === 0) return 0;
    return Math.round(withTime.reduce((sum, r) => sum + (r.completionTime || 0), 0) / withTime.length);
  }

  private calculateStreakDays(reflections: EnhancedSearchResult[]): number {
    if (reflections.length === 0) return 0;
    
    const dates = reflections.map(r => new Date(r.submittedAt)).sort((a, b) => b.getTime() - a.getTime());
    let streak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const dayDiff = (dates[i-1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24);
      if (dayDiff <= 1.5) { // Allow some flexibility
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private calculateResponseQuality(reflections: EnhancedSearchResult[]): number {
    if (reflections.length === 0) return 0;
    
    const scores = reflections.map(reflection => {
      let score = 0;
      reflection.preview.forEach(preview => {
        if (typeof preview.value === 'string') {
          const length = preview.value.length;
          if (length > 100) score += 30;
          else if (length > 50) score += 20;
          else if (length > 20) score += 10;
          
          // Check for thoughtful indicators
          const thoughtfulWords = ['because', 'however', 'realized', 'learned', 'feel', 'think'];
          const hasThoughtful = thoughtfulWords.some(word => (preview.value as string).toLowerCase().includes(word));
          if (hasThoughtful) score += 20;
        }
        
        if (preview.followUpAnswer && preview.followUpAnswer.length > 20) {
          score += 25;
        }
      });
      
      return Math.min(100, score);
    });
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private identifyRiskFactors(reflections: EnhancedSearchResult[]): string[] {
    const risks: string[] = [];
    
    const negativeRatio = reflections.filter(r => r.sentiment === 'negative').length / reflections.length;
    if (negativeRatio > 0.4) risks.push('High negative sentiment');
    
    const avgResponseLength = this.calculateAvgResponseLength(reflections);
    if (avgResponseLength < 30) risks.push('Very short responses');
    
    const recentGap = this.calculateDaysSinceLastReflection(reflections);
    if (recentGap > 7) risks.push('Infrequent reflections');
    
    return risks;
  }

  private identifyStrengths(reflections: EnhancedSearchResult[]): string[] {
    const strengths: string[] = [];
    
    const positiveRatio = reflections.filter(r => r.sentiment === 'positive').length / reflections.length;
    if (positiveRatio > 0.6) strengths.push('Positive outlook');
    
    const quality = this.calculateResponseQuality(reflections);
    if (quality > 80) strengths.push('Thoughtful responses');
    
    const consistency = this.calculateConsistencyScore(reflections);
    if (consistency > 80) strengths.push('Consistent practice');
    
    return strengths;
  }

  private identifyOpportunities(reflections: EnhancedSearchResult[]): string[] {
    const opportunities: string[] = [];
    
    const followUpRate = this.calculateFollowUpRate(reflections);
    if (followUpRate < 50) opportunities.push('Increase follow-up depth');
    
    const avgLength = this.calculateAvgResponseLength(reflections);
    if (avgLength < 80 && avgLength > 30) opportunities.push('Expand response detail');
    
    const themes = this.extractDominantThemes(reflections);
    if (themes.length > 0) opportunities.push(`Focus on ${themes[0]} theme`);
    
    return opportunities;
  }

  // Additional utility methods
  private calculateEngagementTrend(reflections: EnhancedSearchResult[], timeframe: string): ReflectionTrend {
    // Implementation for engagement trend calculation
    return {
      metric: 'Engagement Score',
      timeframe: timeframe as any,
      dataPoints: [], // Would be populated with actual data
      trend: 'stable',
      changePercent: 0,
      significance: 'medium',
    };
  }

  private calculateSentimentTrend(reflections: EnhancedSearchResult[], timeframe: string): ReflectionTrend {
    // Implementation for sentiment trend calculation
    return {
      metric: 'Sentiment Score',
      timeframe: timeframe as any,
      dataPoints: [], // Would be populated with actual data
      trend: 'stable',
      changePercent: 0,
      significance: 'medium',
    };
  }

  private calculateCompletionTimeTrend(reflections: EnhancedSearchResult[], timeframe: string): ReflectionTrend {
    // Implementation for completion time trend calculation
    return {
      metric: 'Completion Time',
      timeframe: timeframe as any,
      dataPoints: [], // Would be populated with actual data
      trend: 'stable',
      changePercent: 0,
      significance: 'low',
    };
  }

  private calculateQualityTrend(reflections: EnhancedSearchResult[], timeframe: string): ReflectionTrend {
    // Implementation for quality trend calculation
    return {
      metric: 'Response Quality',
      timeframe: timeframe as any,
      dataPoints: [], // Would be populated with actual data
      trend: 'stable',
      changePercent: 0,
      significance: 'medium',
    };
  }

  private calculatePercentile(value: number, dataset: number[]): number {
    const sorted = dataset.sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return Math.round((index / sorted.length) * 100);
  }

  private categorizePerformance(value: number, benchmark: number): 'below' | 'average' | 'above' | 'exceptional' {
    const ratio = value / benchmark;
    if (ratio < 0.8) return 'below';
    if (ratio > 1.2) return ratio > 1.5 ? 'exceptional' : 'above';
    return 'average';
  }

  private interpretBenchmark(metric: string, value: number, benchmark: number): string {
    const diff = value - benchmark;
    const percentage = Math.round(Math.abs(diff / benchmark) * 100);
    
    if (Math.abs(diff) < benchmark * 0.1) {
      return `${metric} is aligned with group average`;
    } else if (diff > 0) {
      return `${metric} is ${percentage}% above group average`;
    } else {
      return `${metric} is ${percentage}% below group average`;
    }
  }

  private calculateSentimentScore(reflections: EnhancedSearchResult[]): number {
    const sentiments = reflections.map(r => r.sentiment).filter(Boolean);
    if (sentiments.length === 0) return 50;
    
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    const neutralCount = sentiments.length - positiveCount - negativeCount;
    
    return Math.round((positiveCount * 100 + neutralCount * 50) / sentiments.length);
  }

  private calculateAvgResponseLength(reflections: EnhancedSearchResult[]): number {
    const lengths = reflections.flatMap(r => 
      r.preview
        .filter(p => typeof p.value === 'string')
        .map(p => (p.value as string).length)
    );
    
    return lengths.length > 0 ? Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length) : 0;
  }

  private calculateFollowUpRate(reflections: EnhancedSearchResult[]): number {
    const totalAnswers = reflections.reduce((sum, r) => sum + r.preview.length, 0);
    const followUpAnswers = reflections.reduce((sum, r) => 
      sum + r.preview.filter(p => p.followUpAnswer && p.followUpAnswer.length > 0).length, 0
    );
    
    return totalAnswers > 0 ? Math.round((followUpAnswers / totalAnswers) * 100) : 0;
  }

  private calculateDaysSinceLastReflection(reflections: EnhancedSearchResult[]): number {
    if (reflections.length === 0) return 999;
    
    const mostRecent = reflections
      .map(r => new Date(r.submittedAt))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    return Math.round((Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  }

  private extractDominantThemes(reflections: EnhancedSearchResult[]): string[] {
    const themes = new Map<string, number>();
    const keywords = ['goal', 'challenge', 'success', 'stress', 'growth', 'confidence'];
    
    reflections.forEach(reflection => {
      reflection.preview.forEach(preview => {
        if (typeof preview.value === 'string') {
          const text = preview.value.toLowerCase();
          keywords.forEach(keyword => {
            if (text.includes(keyword)) {
              themes.set(keyword, (themes.get(keyword) || 0) + 1);
            }
          });
        }
      });
    });

    return Array.from(themes.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([theme]) => theme);
  }

  private getDateFromTimeframe(timeframe: string): string {
    const now = new Date();
    switch (timeframe) {
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
  }

  // Export analytics data
  async exportAnalytics(
    insights: ReflectionInsight[],
    progressMetrics: ClientProgressMetrics[],
    recommendations: CoachingRecommendation[],
    format: 'json' | 'csv' = 'json'
  ): Promise<Blob> {
    if (format === 'json') {
      const exportData = {
        exportedAt: new Date().toISOString(),
        summary: {
          totalInsights: insights.length,
          totalClients: progressMetrics.length,
          totalRecommendations: recommendations.length,
          urgentRecommendations: recommendations.filter(r => r.priority === 'urgent').length,
        },
        insights,
        progressMetrics,
        recommendations,
      };

      return new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
    } else {
      // CSV format for analytics summary
      const headers = ['Type', 'Title', 'Severity', 'Confidence', 'Actionable', 'Timeframe'];
      const rows = insights.map(insight => [
        insight.type,
        insight.title,
        insight.severity,
        (insight.confidence * 100).toFixed(0) + '%',
        insight.actionable ? 'Yes' : 'No',
        insight.timeframe,
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return new Blob([csvContent], {
        type: 'text/csv',
      });
    }
  }
}

// Export singleton instance
export const reflectionAnalyticsService = new ReflectionAnalyticsService(); 