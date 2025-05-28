import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar, 
  Plus, 
  Settings, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface CalendarIntegration {
  id: string;
  provider: 'google' | 'microsoft' | 'apple';
  calendarName: string;
  isActive: boolean;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CalendarProvider {
  id: 'google' | 'microsoft' | 'apple';
  name: string;
  description: string;
  icon: string;
  color: string;
  isAvailable: boolean;
}

const CALENDAR_PROVIDERS: CalendarProvider[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Sync with your Google Calendar account',
    icon: '📅',
    color: 'bg-blue-500',
    isAvailable: true
  },
  {
    id: 'microsoft',
    name: 'Microsoft Outlook',
    description: 'Sync with your Outlook/Office 365 calendar',
    icon: '📆',
    color: 'bg-orange-500',
    isAvailable: true
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    description: 'Sync with your iCloud calendar (requires manual setup)',
    icon: '🍎',
    color: 'bg-gray-500',
    isAvailable: true
  }
];

export const CalendarIntegration: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Load existing integrations
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/calendar/integrations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load calendar integrations');
      }

      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar integrations',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    try {
      setIsConnecting(provider);
      
      // Get OAuth authorization URL
      const response = await fetch(`/api/calendar/auth/${provider}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }

      const data = await response.json();
      
      // Redirect to OAuth provider
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect to calendar provider',
        variant: 'destructive'
      });
      setIsConnecting(null);
    }
  };

  const handleToggleSync = async (integrationId: string, syncEnabled: boolean) => {
    try {
      const response = await fetch(`/api/calendar/integrations/${integrationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ syncEnabled })
      });

      if (!response.ok) {
        throw new Error('Failed to update sync settings');
      }

      // Update local state
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, syncEnabled }
            : integration
        )
      );

      toast({
        title: 'Settings Updated',
        description: `Calendar sync ${syncEnabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating sync settings:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update sync settings',
        variant: 'destructive'
      });
    }
  };

  const handleSync = async (integrationId: string) => {
    try {
      setIsSyncing(integrationId);
      
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          integrationId,
          direction: 'bidirectional'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync calendar');
      }

      const data = await response.json();
      
      // Update last sync time
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, lastSyncAt: new Date().toISOString() }
            : integration
        )
      );

      toast({
        title: 'Sync Complete',
        description: `Processed ${data.summary.totalEventsProcessed} events`,
      });
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync calendar',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/calendar/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      // Remove from local state
      setIntegrations(prev => prev.filter(integration => integration.id !== integrationId));

      toast({
        title: 'Calendar Disconnected',
        description: 'Calendar integration has been removed',
      });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: 'Disconnect Failed',
        description: 'Failed to disconnect calendar',
        variant: 'destructive'
      });
    }
  };

  const getProviderInfo = (providerId: string) => {
    return CALENDAR_PROVIDERS.find(p => p.id === providerId);
  };

  const getConnectedProvider = (providerId: string) => {
    return integrations.find(integration => integration.provider === providerId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Calendar Integration</h2>
        <p className="text-gray-600">
          Connect your external calendars to automatically sync coaching sessions and avoid scheduling conflicts.
        </p>
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Connected Calendars
            </CardTitle>
            <CardDescription>
              Manage your connected calendar integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.map((integration) => {
              const provider = getProviderInfo(integration.provider);
              if (!provider) return null;

              return (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white text-lg`}>
                      {provider.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{provider.name}</h3>
                      <p className="text-sm text-gray-600">{integration.calendarName}</p>
                      {integration.lastSyncAt && (
                        <p className="text-xs text-gray-500">
                          Last synced: {format(new Date(integration.lastSyncAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Sync</span>
                      <Switch
                        checked={integration.syncEnabled}
                        onCheckedChange={(checked) => handleToggleSync(integration.id, checked)}
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(integration.id)}
                      disabled={isSyncing === integration.id}
                    >
                      {isSyncing === integration.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(integration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Connect Calendar
          </CardTitle>
          <CardDescription>
            Choose a calendar provider to connect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CALENDAR_PROVIDERS.map((provider) => {
            const connectedIntegration = getConnectedProvider(provider.id);
            const isConnected = !!connectedIntegration;
            const isConnectingThis = isConnecting === provider.id;

            return (
              <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white text-lg`}>
                    {provider.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{provider.name}</h3>
                    <p className="text-sm text-gray-600">{provider.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => handleConnect(provider.id)}
                      disabled={!provider.isAvailable || isConnectingThis}
                      className="flex items-center gap-2"
                    >
                      {isConnectingThis ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> When you connect a calendar, your coaching sessions will automatically 
          appear in your external calendar, and we'll check for conflicts when scheduling new sessions. 
          You can enable or disable sync for each connected calendar at any time.
        </AlertDescription>
      </Alert>
    </div>
  );
}; 