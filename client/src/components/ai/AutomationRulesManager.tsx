import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import aiService from '../../services/aiService';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Bot, 
  Plus, 
  Settings, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  MessageSquare,
  Zap,
  BookOpen
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  type: 'reminder' | 'resource_suggestion' | 'milestone_detection' | 'follow_up';
  conditions: {
    trigger: string;
    frequency?: string;
    clientCriteria?: string[];
    timeBased?: {
      days: number;
      time: string;
    };
  };
  actions: {
    type: string;
    message?: string;
    resourceIds?: string[];
    notificationSettings?: {
      email: boolean;
      inApp: boolean;
      sms: boolean;
    };
  };
  isActive: boolean;
  lastExecuted?: Date;
  executionCount: number;
  createdAt: Date;
}

const ruleTypes = [
  {
    value: 'reminder',
    label: 'Smart Reminders',
    description: 'Automated reminders for sessions, follow-ups, and action items',
    icon: Clock
  },
  {
    value: 'resource_suggestion',
    label: 'Resource Suggestions',
    description: 'AI-powered resource recommendations based on client progress',
    icon: BookOpen
  },
  {
    value: 'milestone_detection',
    label: 'Milestone Detection',
    description: 'Automatically detect and celebrate client achievements',
    icon: Target
  },
  {
    value: 'follow_up',
    label: 'Follow-up Automation',
    description: 'Smart follow-up messages and check-ins',
    icon: MessageSquare
  }
];

const triggerConditions = {
  reminder: [
    'Before session (24 hours)',
    'After session (no reflection)',
    'Weekly progress check',
    'Monthly goal review'
  ],
  resource_suggestion: [
    'After milestone completion',
    'When client expresses challenge',
    'Based on reflection sentiment',
    'Progress plateau detected'
  ],
  milestone_detection: [
    'Goal completion patterns',
    'Positive sentiment streak',
    'Consistency achievements',
    'Breakthrough moments'
  ],
  follow_up: [
    'Missed session follow-up',
    'Action item check-in',
    'Post-session feedback request',
    'Progress update request'
  ]
};

