import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import AIPrivacyControls from '../components/ai/AIPrivacyControls';
import ReflectionInsightsDashboard from '../components/ai/ReflectionInsightsDashboard';
import SessionPlanningAssistant from '../components/ai/SessionPlanningAssistant';
import { AutomationRulesManager } from '../components/ai/AutomationRulesManager';
import { CommunicationAssistant } from '../components/ai/CommunicationAssistant';
import { 
  Brain, 
  Shield, 
  MessageSquare, 
  BarChart3, 
  Sparkles,
  Settings,
  Lightbulb,
  Heart,
  Zap
} from 'lucide-react';

const AISettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI-Powered Features</h1>
                  <p className="text-gray-600">Epic 11: Advanced Features Dashboard</p>
                </div>
              </div>
              <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-blue-600">
                <Sparkles className="w-3 h-3 mr-1" />
                Beta
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="planning" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Planning
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Communication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Epic 11: Advanced AI Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-sm text-gray-700 space-y-4">
                  <p>
                    Welcome to the future of coaching! Epic 11 introduces sophisticated AI-powered features 
                    that enhance your coaching practice with intelligent insights, automated workflows, 
                    and personalized recommendations.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Heart className="w-6 h-6 text-blue-600" />
                        <h3 className="font-medium">Reflection Insights</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        AI analyzes client reflections to provide sentiment analysis, mood tracking, 
                        and pattern recognition across their coaching journey.
                      </p>
                      <Badge variant="default" className="text-xs">Available</Badge>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <div className="flex items-center gap-3 mb-3">
                        <MessageSquare className="w-6 h-6 text-green-600" />
                        <h3 className="font-medium">Session Planning</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        AI assistant helps prepare effective sessions based on client history, 
                        goals, and coaching patterns with personalized recommendations.
                      </p>
                      <Badge variant="secondary" className="text-xs">In Development</Badge>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 className="w-6 h-6 text-orange-600" />
                        <h3 className="font-medium">Advanced Analytics</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        AI-powered insights into coaching effectiveness, client progress patterns, 
                        and engagement analytics with predictive modeling.
                      </p>
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Zap className="w-6 h-6 text-purple-600" />
                        <h3 className="font-medium">Smart Automation</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        AI-driven workflows for reminders, follow-ups, resource recommendations, 
                        and milestone detection with personalized timing.
                      </p>
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Lightbulb className="w-6 h-6 text-teal-600" />
                        <h3 className="font-medium">Communication Intelligence</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        AI enhances messaging with tone analysis, personalization suggestions, 
                        and multi-language support for better client communication.
                      </p>
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Shield className="w-6 h-6 text-gray-600" />
                        <h3 className="font-medium">Privacy First</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        All AI features are built with privacy-first architecture, granular consent 
                        management, and transparent data usage policies.
                      </p>
                      <Badge variant="default" className="text-xs">Built-in</Badge>
                    </Card>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Implementation Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-sm font-medium">Phase 1: Foundation</span>
                      </div>
                      <Badge variant="default" className="bg-green-600">Complete</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Phase 2: Core AI Features</span>
                      </div>
                      <Badge variant="secondary">In Progress</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm font-medium">Phase 3: Advanced Analytics</span>
                      </div>
                      <Badge variant="outline">Planned</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm font-medium">Phase 4: Automation & Intelligence</span>
                      </div>
                      <Badge variant="outline">Planned</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <AIPrivacyControls />
          </TabsContent>

          <TabsContent value="insights">
            <ReflectionInsightsDashboard />
          </TabsContent>

          <TabsContent value="planning">
            <SessionPlanningAssistant />
          </TabsContent>

                      <TabsContent value="automation" className="space-y-6">
              <AutomationRulesManager />
            </TabsContent>

            <TabsContent value="communication" className="space-y-6">
              <CommunicationAssistant />
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
};

export default AISettingsPage; 