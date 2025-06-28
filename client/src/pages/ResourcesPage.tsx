import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import ResourceManager from '../components/resources/ResourceManager';
import { ResourceLibrary } from '../components/resources/ResourceLibrary';
import ResourceAnalyticsDashboard from '../components/resources/ResourceAnalyticsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  BookOpen, 
  BarChart3,
  Settings,
  Plus,
  Users,
  FileText,
  Sparkles,
  TrendingUp,
  Library,
  Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ResourcesPage = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('library');

  // Different tabs for coaches vs clients
  const getTabsForRole = () => {
    if (profile?.role === 'coach') {
      return [
        { value: 'library', label: t('resources.library'), icon: <BookOpen className="w-4 h-4" /> },
        { value: 'analytics', label: t('resources.analytics'), icon: <BarChart3 className="w-4 h-4" /> },
        { value: 'manage', label: t('resources.manage'), icon: <Settings className="w-4 h-4" /> }
      ];
    } else {
      return [
        { value: 'library', label: t('resources.myResources'), icon: <Library className="w-4 h-4" /> }
      ];
    }
  };

  const tabs = getTabsForRole();
  const isCoach = profile?.role === 'coach';

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8",
      isRTL && "rtl"
    )}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl">
              {isCoach ? <Folder className="w-8 h-8 text-white" /> : <Library className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {isCoach ? t('resources.management') : t('resources.myResources')}
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {isCoach 
              ? t('resources.coachDescription')
              : t('resources.clientDescription')
            }
          </p>
        </div>

        {/* Stats Cards for Coaches */}
        {isCoach && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('resources.totalResources')}</p>
                    <p className="text-2xl font-bold text-gray-900">24</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('resources.sharedWithClients')}</p>
                    <p className="text-2xl font-bold text-gray-900">18</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('resources.engagementRate')}</p>
                    <p className="text-2xl font-bold text-gray-900">87%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          {isCoach ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={cn(
                "grid w-full mb-8 bg-gray-100/80 p-1 rounded-xl",
                tabs.length === 3 ? "grid-cols-3" : "grid-cols-2"
              )}>
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value} 
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300",
                      "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg",
                      isRTL && "flex-row-reverse"
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="library" className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {t('resources.resourceLibrary')}
                    </h2>
                  </div>
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => {/* Handle create resource */}}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('resources.createResource')}
                  </Button>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6">
                  <ResourceManager 
                    showCreateButton={true} 
                    onResourceSelect={(resource) => {
                      console.log('Selected resource:', resource);
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {t('resources.analytics')}
                  </h2>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6">
                  <ResourceAnalyticsDashboard />
                </div>
              </TabsContent>

              <TabsContent value="manage" className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {t('resources.management')}
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Quick Actions Card */}
                  <Card className="bg-white/80 border-gray-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Plus className="w-5 h-5 text-purple-600" />
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          {t('resources.quickActions')}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600 mb-4">
                        {t('resources.quickActionsDesc')}
                      </p>
                      <div className="space-y-3">
                        <Button 
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                          onClick={() => setActiveTab('library')}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t('resources.createResource')}
                        </Button>
                        
                        <Button 
                          variant="outline"
                          className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                          onClick={() => setActiveTab('analytics')}
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          {t('resources.viewAnalytics')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Library Settings Card */}
                  <Card className="bg-white/80 border-gray-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-purple-600" />
                        <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          {t('resources.librarySettings')}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600 mb-4">
                        {t('resources.librarySettingsDesc')}
                      </p>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                          <h4 className="font-medium text-purple-900 mb-2">{t('resources.categories')}</h4>
                          <p className="text-sm text-purple-700">
                            {t('resources.categoriesDesc')}
                          </p>
                        </div>
                        
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                          <h4 className="font-medium text-blue-900 mb-2">{t('resources.templates')}</h4>
                          <p className="text-sm text-blue-700">
                            {t('resources.templatesDesc')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // Client interface - just show the ResourceLibrary directly
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Library className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {t('resources.myResources')}
                </h2>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6">
                <ResourceLibrary />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>{t('resources.footerText')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage; 