export const AutomationRulesManager: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [newRule, setNewRule] = useState({
    name: '',
    type: '' as AutomationRule['type'],
    trigger: '',
    frequency: 'once',
    message: '',
    emailNotifications: true,
    inAppNotifications: true,
    smsNotifications: false
  });

  useEffect(() => {
    if (profile?.id) {
      checkConsentAndLoadData();
    }
  }, [profile?.id]);

  const checkConsentAndLoadData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const consent = await aiService.checkConsent(profile.id as string, 'automation');
      setHasConsent(consent);

      if (consent) {
        await loadAutomationRules();
      }
    } catch (error) {
      console.error('Failed to check consent or load data:', error);
      toast({
        title: 'Error Loading Automation',
        description: 'Failed to load automation rules.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAutomationRules = async () => {
    // Load existing automation rules from database
    // For now, we'll create mock data
    const mockRules: AutomationRule[] = [
      {
        id: '1',
        name: 'Session Reminder',
        type: 'reminder',
        conditions: {
          trigger: 'Before session (24 hours)',
          timeBased: { days: 1, time: '09:00' }
        },
        actions: {
          type: 'notification',
          message: 'Hi {clientName}, this is a friendly reminder about your coaching session tomorrow at {sessionTime}.',
          notificationSettings: { email: true, inApp: true, sms: false }
        },
        isActive: true,
        executionCount: 47,
        lastExecuted: new Date(Date.now() - 1000 * 60 * 60 * 2),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
      },
      {
        id: '2',
        name: 'Milestone Celebration',
        type: 'milestone_detection',
        conditions: {
          trigger: 'Goal completion patterns'
        },
        actions: {
          type: 'celebration',
          message: 'Congratulations {clientName}! I noticed you\'ve achieved a significant milestone. Let\'s discuss this in our next session.',
          notificationSettings: { email: true, inApp: true, sms: false }
        },
        isActive: true,
        executionCount: 12,
        lastExecuted: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20)
      }
    ];

    setRules(mockRules);
  };

  const createAutomationRule = async () => {
    if (!profile?.id || !newRule.name || !newRule.type || !newRule.trigger) {
      toast({
        title: 'Incomplete Form',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);

      const ruleData: Omit<AutomationRule, 'id' | 'createdAt' | 'executionCount' | 'lastExecuted'> = {
        name: newRule.name,
        type: newRule.type,
        conditions: {
          trigger: newRule.trigger,
          frequency: newRule.frequency
        },
        actions: {
          type: 'notification',
          message: newRule.message,
          notificationSettings: {
            email: newRule.emailNotifications,
            inApp: newRule.inAppNotifications,
            sms: newRule.smsNotifications
          }
        },
        isActive: true
      };

      // In a real implementation, this would call the API
      const createdRule: AutomationRule = {
        ...ruleData,
        id: Date.now().toString(),
        executionCount: 0,
        createdAt: new Date()
      };

      setRules(prev => [createdRule, ...prev]);
      setShowCreateForm(false);
      
      // Reset form
      setNewRule({
        name: '',
        type: '' as AutomationRule['type'],
        trigger: '',
        frequency: 'once',
        message: '',
        emailNotifications: true,
        inAppNotifications: true,
        smsNotifications: false
      });

      toast({
        title: 'Automation Rule Created',
        description: 'Your automation rule has been created and activated.',
      });
    } catch (error) {
      console.error('Failed to create automation rule:', error);
      toast({
        title: 'Creation Failed',
        description: 'Failed to create automation rule. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive } : rule
    ));

    toast({
      title: isActive ? 'Rule Activated' : 'Rule Deactivated',
      description: `Automation rule has been ${isActive ? 'activated' : 'deactivated'}.`,
    });
  };

  const deleteRule = async (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
    
    toast({
      title: 'Rule Deleted',
      description: 'Automation rule has been deleted.',
    });
  };

  const enableConsentAndRetry = async () => {
    if (!profile?.id) return;

    try {
      await aiService.updateConsent(profile.id as string, 'automation', true);
      setHasConsent(true);
      await loadAutomationRules();
      
      toast({
        title: 'Automation Enabled',
        description: 'AI automation has been enabled for your coaching practice.',
      });
    } catch (error) {
      console.error('Failed to enable consent:', error);
      toast({
        title: 'Failed to Enable',
        description: 'Failed to enable automation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getRuleTypeIcon = (type: string) => {
    const ruleType = ruleTypes.find(rt => rt.value === type);
    if (!ruleType) return <Bot className="w-4 h-4" />;
    
    const IconComponent = ruleType.icon;
    return <IconComponent className="w-4 h-4" />;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Automation Rules
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
            <Bot className="w-5 h-5" />
            Automation Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI-powered automation is not enabled. Enable this feature to set up smart workflows 
              that help streamline your coaching practice with automated reminders, resource suggestions, and more.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col gap-3">
            <h4 className="font-medium">What you can automate:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ruleTypes.map((ruleType) => {
                const IconComponent = ruleType.icon;
                return (
                  <div key={ruleType.value} className="flex items-start gap-3 p-3 border rounded-lg">
                    <IconComponent className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-sm">{ruleType.label}</h5>
                      <p className="text-xs text-gray-600">{ruleType.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Button onClick={enableConsentAndRetry} className="w-fit">
              <Zap className="w-4 h-4 mr-2" />
              Enable Automation
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6" />
            Automation Rules
          </h2>
          <p className="text-gray-600">Set up intelligent automation to streamline your coaching practice</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rules</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rules</p>
                <p className="text-2xl font-bold text-green-600">{rules.filter(r => r.isActive).length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Executions</p>
                <p className="text-2xl font-bold">{rules.reduce((sum, r) => sum + r.executionCount, 0)}</p>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Used</p>
                <p className="text-xl font-bold truncate">
                  {rules.length > 0 ? 
                    rules.reduce((prev, curr) => prev.executionCount > curr.executionCount ? prev : curr).name 
                    : 'None'
                  }
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Automation Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  placeholder="e.g., Session Reminder"
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-type">Rule Type</Label>
                <Select value={newRule.type} onValueChange={(value) => setNewRule(prev => ({ ...prev, type: value as AutomationRule['type'], trigger: '' }))}>
                  <SelectTrigger id="rule-type">
                    <SelectValue placeholder="Select automation type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleTypes.map((ruleType) => (
                      <SelectItem key={ruleType.value} value={ruleType.value}>
                        {ruleType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newRule.type && (
              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger Condition</Label>
                <Select value={newRule.trigger} onValueChange={(value) => setNewRule(prev => ({ ...prev, trigger: value }))}>
                  <SelectTrigger id="trigger">
                    <SelectValue placeholder="Select trigger condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerConditions[newRule.type]?.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Automation Message</Label>
              <Input
                id="message"
                placeholder="Enter the message to send (use {clientName}, {sessionTime} for dynamic content)"
                value={newRule.message}
                onChange={(e) => setNewRule(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>

            <div className="space-y-3">
              <Label>Notification Settings</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="email-notifications"
                    checked={newRule.emailNotifications}
                    onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                  <Label htmlFor="email-notifications">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="app-notifications"
                    checked={newRule.inAppNotifications}
                    onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, inAppNotifications: checked }))}
                  />
                  <Label htmlFor="app-notifications">In-App</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sms-notifications"
                    checked={newRule.smsNotifications}
                    onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, smsNotifications: checked }))}
                  />
                  <Label htmlFor="sms-notifications">SMS</Label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={createAutomationRule} disabled={creating}>
                {creating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Rule
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Automation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No automation rules yet. Create your first rule to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getRuleTypeIcon(rule.type)}
                        <h3 className="font-medium">{rule.name}</h3>
                        <Badge className={getStatusColor(rule.isActive)}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Trigger:</strong> {rule.conditions.trigger}
                      </p>
                      
                      {rule.actions.message && (
                        <p className="text-sm bg-gray-50 p-2 rounded mb-2">
                          {rule.actions.message}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Executed {rule.executionCount} times</span>
                        {rule.lastExecuted && (
                          <span>Last: {rule.lastExecuted.toLocaleDateString()}</span>
                        )}
                        <span>Created: {rule.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) => toggleRuleStatus(rule.id, checked)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 