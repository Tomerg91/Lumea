import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Plus, 
  Trash2,
  Eye,
  EyeOff,
  Zap,
  CloudSync,
  Wifi,
  WifiOff,
  Activity,
  BarChart3,
  Filter,
  Download,
  Upload
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface CalendarConnection {
  id: string;
  provider: 'google' | 'microsoft' | 'apple' | 'outlook';
  calendarName: string;
  email: string;
  isActive: boolean;
  syncEnabled: boolean;
  bidirectionalSync: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'error' | 'partial' | 'pending';
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  conflictResolution: 'coach_priority' | 'external_priority' | 'manual_review';
  eventPrefix: string;
  color: string;
  syncStats: {
    totalEvents: number;
    syncedEvents: number;
    conflicts: number;
    errors: number;
  };
}

interface SyncConflict {
  id: string;
  type: 'time_overlap' | 'duplicate_event' | 'cancelled_event' | 'updated_event';
  severity: 'low' | 'medium' | 'high';
  calendarId: string;
  coachingSessionId?: string;
  externalEventId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description: string;
  resolution: 'pending' | 'resolved' | 'ignored';
  suggestedAction: string;
  createdAt: Date;
}

interface SyncActivity {
  id: string;
  type: 'sync_started' | 'sync_completed' | 'conflict_detected' | 'event_created' | 'event_updated' | 'event_deleted';
  calendarId: string;
  calendarName: string;
  timestamp: Date;
  status: 'success' | 'error' | 'warning';
  message: string;
  eventCount?: number;
  conflictCount?: number;
}

interface SyncSettings {
  autoResolveConflicts: boolean;
  syncPastEvents: boolean;
  syncFutureMonths: number;
  includePrivateEvents: boolean;
  syncEventDetails: boolean;
  createMeetingLinks: boolean;
  notifyOnConflicts: boolean;
  batchSyncSize: number;
  retryFailedSyncs: boolean;
  maxRetryAttempts: number;
}

