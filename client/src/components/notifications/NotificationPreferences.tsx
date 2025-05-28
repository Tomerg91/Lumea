import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import notificationService from '@/services/notificationService';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Moon,
  Globe,
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Volume2,
  VolumeX,
  Calendar,
  Users,
  FileText,
  Zap
} from 'lucide-react';

// Define the interface locally to avoid import conflicts
interface NotificationPreferences {
  _id?: string;
  userId: string;
  channels: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
    push: boolean;
  };
  notificationTypes: {
    sessionReminders: boolean;
    sessionConfirmations: boolean;
    sessionCancellations: boolean;
    sessionRescheduling: boolean;
    cancellationRequests: boolean;
    rescheduleRequests: boolean;
  };
  reminderTiming: {
    hoursBefore: number;
    enableMultipleReminders: boolean;
    additionalReminderHours: number[];
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  emailPreferences: {
    digestEnabled: boolean;
    digestFrequency: 'daily' | 'weekly' | 'disabled';
    digestTime: string;
    htmlFormat: boolean;
  };
  language: string;
  timezone: string;
  advanced: {
    groupSimilarNotifications: boolean;
    maxNotificationsPerHour: number;
    enableReadReceipts: boolean;
  };
}

interface NotificationPreferencesProps {
  className?: string;
}

