import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import aiService, { ReflectionInsight } from '../../services/aiService';
import { useReflections } from '../../hooks/useReflections';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import {
  Brain,
  TrendingUp,
  Heart,
  Lightbulb,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Smile,
  Meh,
  Frown
} from 'lucide-react';

interface ReflectionData {
  id: string;
  content: string;
  createdAt: Date;
  insights?: ReflectionInsight[];
}

interface SentimentTrend {
  date: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
}

interface InsightSummary {
  totalInsights: number;
  sentimentTrends: SentimentTrend[];
  commonPatterns: string[];
  moodDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  recentInsights: ReflectionInsight[];
}

export const ReflectionInsightsDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const { data: realReflections = [], isLoading: reflectionsLoading, refetch: fetchReflections } = useReflections();
  
  const [insights, setInsights] = useState<ReflectionInsight[]>([]);
  const [reflections, setReflections] = useState<ReflectionData[]>([]);
  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  useEffect(() => {
    if (profile?.id) {
      checkConsentAndLoadData();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (hasConsent && realReflections.length > 0) {
      generateSummary();
    }
  }, [hasConsent, realReflections]);

  const checkConsentAndLoadData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      // Check if user has consented to reflection insights
      const consent = await aiService.checkConsent(profile.id as string, 'reflection_insights');
      setHasConsent(consent);

      if (consent) {
        await fetchReflections();
        await loadInsights();
      }
    } catch (error) {
      console.error('Failed to check consent or load data:', error);
      toast({
        title: 'Error Loading Insights',
        description: 'Failed to load reflection insights.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    // Load existing insights from database
    // For now, we'll generate mock insights based on real reflections
    if (realReflections.length > 0) {
             const mockInsights: ReflectionInsight[] = realReflections.slice(0, 5).map((reflection, index) => {
         const firstAnswer = reflection.answers?.[0];
         const contentText = typeof firstAnswer?.value === 'string' ? firstAnswer.value : 'Reflection content';
         
         return {
           id: `insight-${reflection.id}-${index}`,
           type: ['sentiment', 'pattern', 'mood', 'suggestion'][index % 4] as any,
           content: `AI analysis of reflection: "${contentText.substring(0, 50)}..."`,
           confidence: 0.7 + Math.random() * 0.3,
           metadata: {
             reflectionId: reflection.id,
             analysisDate: new Date().toISOString()
           },
           createdAt: new Date()
         };
       });
      setInsights(mockInsights);
    }
  };

  const analyzeReflection = async (reflectionId: string, content: string) => {
    if (!profile?.id || !hasConsent) return;

    try {
      setAnalyzing(reflectionId);
      
      const generatedInsights = await aiService.analyzeReflection(
        profile.id as string,
        content,
        reflectionId,
                 realReflections.slice(-3).map(r => {
           const firstAnswer = r.answers?.[0];
           return typeof firstAnswer?.value === 'string' ? firstAnswer.value : '';
         })
      );

      setInsights(prev => [...prev, ...generatedInsights]);

      toast({
        title: 'Analysis Complete',
        description: `Generated ${generatedInsights.length} insights for your reflection.`,
      });
    } catch (error) {
      console.error('Failed to analyze reflection:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Failed to analyze reflection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(null);
    }
  };

  const generateSummary = () => {
    if (realReflections.length === 0) return;
    
    const mockSummary: InsightSummary = {
      totalInsights: insights.length || Math.floor(realReflections.length * 1.5),
             sentimentTrends: realReflections.slice(0, 7).map((reflection, index) => ({
         date: new Date(reflection.created_at).toISOString().split('T')[0],
         sentiment: ['positive', 'neutral', 'positive', 'negative', 'positive', 'neutral', 'positive'][index] as any,
         score: 0.4 + Math.random() * 0.6
       })),
      commonPatterns: [
        'Regular reflection practice showing consistency',
        'Growing self-awareness and emotional intelligence',
        'Progress tracking and goal-oriented thinking',
        'Increased gratitude and positive mindset'
      ],
      moodDistribution: {
        positive: 65,
        neutral: 25,
        negative: 10,
      },
      recentInsights: insights.slice(0, 3)
    };

    setSummary(mockSummary);
  };

  const enableConsentAndRetry = async () => {
    if (!profile?.id) return;

    try {
      await aiService.updateConsent(profile.id as string, 'reflection_insights', true);
      setHasConsent(true);
      await fetchReflections();
      
      toast({
        title: 'AI Insights Enabled',
        description: 'Reflection insights have been enabled. Analyzing your reflections...',
      });
    } catch (error) {
      console.error('Failed to enable consent:', error);
      toast({
        title: 'Failed to Enable',
        description: 'Failed to enable AI insights. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-4 h-4 text-green-600" />;
      case 'negative': return <Frown className="w-4 h-4 text-red-600" />;
      default: return <Meh className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'sentiment': return <Heart className="w-4 h-4" />;
      case 'pattern': return <TrendingUp className="w-4 h-4" />;
      case 'mood': return <Smile className="w-4 h-4" />;
      case 'suggestion': return <Lightbulb className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading || reflectionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Reflection Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasConsent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Reflection Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI-powered reflection insights are not enabled. Enable this feature to get personalized 
              insights about your reflections, including sentiment analysis, pattern recognition, and coaching suggestions.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col gap-3">
            <h4 className="font-medium">What you'll get:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Sentiment analysis and mood tracking
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Pattern recognition across your journey
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Personalized coaching suggestions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Progress visualization and trends
              </li>
            </ul>
            
            <Button onClick={enableConsentAndRetry} className="w-fit">
              Enable AI Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reflections</p>
                  <p className="text-2xl font-bold">{realReflections.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Insights</p>
                  <p className="text-2xl font-bold">{summary.totalInsights}</p>
                </div>
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Positive Sentiment</p>
                  <p className="text-2xl font-bold">{summary.moodDistribution.positive}%</p>
                </div>
                <Smile className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Growth Patterns</p>
                  <p className="text-2xl font-bold">{summary.commonPatterns.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Reflections with AI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Recent Reflections & AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {realReflections.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reflections available yet. Start reflecting to see insights here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {realReflections.slice(0, 5).map((reflection) => (
                <Card key={reflection.id} className="p-4">
                  <div className="space-y-3">
                                         <div className="flex items-start justify-between">
                       <div className="flex-1">
                         <p className="text-sm text-gray-600">
                           {new Date(reflection.created_at).toLocaleDateString()}
                         </p>
                         <p className="text-sm mt-1">
                           {(() => {
                             const firstAnswer = reflection.answers?.[0];
                             const contentText = typeof firstAnswer?.value === 'string' ? firstAnswer.value : 'Reflection content';
                             return contentText.substring(0, 200) + (contentText.length > 200 ? '...' : '');
                           })()}
                         </p>
                       </div>
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => {
                           const firstAnswer = reflection.answers?.[0];
                           const contentText = typeof firstAnswer?.value === 'string' ? firstAnswer.value : '';
                           analyzeReflection(reflection.id, contentText);
                         }}
                         disabled={analyzing === reflection.id}
                       >
                        {analyzing === reflection.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Brain className="w-3 h-3 mr-1" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Show insights for this reflection */}
                    {insights.filter(insight => insight.metadata?.reflectionId === reflection.id).length > 0 && (
                      <div className="ml-4 pl-4 border-l-2 border-blue-200">
                        <h5 className="text-sm font-medium mb-2">AI Insights:</h5>
                        {insights
                          .filter(insight => insight.metadata?.reflectionId === reflection.id)
                          .map(insight => (
                            <div key={insight.id} className="flex items-start gap-2 mb-2">
                              {getInsightIcon(insight.type)}
                              <div className="flex-1">
                                <p className="text-sm">{insight.content}</p>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {Math.round(insight.confidence * 100)}% confidence
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Reflection Insights Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="insights" className="space-y-4">
            <TabsList>
              <TabsTrigger value="insights">Recent Insights</TabsTrigger>
              <TabsTrigger value="trends">Mood Trends</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="reflections">Reflections</TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="space-y-4">
              {summary?.recentInsights && summary.recentInsights.length > 0 ? (
                <div className="space-y-3">
                  {summary.recentInsights.map((insight) => (
                    <Card key={insight.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {insight.type}
                            </Badge>
                            <span className={`text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{insight.content}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {insight.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No insights available yet. Analyze your reflections to see insights here.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              {summary?.moodDistribution && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Mood Distribution</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smile className="w-4 h-4 text-green-600" />
                        <span>Positive</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={summary.moodDistribution.positive} className="w-24" />
                        <span className="text-sm font-medium">{summary.moodDistribution.positive}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Meh className="w-4 h-4 text-yellow-600" />
                        <span>Neutral</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={summary.moodDistribution.neutral} className="w-24" />
                        <span className="text-sm font-medium">{summary.moodDistribution.neutral}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Frown className="w-4 h-4 text-red-600" />
                        <span>Challenging</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={summary.moodDistribution.negative} className="w-24" />
                        <span className="text-sm font-medium">{summary.moodDistribution.negative}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              {summary?.commonPatterns && summary.commonPatterns.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Common Patterns</h3>
                  {summary.commonPatterns.map((pattern, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                        <p className="text-sm">{pattern}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No patterns detected yet. Continue reflecting to identify patterns.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reflections" className="space-y-4">
              <div className="space-y-3">
                {realReflections.map((reflection) => (
                  <Card key={reflection.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(reflection.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2">
                          {reflection.insights && reflection.insights.length > 0 ? (
                            <Badge variant="default" className="text-xs">
                              {reflection.insights.length} insights
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => analyzeReflection(reflection.id, reflection.content || '')}
                              disabled={analyzing === reflection.id}
                            >
                              {analyzing === reflection.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <Brain className="w-3 h-3 mr-1" />
                              )}
                              Analyze
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700">{reflection.content}</p>
                      
                      {reflection.insights && reflection.insights.length > 0 && (
                        <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                          {reflection.insights.map((insight) => (
                            <div key={insight.id} className="flex items-center gap-2 text-xs">
                              {getInsightIcon(insight.type)}
                              <span className="text-gray-600">{insight.content.slice(0, 100)}...</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReflectionInsightsDashboard; 