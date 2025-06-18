import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ResourceManager from '../components/resources/ResourceManager';
import { ResourceLibrary } from '../components/resources/ResourceLibrary';
import ResourceAnalyticsDashboard from '../components/resources/ResourceAnalyticsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  BookOpen, 
  BarChart3,
  Settings,
  Plus
} from 'lucide-react';

const ResourcesPage = () => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('library');

  // Different tabs for coaches vs clients
  const getTabsForRole = () => {
    if (profile?.role === 'coach') {
      return [
        { value: 'library', label: 'Library', icon: <BookOpen className="w-4 h-4" /> },
        { value: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
        { value: 'manage', label: 'Manage', icon: <Settings className="w-4 h-4" /> }
      ];
    } else {
      return [
        { value: 'library', label: 'My Resources', icon: <BookOpen className="w-4 h-4" /> }
      ];
    }
  };

  const tabs = getTabsForRole();

  return (
    <div className={`min-h-screen bg-gradient-background py-8 ${isRTL ? 'rtl-layout' : ''}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient-purple mb-2">
            {profile?.role === 'coach' ? 'Resource Management' : 'My Resources'}
          </h1>
          <p className="text-gray-600">
            {profile?.role === 'coach' 
              ? 'Manage and share resources with your clients'
              : 'Access materials assigned by your coach to support your growth journey'
            }
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          {profile?.role === 'coach' ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full grid-cols-${tabs.length} mb-6`}>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex items-center space-x-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="library" className="space-y-6">
                <ResourceManager 
                  showCreateButton={true} 
                  onResourceSelect={(resource) => {
                    console.log('Selected resource:', resource);
                    // Handle resource selection (e.g., open modal, navigate, etc.)
                  }}
                />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <ResourceAnalyticsDashboard />
              </TabsContent>

              <TabsContent value="manage" className="space-y-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="w-5 h-5" />
                        <span>Resource Management</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        Manage your resource library settings and preferences.
                      </p>
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Quick Actions</h4>
                          <div className="flex space-x-2">
                            <button 
                              className="btn-primary flex items-center space-x-2"
                              onClick={() => setActiveTab('library')}
                            >
                              <Plus className="w-4 h-4" />
                              <span>Create Resource</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Library Settings</h4>
                          <p className="text-sm text-gray-600">
                            Configure default categories, tags, and resource templates.
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
            <ResourceLibrary />
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage; 