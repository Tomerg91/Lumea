import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useResources } from '../../hooks/useResources';
import { 
  RESOURCE_TYPE_CONFIG,
  RESOURCE_DIFFICULTY_CONFIG
} from '../../types/resource';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart3,
  TrendingUp,
  Users,
  Download,
  Eye,
  Star,
  FileText,
  Video,
  BookOpen,
  Layout,
  File,
  Target,
  Brain,
  MessageCircle,
  Crown,
  User,
  Heart,
  Briefcase,
  Activity,
  Calendar,
  Clock
} from 'lucide-react';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  className?: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  className = ''
}) => {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center text-xs ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`w-3 h-3 mr-1 ${
                  trend.isPositive ? '' : 'rotate-180'
                }`} />
                {Math.abs(trend.value)}% from last month
              </div>
            )}
          </div>
          <div className="p-3 bg-gradient-lavender rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ResourceAnalyticsDashboardProps {
  compact?: boolean;
}

export const ResourceAnalyticsDashboard: React.FC<ResourceAnalyticsDashboardProps> = ({
  compact = false
}) => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { resources, loading, getResourceStats } = useResources();

  const stats = useMemo(() => {
    return getResourceStats();
  }, [getResourceStats]);

  // Calculate additional metrics
  const metrics = useMemo(() => {
    const totalEngagement = stats.totalViews + stats.totalDownloads;
    const avgEngagementPerResource = totalEngagement / stats.totalResources || 0;
    const topPerformingResources = resources
      .sort((a, b) => (b.viewCount + b.downloadCount) - (a.viewCount + a.downloadCount))
      .slice(0, 5);

    // Mock trend data (in real app, this would come from time-series data)
    const mockTrends = {
      resources: { value: 12, isPositive: true },
      views: { value: 23, isPositive: true },
      downloads: { value: 8, isPositive: true },
      rating: { value: 3, isPositive: true }
    };

    return {
      totalEngagement,
      avgEngagementPerResource,
      topPerformingResources,
      trends: mockTrends
    };
  }, [stats, resources]);

  // Get icon for resource type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="w-5 h-5 text-white" />;
      case 'video': return <Video className="w-5 h-5 text-white" />;
      case 'worksheet': return <BookOpen className="w-5 h-5 text-white" />;
      case 'guide': return <BookOpen className="w-5 h-5 text-white" />;
      case 'template': return <Layout className="w-5 h-5 text-white" />;
      case 'document': return <File className="w-5 h-5 text-white" />;
      default: return <FileText className="w-5 h-5 text-white" />;
    }
  };

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'goal setting': return <Target className="w-4 h-4" />;
      case 'mindfulness': return <Brain className="w-4 h-4" />;
      case 'communication': return <MessageCircle className="w-4 h-4" />;
      case 'leadership': return <Crown className="w-4 h-4" />;
      case 'personal development': return <User className="w-4 h-4" />;
      case 'wellness': return <Heart className="w-4 h-4" />;
      case 'career': return <Briefcase className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl-layout' : ''}`}>
      {!compact && (
        <div>
          <h2 className="text-2xl font-bold text-gradient-purple mb-2">
            Resource Analytics
          </h2>
          <p className="text-gray-600">
            Insights and performance metrics for your resource library
          </p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard
          title="Total Resources"
          value={stats.totalResources}
          subtitle={`${stats.totalResources > 0 ? 'Active library' : 'Getting started'}`}
          trend={metrics.trends.resources}
          icon={<FileText className="w-5 h-5 text-white" />}
        />
        
        <AnalyticsCard
          title="Total Views"
          value={stats.totalViews.toLocaleString()}
          subtitle="All-time resource views"
          trend={metrics.trends.views}
          icon={<Eye className="w-5 h-5 text-white" />}
        />
        
        <AnalyticsCard
          title="Total Downloads"
          value={stats.totalDownloads.toLocaleString()}
          subtitle="All-time downloads"
          trend={metrics.trends.downloads}
          icon={<Download className="w-5 h-5 text-white" />}
        />
        
        <AnalyticsCard
          title="Average Rating"
          value={stats.averageRating.toFixed(1)}
          subtitle="User satisfaction score"
          trend={metrics.trends.rating}
          icon={<Star className="w-5 h-5 text-white" />}
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Resource Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Resource Types</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.resourcesByType).map(([type, count]) => {
                    const config = RESOURCE_TYPE_CONFIG[type as keyof typeof RESOURCE_TYPE_CONFIG];
                    const percentage = (count / stats.totalResources) * 100;
                    
                    return (
                      <div key={type} className="space-y-2">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {getTypeIcon(type)}
                            <span className="font-medium">{config?.label || type}</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <span className="text-sm text-gray-600">{count}</span>
                            <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-lavender h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Level Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Difficulty Levels</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.resourcesByDifficulty).map(([difficulty, count]) => {
                    const config = RESOURCE_DIFFICULTY_CONFIG[difficulty as keyof typeof RESOURCE_DIFFICULTY_CONFIG];
                    const percentage = (count / stats.totalResources) * 100;
                    
                    return (
                      <div key={difficulty} className="space-y-2">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`w-3 h-3 rounded-full ${
                              config?.color === 'green' ? 'bg-green-500' :
                              config?.color === 'yellow' ? 'bg-yellow-500' :
                              config?.color === 'red' ? 'bg-red-500' : 'bg-gray-500'
                            }`}></div>
                            <span className="font-medium">{config?.label || difficulty}</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <span className="text-sm text-gray-600">{count}</span>
                            <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              config?.color === 'green' ? 'bg-green-500' :
                              config?.color === 'yellow' ? 'bg-yellow-500' :
                              config?.color === 'red' ? 'bg-red-500' : 'bg-gray-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Performing Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Top Performing Resources</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.topPerformingResources.map((resource, index) => {
                    const totalEngagement = resource.viewCount + resource.downloadCount;
                    
                    return (
                      <div key={resource.id} className={`flex items-center space-x-3 p-3 rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gradient-lavender rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{resource.title}</p>
                          <div className={`flex items-center space-x-4 text-xs text-gray-500 mt-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              <Eye className="w-3 h-3" />
                              <span>{resource.viewCount}</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              <Download className="w-3 h-3" />
                              <span>{resource.downloadCount}</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              <Star className="w-3 h-3" />
                              <span>{resource.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{totalEngagement}</p>
                          <p className="text-xs text-gray-500">engagements</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {metrics.topPerformingResources.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No performance data yet</p>
                      <p className="text-sm">Create and share resources to see analytics</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Engagement Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gradient-purple">
                      {metrics.avgEngagementPerResource.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600">Average engagements per resource</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm font-medium">View Rate</span>
                      <span className="text-sm text-gray-600">
                        {stats.totalResources > 0 ? (stats.totalViews / stats.totalResources).toFixed(1) : '0'} per resource
                      </span>
                    </div>
                    
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm font-medium">Download Rate</span>
                      <span className="text-sm text-gray-600">
                        {stats.totalResources > 0 ? (stats.totalDownloads / stats.totalResources).toFixed(1) : '0'} per resource
                      </span>
                    </div>
                    
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm font-medium">Conversion Rate</span>
                      <span className="text-sm text-gray-600">
                        {stats.totalViews > 0 ? ((stats.totalDownloads / stats.totalViews) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Popular Categories</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.topCategories.map((category, index) => (
                  <div key={category.category} className="p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className="p-2 bg-gradient-lavender rounded-lg">
                        {getCategoryIcon(category.category)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{category.category}</p>
                        <p className="text-xs text-gray-500">{category.count} resources</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              {stats.topCategories.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No categories yet</p>
                  <p className="text-sm">Add categories to your resources to see distribution</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Popular Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Popular Tags</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.topTags.map((tag, index) => (
                  <Badge 
                    key={tag.tag} 
                    variant="outline" 
                    className="flex items-center space-x-1"
                  >
                    <span>{tag.tag}</span>
                    <span className="text-xs text-gray-500">({tag.count})</span>
                  </Badge>
                ))}
              </div>
              
              {stats.topTags.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tags yet</p>
                  <p className="text-sm">Add tags to your resources to see popular topics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-lavender rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {activity.type === 'created' && 'Resource created'}
                        {activity.type === 'updated' && 'Resource updated'}
                        {activity.type === 'downloaded' && 'Resource downloaded'}
                        {activity.type === 'viewed' && 'Resource viewed'}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{activity.resourceTitle}</p>
                      <p className="text-xs text-gray-500">
                        by {activity.userName} • {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {stats.recentActivity.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">Activity will appear here as users interact with resources</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResourceAnalyticsDashboard; 