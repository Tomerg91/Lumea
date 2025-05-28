import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  availabilityService, 
  CoachAvailability, 
  RecurringAvailability,
  DateOverride,
  AvailabilityStatus 
} from '@/services/availabilityService';
import { RecurringAvailabilityEditor } from './RecurringAvailabilityEditor';
import { DateOverrideManager } from './DateOverrideManager';
import { AvailabilitySettings } from './AvailabilitySettings';
import { AvailabilityPreview } from './AvailabilityPreview';
import { Clock, Calendar, Settings, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export const AvailabilityManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [availability, setAvailability] = useState<CoachAvailability | null>(null);
  const [status, setStatus] = useState<AvailabilityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  useEffect(() => {
    if (user?.id) {
      loadAvailability();
      loadStatus();
    }
  }, [user?.id]);

  const loadAvailability = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await availabilityService.getCoachAvailability(user.id);
      setAvailability(data);
    } catch (error) {
      // If no availability exists, create default
      if (error instanceof Error && error.message.includes('not found')) {
        try {
          const defaultData = availabilityService.getDefaultAvailability();
          const newAvailability = await availabilityService.createOrUpdateAvailability(defaultData);
          setAvailability(newAvailability);
          toast({
            title: 'Default Availability Created',
            description: 'We\'ve set up a default schedule for you. You can customize it below.',
          });
        } catch (createError) {
          console.error('Error creating default availability:', createError);
          toast({
            title: 'Error',
            description: 'Failed to load or create availability settings.',
            variant: 'destructive',
          });
        }
      } else {
        console.error('Error loading availability:', error);
        toast({
          title: 'Error',
          description: 'Failed to load availability settings.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatus = async () => {
    if (!user?.id) return;

    try {
      const statusData = await availabilityService.getAvailabilityStatus(user.id);
      setStatus(statusData);
    } catch (error) {
      console.error('Error loading availability status:', error);
    }
  };

  const handleRecurringAvailabilityUpdate = async (recurringAvailability: RecurringAvailability[]) => {
    if (!user?.id || !availability) return;

    try {
      setIsSaving(true);
      const updatedAvailability = await availabilityService.updateRecurringAvailability(
        user.id,
        recurringAvailability
      );
      setAvailability(updatedAvailability);
      await loadStatus(); // Refresh status
      toast({
        title: 'Success',
        description: 'Your weekly schedule has been updated.',
      });
    } catch (error) {
      console.error('Error updating recurring availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your schedule.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateOverrideAdd = async (dateOverride: DateOverride) => {
    if (!user?.id || !availability) return;

    try {
      setIsSaving(true);
      const updatedAvailability = await availabilityService.addDateOverride(user.id, dateOverride);
      setAvailability(updatedAvailability);
      await loadStatus(); // Refresh status
      toast({
        title: 'Success',
        description: 'Date override has been added.',
      });
    } catch (error) {
      console.error('Error adding date override:', error);
      toast({
        title: 'Error',
        description: 'Failed to add date override.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateOverrideRemove = async (date: string) => {
    if (!user?.id || !availability) return;

    try {
      setIsSaving(true);
      const updatedAvailability = await availabilityService.removeDateOverride(user.id, date);
      setAvailability(updatedAvailability);
      await loadStatus(); // Refresh status
      toast({
        title: 'Success',
        description: 'Date override has been removed.',
      });
    } catch (error) {
      console.error('Error removing date override:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove date override.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingsUpdate = async (settings: Partial<CoachAvailability>) => {
    if (!user?.id || !availability) return;

    try {
      setIsSaving(true);
      const updatedAvailability = await availabilityService.createOrUpdateAvailability({
        ...settings,
      });
      setAvailability(updatedAvailability);
      await loadStatus(); // Refresh status
      toast({
        title: 'Success',
        description: 'Your availability settings have been updated.',
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!availability) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Availability Settings</h3>
          <p className="text-muted-foreground mb-4">
            Set up your availability to allow clients to book sessions with you.
          </p>
          <Button onClick={loadAvailability}>
            Create Availability Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Availability Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.isCurrentlyAvailable ? (
                <>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Available Now
                  </Badge>
                  {status.currentSessionEnd && (
                    <span className="text-sm text-muted-foreground">
                      Current session ends at {format(new Date(status.currentSessionEnd), 'HH:mm')}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Available
                  </Badge>
                  {status?.nextAvailableSlot && (
                    <span className="text-sm text-muted-foreground">
                      Next available: {format(new Date(status.nextAvailableSlot), 'MMM d, HH:mm')}
                    </span>
                  )}
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={loadStatus}>
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Availability Management */}
      <Card>
        <CardHeader>
          <CardTitle>Availability Management</CardTitle>
          <CardDescription>
            Manage your schedule, time-off, and booking preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Weekly Schedule
              </TabsTrigger>
              <TabsTrigger value="overrides" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Off
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-6">
              <RecurringAvailabilityEditor
                recurringAvailability={availability.recurringAvailability}
                onUpdate={handleRecurringAvailabilityUpdate}
                isLoading={isSaving}
              />
            </TabsContent>

            <TabsContent value="overrides" className="mt-6">
              <DateOverrideManager
                dateOverrides={availability.dateOverrides}
                onAdd={handleDateOverrideAdd}
                onRemove={handleDateOverrideRemove}
                isLoading={isSaving}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <AvailabilitySettings
                availability={availability}
                onUpdate={handleSettingsUpdate}
                isLoading={isSaving}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
              <AvailabilityPreview
                availability={availability}
                coachId={user.id}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}; 