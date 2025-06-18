import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ResourceManager from '../components/resources/ResourceManager';
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

  return (
    <div className={`min-h-screen bg-gradient-background py-8 ${isRTL ? 'rtl-layout' : ''}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient-purple mb-2">
            Resource Library
          </h1>
          <p className="text-gray-600">
            {profile?.role === 'coach' 
              ? 'Curated resources to enhance your coaching practice'
              : 'Tools and materials to support your personal growth journey'
            }
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="library" className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>Library</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Manage</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="space-y-6">
              <ResourceManager 
                showCreateButton={profile?.role === 'coach'} 
                onResourceSelect={(resource) => {
                  console.log('Selected resource:', resource);
                  // Handle resource selection (e.g., open modal, navigate, etc.)
                }}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {profile?.role === 'coach' ? (
                <ResourceAnalyticsDashboard />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 bg-gradient-lavender rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Analytics Available for Coaches</h3>
                    <p className="text-gray-600">
                      Resource analytics and insights are available for coaching accounts.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              {profile?.role === 'coach' ? (
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
                        
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Sharing Options</h4>
                          <p className="text-sm text-gray-600">
                            Set default visibility and sharing preferences for new resources.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 bg-gradient-lavender rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Settings className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Management Available for Coaches</h3>
                    <p className="text-gray-600">
                      Resource management features are available for coaching accounts.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage; 