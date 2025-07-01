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
  Clock,
  Tag
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
  const { resources, loading } = useResources();

  // Mock stats since getResourceStats doesn't exist
  const stats = {
    totalResources: resources.length,
    totalDownloads: 0,
    totalViews: 0,
    averageRating: 0
  };

  const popularResources = resources
    .slice(0, 5); // Just take first 5 since viewCount/downloadCount don't exist

  const categoryStats = resources.reduce((acc: any, resource: any) => {
    const category = resource.category || 'Other';
    if (!acc[category]) acc[category] = 0;
    acc[category]++;
    return acc;
  }, {});

  // Calculate additional metrics
  const metrics = useMemo(() => {
    const totalEngagement = stats.totalViews + stats.totalDownloads;
    const avgEngagementPerResource = totalEngagement / stats.totalResources || 0;
    const topPerformingResources = resources.slice(0, 5); // Simplified since viewCount/downloadCount don't exist

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
                  {Object.entries(categoryStats).map(([category, count]) => {
                    const percentage = stats.totalResources > 0 ? (Number(count) / stats.totalResources) * 100 : 0;
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {getCategoryIcon(category)}
                            <span className="font-medium">{category}</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <span className="text-sm text-gray-600">{String(count)}</span>
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
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Difficulty level analytics coming soon</p>
                  </div>
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
                  {popularResources.map((resource: any, index: number) => {
                    const totalEngagement = 0; // Since viewCount and downloadCount don't exist
                    
                    return (
                      <div key={resource.id || index} className={`flex items-center space-x-4 p-4 rounded-lg border hover:shadow-md transition-shadow ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`flex-shrink-0 ${isRTL ? 'mr-4' : 'ml-4'}`}>
                          <span className="text-2xl font-bold text-gradient-purple">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{resource.title || 'Untitled Resource'}</h4>
                          <p className="text-xs text-gray-500">{resource.category || 'Uncategorized'}</p>
                          <div className={`flex items-center space-x-4 mt-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              <Eye className="w-3 h-3" />
                              <span>{0}</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              <Download className="w-3 h-3" />
                              <span>{0}</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              <Star className="w-3 h-3" />
                              <span>{0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {popularResources.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No resources to analyze yet</p>
                      <p className="text-xs">Add resources to see performance metrics</p>
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
                {Object.entries(categoryStats).map(([category, count]) => {
                  const percentage = stats.totalResources > 0 ? (Number(count) / stats.totalResources) * 100 : 0;
                  
                  return (
                    <div key={category} className="p-4 rounded-lg border hover:shadow-md transition-shadow">
                      <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className="p-2 bg-gradient-lavender rounded-lg">
                          {getCategoryIcon(category)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{category}</p>
                          <p className="text-xs text-gray-500">{String(count)} resources</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          #{Object.entries(categoryStats).length - Object.entries(categoryStats).indexOf([category, count]) - 1}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {Object.entries(categoryStats).length === 0 && (
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
                <div className="text-center py-8 text-gray-500 w-full">
                  <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Tag analytics coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Activity feed coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResourceAnalyticsDashboard; 