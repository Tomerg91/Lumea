import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Settings, 
  Clock, 
  Users, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Edit, 
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Filter,
  Bell,
  Calendar,
  MessageSquare,
  Bot
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BookingRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  conditions: BookingCondition[];
  actions: BookingAction[];
  priority: number;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

interface BookingCondition {
  type: 'client_type' | 'session_type' | 'time_of_day' | 'day_of_week' | 'advance_notice' | 'client_history';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string;
}

interface BookingAction {
  type: 'auto_approve' | 'auto_decline' | 'send_email' | 'assign_coach' | 'set_priority' | 'add_note';
  parameters: Record<string, any>;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'new_client' | 'returning_client' | 'vip_client' | 'group_session' | 'emergency';
  rules: BookingRule[];
  isDefault: boolean;
}

interface AutomationStats {
  totalRules: number;
  activeRules: number;
  autoApprovals: number;
  autoDeclines: number;
  emailsSent: number;
  timesSaved: number;
}

export const AutomatedBookingWorkflows: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'settings' | 'analytics'>('rules');
  const [bookingRules, setBookingRules] = useState<BookingRule[]>([]);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [automationStats, setAutomationStats] = useState<AutomationStats>({
    totalRules: 0,
    activeRules: 0,
    autoApprovals: 0,
    autoDeclines: 0,
    emailsSent: 0,
    timesSaved: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<BookingRule | null>(null);
  const [isCreateRuleModalOpen, setIsCreateRuleModalOpen] = useState(false);

  // Global automation settings
  const [globalSettings, setGlobalSettings] = useState({
    automationEnabled: true,
    autoApprovalEnabled: true,
    emailNotificationsEnabled: true,
    smartSchedulingEnabled: true,
    conflictResolutionEnabled: true,
    workingHoursOnly: true,
    respectClientTimezone: true,
    bufferTimeMinutes: 15
  });

  useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    try {
      setIsLoading(true);

      // Mock booking rules data
      const mockRules: BookingRule[] = [
        {
          id: '1',
          name: 'VIP Client Auto-Approval',
          description: 'Automatically approve bookings from VIP clients',
          isActive: true,
          conditions: [
            { type: 'client_type', operator: 'equals', value: 'vip' }
          ],
          actions: [
            { type: 'auto_approve', parameters: {} },
            { type: 'send_email', parameters: { template: 'vip_confirmation' } },
            { type: 'set_priority', parameters: { priority: 'high' } }
          ],
          priority: 1,
          createdAt: new Date('2024-01-15'),
          lastTriggered: new Date('2024-01-18'),
          triggerCount: 23
        },
        {
          id: '2',
          name: 'Same-Day Booking Decline',
          description: 'Automatically decline same-day booking requests',
          isActive: true,
          conditions: [
            { type: 'advance_notice', operator: 'less_than', value: '24' }
          ],
          actions: [
            { type: 'auto_decline', parameters: {} },
            { type: 'send_email', parameters: { template: 'insufficient_notice' } }
          ],
          priority: 2,
          createdAt: new Date('2024-01-10'),
          lastTriggered: new Date('2024-01-17'),
          triggerCount: 8
        },
        {
          id: '3',
          name: 'New Client Welcome Flow',
          description: 'Special handling for first-time clients',
          isActive: true,
          conditions: [
            { type: 'client_history', operator: 'equals', value: 'new' }
          ],
          actions: [
            { type: 'send_email', parameters: { template: 'new_client_welcome' } },
            { type: 'add_note', parameters: { note: 'First-time client - provide extra support' } },
            { type: 'set_priority', parameters: { priority: 'medium' } }
          ],
          priority: 3,
          createdAt: new Date('2024-01-12'),
          lastTriggered: new Date('2024-01-16'),
          triggerCount: 15
        }
      ];

      setBookingRules(mockRules);

      // Mock workflow templates
      const mockTemplates: WorkflowTemplate[] = [
        {
          id: '1',
          name: 'Standard Client Workflow',
          description: 'Default workflow for regular clients',
          category: 'returning_client',
          rules: mockRules.slice(0, 2),
          isDefault: true
        },
        {
          id: '2',
          name: 'VIP Client Experience',
          description: 'Premium experience for VIP clients',
          category: 'vip_client',
          rules: [mockRules[0]],
          isDefault: false
        },
        {
          id: '3',
          name: 'New Client Onboarding',
          description: 'Comprehensive onboarding for new clients',
          category: 'new_client',
          rules: [mockRules[2]],
          isDefault: false
        }
      ];

      setWorkflowTemplates(mockTemplates);

      // Mock automation stats
      setAutomationStats({
        totalRules: mockRules.length,
        activeRules: mockRules.filter(rule => rule.isActive).length,
        autoApprovals: 156,
        autoDeclines: 23,
        emailsSent: 342,
        timesSaved: 45 // hours
      });

    } catch (error) {
      console.error('Error loading workflow data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflow data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      setBookingRules(prev => 
        prev.map(rule => 
          rule.id === ruleId 
            ? { ...rule, isActive }
            : rule
        )
      );

      toast({
        title: 'Rule Updated',
        description: `Rule ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rule',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      setBookingRules(prev => prev.filter(rule => rule.id !== ruleId));
      toast({
        title: 'Rule Deleted',
        description: 'Booking rule has been deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateGlobalSettings = async (key: string, value: boolean) => {
    try {
      setGlobalSettings(prev => ({ ...prev, [key]: value }));
      toast({
        title: 'Settings Updated',
        description: 'Global automation settings have been updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      });
    }
  };

  const getConditionDisplay = (condition: BookingCondition) => {
    const typeLabels = {
      client_type: 'Client Type',
      session_type: 'Session Type',
      time_of_day: 'Time of Day',
      day_of_week: 'Day of Week',
      advance_notice: 'Advance Notice',
      client_history: 'Client History'
    };

    const operatorLabels = {
      equals: 'equals',
      not_equals: 'does not equal',
      greater_than: 'greater than',
      less_than: 'less than',
      contains: 'contains'
    };

    return `${typeLabels[condition.type]} ${operatorLabels[condition.operator]} "${condition.value}"`;
  };

  const getActionDisplay = (action: BookingAction) => {
    const actionLabels = {
      auto_approve: 'Auto-approve booking',
      auto_decline: 'Auto-decline booking',
      send_email: 'Send email notification',
      assign_coach: 'Assign specific coach',
      set_priority: 'Set booking priority',
      add_note: 'Add booking note'
    };

    return actionLabels[action.type] || action.type;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      new_client: <Users className="h-4 w-4" />,
      returning_client: <RotateCcw className="h-4 w-4" />,
      vip_client: <CheckCircle className="h-4 w-4" />,
      group_session: <Users className="h-4 w-4" />,
      emergency: <Bell className="h-4 w-4" />
    };

    return icons[category as keyof typeof icons] || <Settings className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair mb-2">Automated Booking Workflows</h1>
          <p className="text-muted-foreground">Streamline your booking process with intelligent automation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm" onClick={() => setIsCreateRuleModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{automationStats.activeRules}</p>
                <p className="text-xs text-muted-foreground">of {automationStats.totalRules} total</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Auto Approvals</p>
                <p className="text-2xl font-bold">{automationStats.autoApprovals}</p>
                <p className="text-xs text-green-600">+12% this month</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{automationStats.emailsSent}</p>
                <p className="text-xs text-blue-600">Automated notifications</p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">{automationStats.timesSaved}h</p>
                <p className="text-xs text-purple-600">This month</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rules">Booking Rules</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Booking Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <div className="grid gap-6">
            {bookingRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        {rule.name}
                        {rule.isActive ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{rule.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      />
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Conditions */}
                    <div>
                      <h4 className="font-medium mb-2">Conditions</h4>
                      <div className="space-y-2">
                        {rule.conditions.map((condition, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span>{getConditionDisplay(condition)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <h4 className="font-medium mb-2">Actions</h4>
                      <div className="space-y-2">
                        {rule.actions.map((action, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Zap className="h-4 w-4 text-yellow-600" />
                            <span>{getActionDisplay(action)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                      <span>Priority: {rule.priority}</span>
                      <span>Triggered: {rule.triggerCount} times</span>
                      {rule.lastTriggered && (
                        <span>Last: {rule.lastTriggered.toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryIcon(template.category)}
                    {template.name}
                    {template.isDefault && (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Category</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {template.category.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Rules Included</p>
                      <p className="text-sm text-muted-foreground">{template.rules.length} rules</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Global Automation Settings</CardTitle>
                <CardDescription>Control overall automation behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Automation</Label>
                    <p className="text-sm text-muted-foreground">Master switch for all automation</p>
                  </div>
                  <Switch
                    checked={globalSettings.automationEnabled}
                    onCheckedChange={(checked) => handleUpdateGlobalSettings('automationEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Approval</Label>
                    <p className="text-sm text-muted-foreground">Allow automatic booking approvals</p>
                  </div>
                  <Switch
                    checked={globalSettings.autoApprovalEnabled}
                    onCheckedChange={(checked) => handleUpdateGlobalSettings('autoApprovalEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send automated email notifications</p>
                  </div>
                  <Switch
                    checked={globalSettings.emailNotificationsEnabled}
                    onCheckedChange={(checked) => handleUpdateGlobalSettings('emailNotificationsEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Smart Scheduling</Label>
                    <p className="text-sm text-muted-foreground">Intelligent time slot suggestions</p>
                  </div>
                  <Switch
                    checked={globalSettings.smartSchedulingEnabled}
                    onCheckedChange={(checked) => handleUpdateGlobalSettings('smartSchedulingEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Fine-tune automation behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Working Hours Only</Label>
                    <p className="text-sm text-muted-foreground">Restrict bookings to business hours</p>
                  </div>
                  <Switch
                    checked={globalSettings.workingHoursOnly}
                    onCheckedChange={(checked) => handleUpdateGlobalSettings('workingHoursOnly', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Respect Client Timezone</Label>
                    <p className="text-sm text-muted-foreground">Consider client timezone for scheduling</p>
                  </div>
                  <Switch
                    checked={globalSettings.respectClientTimezone}
                    onCheckedChange={(checked) => handleUpdateGlobalSettings('respectClientTimezone', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Buffer Time (minutes)</Label>
                  <Input
                    type="number"
                    value={globalSettings.bufferTimeMinutes}
                    onChange={(e) => setGlobalSettings(prev => ({ 
                      ...prev, 
                      bufferTimeMinutes: parseInt(e.target.value) || 15 
                    }))}
                    min="0"
                    max="60"
                  />
                  <p className="text-sm text-muted-foreground">
                    Time buffer between consecutive bookings
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Automation Performance</CardTitle>
                <CardDescription>Key metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Auto-Approval Rate</span>
                    <span className="font-medium text-green-600">87%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Rule Efficiency</span>
                    <span className="font-medium text-blue-600">94%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Response Time</span>
                    <span className="font-medium text-purple-600">&lt; 1 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Client Satisfaction</span>
                    <span className="font-medium text-orange-600">4.8/5</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Active Rules</CardTitle>
                <CardDescription>Rules with highest trigger frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bookingRules
                    .sort((a, b) => b.triggerCount - a.triggerCount)
                    .slice(0, 5)
                    .map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Last triggered: {rule.lastTriggered?.toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">{rule.triggerCount}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 