const defaultPreferences: NotificationPreferences = {
  userId: '',
  channels: {
    email: true,
    inApp: true,
    sms: false,
    push: true,
  },
  notificationTypes: {
    sessionReminders: true,
    sessionConfirmations: true,
    sessionCancellations: true,
    sessionRescheduling: true,
    cancellationRequests: true,
    rescheduleRequests: true,
  },
  reminderTiming: {
    hoursBefore: 24,
    enableMultipleReminders: false,
    additionalReminderHours: [],
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  emailPreferences: {
    digestEnabled: false,
    digestFrequency: 'disabled',
    digestTime: '09:00',
    htmlFormat: true,
  },
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  advanced: {
    groupSimilarNotifications: true,
    maxNotificationsPerHour: 10,
    enableReadReceipts: true,
  },
};

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ className }) => {
  const { session } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);

  // Load preferences on component mount
  useEffect(() => {
    if (session?.user?.id) {
      loadPreferences();
    }
  }, [session]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationService.getPreferences();
      setPreferences({ ...defaultPreferences, ...response.data, userId: session?.user?.id || '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
      setPreferences({ ...defaultPreferences, userId: session?.user?.id || '' });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      await notificationService.updatePreferences(preferences);
      setHasChanges(false);
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated successfully.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
      toast({
        title: 'Save Failed',
        description: 'Failed to save your notification preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async () => {
    try {
      setTestingNotification(true);
      // Create a test notification request
      const testRequest = {
        recipientId: session?.user?.id || '',
        type: 'session_reminder' as const,
        channels: ['email', 'in_app'] as ('email' | 'in_app')[],
        variables: {
          recipientName: (session?.user as any)?.name || 'User',
          sessionDate: new Date().toLocaleDateString(),
          coachName: 'Test Coach',
          duration: '60',
        },
      };
      
      // Send test notification
      await notificationService.sendTestNotification(testRequest);
      
      toast({
        title: 'Test Notification Sent',
        description: 'Check your enabled notification channels for the test message.',
      });
    } catch (err) {
      toast({
        title: 'Test Failed',
        description: 'Failed to send test notification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTestingNotification(false);
    }
  };

  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateNestedPreferences = <T extends keyof NotificationPreferences>(
    section: T,
    updates: Partial<NotificationPreferences[T]>
  ) => {
    const currentSection = preferences[section];
    if (typeof currentSection === 'object' && currentSection !== null) {
      setPreferences(prev => ({
        ...prev,
        [section]: { ...currentSection, ...updates }
      }));
      setHasChanges(true);
    }
  };

  const addReminderHour = (hour: number) => {
    if (!preferences.reminderTiming.additionalReminderHours.includes(hour)) {
      updateNestedPreferences('reminderTiming', {
        additionalReminderHours: [...preferences.reminderTiming.additionalReminderHours, hour].sort((a, b) => b - a)
      });
    }
  };

  const removeReminderHour = (hour: number) => {
    updateNestedPreferences('reminderTiming', {
      additionalReminderHours: preferences.reminderTiming.additionalReminderHours.filter(h => h !== hour)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading notification preferences...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-gray-600">Customize how and when you receive notifications</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={testNotification}
            disabled={testingNotification}
            className="flex items-center space-x-2"
          >
            {testingNotification ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>Test Notifications</span>
          </Button>
          <Button
            onClick={savePreferences}
            disabled={!hasChanges || saving}
            className="flex items-center space-x-2"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasChanges && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save your preferences.
          </AlertDescription>
        </Alert>
      )}

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notification Channels</span>
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-500" />
                <div>
                  <Label className="font-medium">Email</Label>
                  <p className="text-sm text-gray-600">Receive notifications via email</p>
                </div>
              </div>
              <Switch
                checked={preferences.channels.email}
                onCheckedChange={(checked) => 
                  updateNestedPreferences('channels', { email: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-green-500" />
                <div>
                  <Label className="font-medium">In-App</Label>
                  <p className="text-sm text-gray-600">Show notifications in the app</p>
                </div>
              </div>
              <Switch
                checked={preferences.channels.inApp}
                onCheckedChange={(checked) => 
                  updateNestedPreferences('channels', { inApp: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                <div>
                  <Label className="font-medium">SMS</Label>
                  <p className="text-sm text-gray-600">Receive text messages</p>
                </div>
              </div>
              <Switch
                checked={preferences.channels.sms}
                onCheckedChange={(checked) => 
                  updateNestedPreferences('channels', { sms: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-purple-500" />
                <div>
                  <Label className="font-medium">Push Notifications</Label>
                  <p className="text-sm text-gray-600">Browser push notifications</p>
                </div>
              </div>
              <Switch
                checked={preferences.channels.push}
                onCheckedChange={(checked) => 
                  updateNestedPreferences('channels', { push: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Notification Types</span>
          </CardTitle>
          <CardDescription>
            Select which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(preferences.notificationTypes).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <Label className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <p className="text-sm text-gray-600">
                      {getNotificationTypeDescription(key)}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) => 
                    updateNestedPreferences('notificationTypes', { [key]: checked })
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reminder Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Reminder Timing</span>
          </CardTitle>
          <CardDescription>
            Configure when to receive session reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hours-before">Primary Reminder (hours before session)</Label>
              <Select
                value={preferences.reminderTiming.hoursBefore.toString()}
                onValueChange={(value) => 
                  updateNestedPreferences('reminderTiming', { hoursBefore: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="24">24 hours (1 day)</SelectItem>
                  <SelectItem value="48">48 hours (2 days)</SelectItem>
                  <SelectItem value="168">168 hours (1 week)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={preferences.reminderTiming.enableMultipleReminders}
                onCheckedChange={(checked) => 
                  updateNestedPreferences('reminderTiming', { enableMultipleReminders: checked })
                }
              />
              <Label>Enable multiple reminders</Label>
            </div>
          </div>

          {preferences.reminderTiming.enableMultipleReminders && (
            <div>
              <Label>Additional Reminder Times</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {preferences.reminderTiming.additionalReminderHours.map((hour) => (
                  <Badge
                    key={hour}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeReminderHour(hour)}
                  >
                    {hour} hours ×
                  </Badge>
                ))}
                <Select onValueChange={(value) => addReminderHour(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 4, 8, 12, 24, 48, 72].filter(
                      h => !preferences.reminderTiming.additionalReminderHours.includes(h) && 
                           h !== preferences.reminderTiming.hoursBefore
                    ).map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour} hours
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Moon className="w-5 h-5" />
            <span>Quiet Hours</span>
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={preferences.quietHours.enabled}
              onCheckedChange={(checked) => 
                updateNestedPreferences('quietHours', { enabled: checked })
              }
            />
            <Label>Enable quiet hours</Label>
          </div>

          {preferences.quietHours.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={preferences.quietHours.startTime}
                  onChange={(e) => 
                    updateNestedPreferences('quietHours', { startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={preferences.quietHours.endTime}
                  onChange={(e) => 
                    updateNestedPreferences('quietHours', { endTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={preferences.quietHours.timezone}
                  onValueChange={(value) => 
                    updateNestedPreferences('quietHours', { timezone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Intl.supportedValuesOf('timeZone').slice(0, 20).map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preferences */}
      {preferences.channels.email && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="w-5 h-5" />
              <span>Email Preferences</span>
            </CardTitle>
            <CardDescription>
              Customize your email notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={preferences.emailPreferences.digestEnabled}
                onCheckedChange={(checked) => 
                  updateNestedPreferences('emailPreferences', { digestEnabled: checked })
                }
              />
              <Label>Enable email digest (group notifications)</Label>
            </div>

            {preferences.emailPreferences.digestEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Digest Frequency</Label>
                  <Select
                    value={preferences.emailPreferences.digestFrequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'disabled') => 
                      updateNestedPreferences('emailPreferences', { digestFrequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Digest Time</Label>
                  <Input
                    type="time"
                    value={preferences.emailPreferences.digestTime}
                    onChange={(e) => 
                      updateNestedPreferences('emailPreferences', { digestTime: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={preferences.emailPreferences.htmlFormat}
                onCheckedChange={(checked) => 
                  updateNestedPreferences('emailPreferences', { htmlFormat: checked })
                }
              />
              <Label>Receive HTML formatted emails</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Advanced Settings</span>
          </CardTitle>
          <CardDescription>
            Fine-tune your notification experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Group Similar Notifications</Label>
                <p className="text-sm text-gray-600">Combine similar notifications together</p>
              </div>
              <Switch
                checked={preferences.advanced.groupSimilarNotifications}
                onCheckedChange={(checked) => 
                  updateNestedPreferences('advanced', { groupSimilarNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Enable Read Receipts</Label>
                <p className="text-sm text-gray-600">Track when notifications are read</p>
              </div>
              <Switch
                checked={preferences.advanced.enableReadReceipts}
                onCheckedChange={(checked) => 
                  updateNestedPreferences('advanced', { enableReadReceipts: checked })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="max-notifications">Maximum notifications per hour</Label>
            <Select
              value={preferences.advanced.maxNotificationsPerHour.toString()}
              onValueChange={(value) => 
                updateNestedPreferences('advanced', { maxNotificationsPerHour: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 notifications</SelectItem>
                <SelectItem value="10">10 notifications</SelectItem>
                <SelectItem value="20">20 notifications</SelectItem>
                <SelectItem value="50">50 notifications</SelectItem>
                <SelectItem value="100">Unlimited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to get notification type descriptions
const getNotificationTypeDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    sessionReminders: 'Reminders before your scheduled sessions',
    sessionConfirmations: 'Confirmations when sessions are booked',
    sessionCancellations: 'Notifications when sessions are cancelled',
    sessionRescheduling: 'Notifications when sessions are rescheduled',
    cancellationRequests: 'Requests to cancel sessions',
    rescheduleRequests: 'Requests to reschedule sessions',
  };
  return descriptions[type] || 'Notification type';
};

export default NotificationPreferences; 