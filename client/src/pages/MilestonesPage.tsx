import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Target, Users, TrendingUp, Calendar, BarChart3, Activity, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import MilestoneManager from '../components/milestones/MilestoneManager';
import {
  Milestone,
  MilestoneCategory,
  MilestoneStats,
  DEFAULT_MILESTONE_CATEGORIES
} from '../types/milestone';

const MilestonesPage: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [categories, setCategories] = useState<MilestoneCategory[]>([]);
  const [stats, setStats] = useState<MilestoneStats | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Simple mock data for development
  useEffect(() => {
    const mockClients = [
      { id: 'client-1', name: 'Sarah Johnson' },
      { id: 'client-2', name: 'Michael Chen' },
      { id: 'client-3', name: 'Emma Rodriguez' },
      { id: 'client-4', name: 'David Kim' }
    ];

    const coachId = (profile?.id || 'coach-1') as string;

    const mockCategories: MilestoneCategory[] = DEFAULT_MILESTONE_CATEGORIES.map((cat, index) => ({
      ...cat,
      id: `cat-${index + 1}`,
      coachId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const mockStats: MilestoneStats = {
      total: 4,
      active: 3,
      completed: 1,
      paused: 0,
      cancelled: 0,
      overdue: 0,
      completionRate: 75,
      averageProgress: 55
    };

    setClients(mockClients);
    setCategories(mockCategories);
    setMilestones([]);
    setStats(mockStats);
    setLoading(false);
  }, [profile?.id]);

  // Filter milestones based on selected client and category
  const filteredMilestones = milestones.filter(milestone => {
    const matchesClient = selectedClient === 'all' || milestone.clientId === selectedClient;
    const matchesCategory = selectedCategory === 'all' || milestone.categoryId === selectedCategory;
    return matchesClient && matchesCategory;
  });

  const handleMilestoneCreate = (milestone: Milestone) => {
    setMilestones(prev => [...prev, milestone]);
  };

  const handleMilestoneUpdate = (milestone: Milestone) => {
    setMilestones(prev => prev.map(m => m.id === milestone.id ? milestone : m));
  };

  const handleMilestoneDelete = (milestoneId: string) => {
    setMilestones(prev => prev.filter(m => m.id !== milestoneId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('milestones.pageTitle', 'Milestone Management')}</h1>
          <p className="text-gray-600 mt-1">{t('milestones.pageDescription', 'Track and manage client milestones and progress')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('milestones.filters.selectClient', 'Select Client')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('milestones.filters.allClients', 'All Clients')}</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('milestones.filters.selectCategory', 'Select Category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('milestones.filters.allCategories', 'All Categories')}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('milestones.stats.totalMilestones', 'Total Milestones')}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('milestones.stats.activeClients', 'Active Clients')}</p>
                  <p className="text-2xl font-bold">{clients.length}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('milestones.stats.completionRate', 'Completion Rate')}</p>
                  <p className="text-2xl font-bold">{stats.completionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('milestones.stats.averageProgress', 'Average Progress')}</p>
                  <p className="text-2xl font-bold">{Math.round(stats.averageProgress)}%</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('milestones.tabs.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="visualization">{t('milestones.tabs.visualization', 'Progress Visualization')}</TabsTrigger>
          <TabsTrigger value="manage">{t('milestones.tabs.manage', 'Manage')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('milestones.overview.title', 'Milestones Overview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Active Milestones by Category */}
                {categories.map(category => {
                  const categoryMilestones = filteredMilestones.filter(m => 
                    m.categoryId === category.id && m.status === 'active'
                  );
                  
                  return (
                    <Card key={category.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <h3 className="font-medium">{category.name}</h3>
                          <Badge variant="secondary">{categoryMilestones.length}</Badge>
                        </div>
                        {categoryMilestones.length === 0 ? (
                          <p className="text-sm text-gray-500">No active milestones</p>
                        ) : (
                          <div className="space-y-2">
                            {categoryMilestones.slice(0, 3).map(milestone => (
                              <div key={milestone.id} className="text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{milestone.title}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                  <div 
                                    className="bg-blue-600 h-1.5 rounded-full" 
                                    style={{ 
                                      width: `${milestone.progress[milestone.progress.length - 1]?.progressPercent || 0}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visualization" className="space-y-6">
          {/* Progress Analytics Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Progress Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>{t('milestones.visualization.overallProgress', 'Overall Progress')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{t('milestones.visualization.completion', 'Completion Rate')}</span>
                    <span>{stats?.completionRate || 0}%</span>
                  </div>
                  <Progress value={stats?.completionRate || 0} className="h-3" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{t('milestones.visualization.averageProgress', 'Average Progress')}</span>
                    <span>{Math.round(stats?.averageProgress || 0)}%</span>
                  </div>
                  <Progress value={stats?.averageProgress || 0} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
                    <div className="text-sm text-gray-600">{t('milestones.visualization.completed', 'Completed')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats?.active || 0}</div>
                    <div className="text-sm text-gray-600">{t('milestones.visualization.active', 'Active')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats?.paused || 0}</div>
                    <div className="text-sm text-gray-600">{t('milestones.visualization.paused', 'Paused')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Progress Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>{t('milestones.visualization.categoryBreakdown', 'Progress by Category')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.map(category => {
                  const categoryMilestones = filteredMilestones.filter(m => m.categoryId === category.id);
                  const completedInCategory = categoryMilestones.filter(m => m.status === 'completed').length;
                  const categoryProgress = categoryMilestones.length > 0 
                    ? (completedInCategory / categoryMilestones.length) * 100 
                    : 0;
                  
                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {completedInCategory}/{categoryMilestones.length}
                          </span>
                          <span className="text-sm font-medium">
                            {Math.round(categoryProgress)}%
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={categoryProgress} 
                        className="h-2" 
                        style={{ 
                          '--progress-foreground': category.color 
                        } as React.CSSProperties}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Client Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>{t('milestones.visualization.clientProgress', 'Client Progress Overview')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {clients.map(client => {
                  const clientMilestones = filteredMilestones.filter(m => m.clientId === client.id);
                  const completedForClient = clientMilestones.filter(m => m.status === 'completed').length;
                  const clientProgress = clientMilestones.length > 0 
                    ? (completedForClient / clientMilestones.length) * 100 
                    : 0;
                  
                  return (
                    <Card key={client.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{client.name}</h4>
                          <Badge variant={clientProgress >= 75 ? 'default' : clientProgress >= 50 ? 'secondary' : 'outline'}>
                            {Math.round(clientProgress)}%
                          </Badge>
                        </div>
                        
                        <Progress value={clientProgress} className="h-2" />
                        
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{completedForClient} completed</span>
                          <span>{clientMilestones.length} total</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Progress Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>{t('milestones.visualization.trends', 'Progress Trends')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Award className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <p className="text-lg font-medium">
                    {t('milestones.visualization.trendPositive', 'Progress is trending upward')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('milestones.visualization.monthlyGrowth', '+15% this month')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <MilestoneManager
            coachId={(profile?.id || 'coach-1') as string}
            onMilestoneCreate={handleMilestoneCreate}
            onMilestoneUpdate={handleMilestoneUpdate}
            onMilestoneDelete={handleMilestoneDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MilestonesPage; 