import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  BarChart3, 
  Zap, 
  CloudSync, 
  RotateCcw,
  Settings,
  Plus,
  Activity,
  Users,
  Clock,
  TrendingUp
} from 'lucide-react';

// Import scheduling components
import { SchedulingDashboard } from '@/components/scheduling/SchedulingDashboard';
import { AutomatedBookingWorkflows } from '@/components/scheduling/AutomatedBookingWorkflows';
import { EnhancedCalendarSync } from '@/components/scheduling/EnhancedCalendarSync';
import { BookingAnalyticsDashboard } from '@/components/scheduling/BookingAnalyticsDashboard';
import { RecurringSessionManager } from '@/components/scheduling/RecurringSessionManager';

const SchedulingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'automation' | 'calendar' | 'analytics' | 'recurring'>('dashboard');

  // Check user role for feature access
  const isCoach = user?.role === 'coach' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  // Mock stats for the overview
  const schedulingStats = {
    upcomingAppointments: 23,
    pendingRequests: 5,
    activeAutomations: 8,
    syncedCalendars: 3,
    recurringSeriesActive: 12,
    monthlyBookings: 156,
    conversionRate: 89.2,
    clientSatisfaction: 4.8
  };

  if (!isCoach) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-6">
              Scheduling management is available for coaches and administrators only.
            </p>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Contact Your Coach
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-playfair mb-2">
              {t('scheduling.title', 'Scheduling Management')}
            </h1>
            <p className="text-muted-foreground">
              {t('scheduling.description', 'Comprehensive scheduling tools and automation')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              {t('common.settings', 'Settings')}
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('scheduling.newAppointment', 'New Appointment')}
            </Button>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold">{schedulingStats.upcomingAppointments}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold">{schedulingStats.pendingRequests}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Automations</p>
                  <p className="text-2xl font-bold">{schedulingStats.activeAutomations}</p>
                </div>
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{schedulingStats.conversionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Automation</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CloudSync className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar Sync</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Recurring</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Scheduling Overview
                  </CardTitle>
                  <CardDescription>
                    Centralized view of all scheduling activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Monthly Bookings</span>
                      <Badge variant="outline">{schedulingStats.monthlyBookings}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Active Series</span>
                      <Badge variant="outline">{schedulingStats.recurringSeriesActive}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Synced Calendars</span>
                      <Badge variant="outline">{schedulingStats.syncedCalendars}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Client Satisfaction</span>
                      <Badge className="bg-green-100 text-green-800">
                        {schedulingStats.clientSatisfaction}/5
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Automation Status
                  </CardTitle>
                  <CardDescription>
                    Smart automation and workflow status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-approvals</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email notifications</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Conflict detection</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Smart scheduling</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CloudSync className="h-5 w-5" />
                    Calendar Integration
                  </CardTitle>
                  <CardDescription>
                    External calendar synchronization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Google Calendar</span>
                      <Badge className="bg-green-100 text-green-800">Synced</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Microsoft Outlook</span>
                      <Badge className="bg-green-100 text-green-800">Synced</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Apple Calendar</span>
                      <Badge variant="secondary">Inactive</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last sync</span>
                      <span className="text-xs text-muted-foreground">2 min ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <SchedulingDashboard />
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Automated Booking Workflows</h2>
              <p className="text-muted-foreground">
                Streamline your booking process with intelligent automation rules and workflows
              </p>
            </div>
            <AutomatedBookingWorkflows />
          </TabsContent>

          {/* Calendar Sync Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Enhanced Calendar Sync</h2>
              <p className="text-muted-foreground">
                Bidirectional synchronization with external calendars and conflict management
              </p>
            </div>
            <EnhancedCalendarSync />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibent mb-2">Booking Analytics</h2>
              <p className="text-muted-foreground">
                Comprehensive insights and optimization recommendations for your scheduling
              </p>
            </div>
            <BookingAnalyticsDashboard />
          </TabsContent>

          {/* Recurring Sessions Tab */}
          <TabsContent value="recurring" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Recurring Session Management</h2>
              <p className="text-muted-foreground">
                Manage recurring sessions, templates, and series with advanced automation
              </p>
            </div>
            <RecurringSessionManager />
          </TabsContent>
        </Tabs>

        {/* Feature Highlights for New Users */}
        {isAdmin && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Scheduling Features
              </CardTitle>
              <CardDescription>
                Powerful tools to optimize your scheduling workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <Activity className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-medium mb-2">Smart Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Centralized view of appointments, requests, and analytics
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Zap className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-medium mb-2">Automation Rules</h4>
                  <p className="text-sm text-muted-foreground">
                    Auto-approve, decline, and manage bookings with custom rules
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <CloudSync className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-medium mb-2">Calendar Sync</h4>
                  <p className="text-sm text-muted-foreground">
                    Bidirectional sync with Google, Outlook, and Apple calendars
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <BarChart3 className="h-8 w-8 text-orange-600 mb-3" />
                  <h4 className="font-medium mb-2">Analytics & Insights</h4>
                  <p className="text-sm text-muted-foreground">
                    Performance metrics and optimization recommendations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default SchedulingPage; 