export const EnhancedCalendarSync: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'connections' | 'conflicts' | 'activity' | 'settings'>('connections');
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  const [syncActivity, setSyncActivity] = useState<SyncActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);

  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    autoResolveConflicts: false,
    syncPastEvents: false,
    syncFutureMonths: 3,
    includePrivateEvents: false,
    syncEventDetails: true,
    createMeetingLinks: true,
    notifyOnConflicts: true,
    batchSyncSize: 50,
    retryFailedSyncs: true,
    maxRetryAttempts: 3
  });

  useEffect(() => {
    loadSyncData();
  }, []);

  const loadSyncData = async () => {
    try {
      setIsLoading(true);

      // Mock calendar connections
      const mockConnections: CalendarConnection[] = [
        {
          id: '1',
          provider: 'google',
          calendarName: 'Personal Calendar',
          email: 'coach@example.com',
          isActive: true,
          syncEnabled: true,
          bidirectionalSync: true,
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
          syncFrequency: 'hourly',
          conflictResolution: 'coach_priority',
          eventPrefix: '[Coaching]',
          color: '#4285F4',
          syncStats: {
            totalEvents: 156,
            syncedEvents: 154,
            conflicts: 2,
            errors: 0
          }
        },
        {
          id: '2',
          provider: 'microsoft',
          calendarName: 'Work Calendar',
          email: 'coach@company.com',
          isActive: true,
          syncEnabled: true,
          bidirectionalSync: false,
          lastSyncAt: subDays(new Date(), 1),
          lastSyncStatus: 'partial',
          syncFrequency: 'daily',
          conflictResolution: 'external_priority',
          eventPrefix: '[Session]',
          color: '#0078D4',
          syncStats: {
            totalEvents: 89,
            syncedEvents: 87,
            conflicts: 1,
            errors: 1
          }
        },
        {
          id: '3',
          provider: 'apple',
          calendarName: 'iCloud Calendar',
          email: 'personal@icloud.com',
          isActive: false,
          syncEnabled: false,
          bidirectionalSync: false,
          lastSyncAt: null,
          lastSyncStatus: 'error',
          syncFrequency: 'manual',
          conflictResolution: 'manual_review',
          eventPrefix: '[Coach]',
          color: '#007AFF',
          syncStats: {
            totalEvents: 0,
            syncedEvents: 0,
            conflicts: 0,
            errors: 3
          }
        }
      ];

      setCalendarConnections(mockConnections);

      // Mock sync conflicts
      const mockConflicts: SyncConflict[] = [
        {
          id: '1',
          type: 'time_overlap',
          severity: 'high',
          calendarId: '1',
          coachingSessionId: 'session_123',
          externalEventId: 'ext_456',
          title: 'Team Meeting vs Coaching Session',
          startTime: addDays(new Date(), 2),
          endTime: addDays(new Date(), 2),
          description: 'Coaching session overlaps with team meeting',
          resolution: 'pending',
          suggestedAction: 'Reschedule coaching session',
          createdAt: new Date()
        },
        {
          id: '2',
          type: 'duplicate_event',
          severity: 'medium',
          calendarId: '2',
          externalEventId: 'ext_789',
          title: 'Duplicate Session Entry',
          startTime: addDays(new Date(), 5),
          endTime: addDays(new Date(), 5),
          description: 'Same coaching session appears in both calendars',
          resolution: 'pending',
          suggestedAction: 'Remove duplicate from external calendar',
          createdAt: subDays(new Date(), 1)
        }
      ];

      setSyncConflicts(mockConflicts);

      // Mock sync activity
      const mockActivity: SyncActivity[] = [
        {
          id: '1',
          type: 'sync_completed',
          calendarId: '1',
          calendarName: 'Personal Calendar',
          timestamp: new Date(),
          status: 'success',
          message: 'Successfully synced 12 events',
          eventCount: 12
        },
        {
          id: '2',
          type: 'conflict_detected',
          calendarId: '1',
          calendarName: 'Personal Calendar',
          timestamp: subDays(new Date(), 0.5),
          status: 'warning',
          message: 'Time overlap detected for upcoming session',
          conflictCount: 1
        },
        {
          id: '3',
          type: 'sync_completed',
          calendarId: '2',
          calendarName: 'Work Calendar',
          timestamp: subDays(new Date(), 1),
          status: 'success',
          message: 'Successfully synced 8 events',
          eventCount: 8
        }
      ];

      setSyncActivity(mockActivity);

    } catch (error) {
      console.error('Error loading sync data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar sync data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSync = async (connectionId: string, syncEnabled: boolean) => {
    try {
      setCalendarConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, syncEnabled }
            : conn
        )
      );

      toast({
        title: 'Sync Updated',
        description: `Calendar sync ${syncEnabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update sync settings',
        variant: 'destructive'
      });
    }
  };

  const handleManualSync = async (connectionId: string) => {
    try {
      setIsSyncing(connectionId);
      setSyncProgress(0);

      // Simulate sync progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setIsSyncing(null);
            setSyncProgress(0);
            
            // Update last sync time
            setCalendarConnections(prev => 
              prev.map(conn => 
                conn.id === connectionId 
                  ? { 
                      ...conn, 
                      lastSyncAt: new Date(),
                      lastSyncStatus: 'success'
                    }
                  : conn
              )
            );

            toast({
              title: 'Sync Complete',
              description: 'Calendar has been synchronized successfully',
            });

            return 0;
          }
          return prev + 10;
        });
      }, 200);

    } catch (error) {
      setIsSyncing(null);
      setSyncProgress(0);
      toast({
        title: 'Sync Failed',
        description: 'Failed to synchronize calendar',
        variant: 'destructive'
      });
    }
  };

  const handleResolveConflict = async (conflictId: string, action: 'accept' | 'reject' | 'reschedule') => {
    try {
      setSyncConflicts(prev => 
        prev.map(conflict => 
          conflict.id === conflictId 
            ? { ...conflict, resolution: 'resolved' }
            : conflict
        )
      );

      toast({
        title: 'Conflict Resolved',
        description: `Conflict has been ${action}ed successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resolve conflict',
        variant: 'destructive'
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons = {
      google: '📅',
      microsoft: '📆',
      apple: '🍎',
      outlook: '📧'
    };
    return icons[provider as keyof typeof icons] || '📅';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={variants[severity as keyof typeof variants]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalSyncedEvents = calendarConnections.reduce((sum, conn) => sum + conn.syncStats.syncedEvents, 0);
  const totalConflicts = calendarConnections.reduce((sum, conn) => sum + conn.syncStats.conflicts, 0);
  const activeConnections = calendarConnections.filter(conn => conn.isActive && conn.syncEnabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair mb-2">Enhanced Calendar Sync</h1>
          <p className="text-muted-foreground">Bidirectional synchronization with external calendars</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Calendar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Connections</p>
                <p className="text-2xl font-bold">{activeConnections}</p>
                <p className="text-xs text-muted-foreground">of {calendarConnections.length} total</p>
              </div>
              <CloudSync className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Synced Events</p>
                <p className="text-2xl font-bold">{totalSyncedEvents}</p>
                <p className="text-xs text-green-600">Last hour: +12</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conflicts</p>
                <p className="text-2xl font-bold">{totalConflicts}</p>
                <p className="text-xs text-red-600">{syncConflicts.filter(c => c.resolution === 'pending').length} pending</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-6">
          <div className="grid gap-6">
            {calendarConnections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderIcon(connection.provider)}</span>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {connection.calendarName}
                          {connection.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {connection.email} • {connection.provider.charAt(0).toUpperCase() + connection.provider.slice(1)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection.lastSyncStatus)}
                      <Switch
                        checked={connection.syncEnabled}
                        onCheckedChange={(checked) => handleToggleSync(connection.id, checked)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sync Progress */}
                    {isSyncing === connection.id && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Syncing...</span>
                          <span>{syncProgress}%</span>
                        </div>
                        <Progress value={syncProgress} className="h-2" />
                      </div>
                    )}

                    {/* Sync Settings */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Sync Frequency</p>
                        <p className="text-muted-foreground capitalize">{connection.syncFrequency}</p>
                      </div>
                      <div>
                        <p className="font-medium">Direction</p>
                        <p className="text-muted-foreground">
                          {connection.bidirectionalSync ? 'Bidirectional' : 'One-way'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Last Sync</p>
                        <p className="text-muted-foreground">
                          {connection.lastSyncAt ? format(connection.lastSyncAt, 'MMM d, h:mm a') : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Conflicts</p>
                        <p className="text-muted-foreground">
                          {connection.syncStats.conflicts} issues
                        </p>
                      </div>
                    </div>

                    {/* Sync Stats */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-4 text-sm">
                        <span>Events: {connection.syncStats.syncedEvents}/{connection.syncStats.totalEvents}</span>
                        <span>Errors: {connection.syncStats.errors}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleManualSync(connection.id)}
                          disabled={isSyncing === connection.id}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing === connection.id ? 'animate-spin' : ''}`} />
                          Sync Now
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-6">
          <div className="grid gap-6">
            {syncConflicts.map((conflict) => (
              <Card key={conflict.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        {conflict.title}
                        {getSeverityBadge(conflict.severity)}
                      </CardTitle>
                      <CardDescription>{conflict.description}</CardDescription>
                    </div>
                    <Badge variant={conflict.resolution === 'pending' ? 'destructive' : 'secondary'}>
                      {conflict.resolution}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Type</p>
                        <p className="text-muted-foreground capitalize">
                          {conflict.type.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Time</p>
                        <p className="text-muted-foreground">
                          {format(conflict.startTime, 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Detected</p>
                        <p className="text-muted-foreground">
                          {format(conflict.createdAt, 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Suggested Action:</strong> {conflict.suggestedAction}
                      </AlertDescription>
                    </Alert>

                    {conflict.resolution === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm"
                          onClick={() => handleResolveConflict(conflict.id, 'accept')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleResolveConflict(conflict.id, 'reschedule')}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Reschedule
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleResolveConflict(conflict.id, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {syncConflicts.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-medium mb-2">No Conflicts</h3>
                  <p className="text-muted-foreground">All calendars are synchronized without conflicts</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Activity</CardTitle>
              <CardDescription>Latest synchronization events and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      {getStatusIcon(activity.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{activity.calendarName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(activity.timestamp, 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.message}</p>
                      {(activity.eventCount || activity.conflictCount) && (
                        <div className="flex gap-4 mt-2 text-xs">
                          {activity.eventCount && (
                            <span className="text-blue-600">Events: {activity.eventCount}</span>
                          )}
                          {activity.conflictCount && (
                            <span className="text-red-600">Conflicts: {activity.conflictCount}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync Preferences</CardTitle>
                <CardDescription>Configure how calendars are synchronized</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-resolve conflicts</Label>
                    <p className="text-sm text-muted-foreground">Automatically handle minor conflicts</p>
                  </div>
                  <Switch
                    checked={syncSettings.autoResolveConflicts}
                    onCheckedChange={(checked) => 
                      setSyncSettings(prev => ({ ...prev, autoResolveConflicts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sync past events</Label>
                    <p className="text-sm text-muted-foreground">Include historical events in sync</p>
                  </div>
                  <Switch
                    checked={syncSettings.syncPastEvents}
                    onCheckedChange={(checked) => 
                      setSyncSettings(prev => ({ ...prev, syncPastEvents: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Include private events</Label>
                    <p className="text-sm text-muted-foreground">Sync private calendar entries</p>
                  </div>
                  <Switch
                    checked={syncSettings.includePrivateEvents}
                    onCheckedChange={(checked) => 
                      setSyncSettings(prev => ({ ...prev, includePrivateEvents: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Future sync months</Label>
                  <Input
                    type="number"
                    value={syncSettings.syncFutureMonths}
                    onChange={(e) => setSyncSettings(prev => ({ 
                      ...prev, 
                      syncFutureMonths: parseInt(e.target.value) || 3 
                    }))}
                    min="1"
                    max="12"
                  />
                  <p className="text-sm text-muted-foreground">
                    How many months ahead to synchronize
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Fine-tune synchronization behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Create meeting links</Label>
                    <p className="text-sm text-muted-foreground">Auto-generate video call links</p>
                  </div>
                  <Switch
                    checked={syncSettings.createMeetingLinks}
                    onCheckedChange={(checked) => 
                      setSyncSettings(prev => ({ ...prev, createMeetingLinks: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Conflict notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified about sync conflicts</p>
                  </div>
                  <Switch
                    checked={syncSettings.notifyOnConflicts}
                    onCheckedChange={(checked) => 
                      setSyncSettings(prev => ({ ...prev, notifyOnConflicts: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Batch sync size</Label>
                  <Input
                    type="number"
                    value={syncSettings.batchSyncSize}
                    onChange={(e) => setSyncSettings(prev => ({ 
                      ...prev, 
                      batchSyncSize: parseInt(e.target.value) || 50 
                    }))}
                    min="10"
                    max="100"
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of events to sync at once
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max retry attempts</Label>
                  <Input
                    type="number"
                    value={syncSettings.maxRetryAttempts}
                    onChange={(e) => setSyncSettings(prev => ({ 
                      ...prev, 
                      maxRetryAttempts: parseInt(e.target.value) || 3 
                    }))}
                    min="1"
                    max="10"
                  />
                  <p className="text-sm text-muted-foreground">
                    Retry failed sync operations
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 