import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CoachAvailability } from '@/services/availabilityService';
import { Settings, Clock, Calendar, Shield, Globe } from 'lucide-react';
import TimezoneSelector from '../ui/TimezoneSelector';

interface AvailabilitySettingsProps {
  availability: CoachAvailability;
  onUpdate: (settings: Partial<CoachAvailability>) => void;
  isLoading: boolean;
}

export const AvailabilitySettings: React.FC<AvailabilitySettingsProps> = ({
  availability,
  onUpdate,
  isLoading,
}) => {
  const [localSettings, setLocalSettings] = useState({
    timezone: availability.timezone,
    bufferSettings: { ...availability.bufferSettings },
    defaultSessionDuration: availability.defaultSessionDuration,
    allowedDurations: [...availability.allowedDurations],
    advanceBookingDays: availability.advanceBookingDays,
    lastMinuteBookingHours: availability.lastMinuteBookingHours,
    autoAcceptBookings: availability.autoAcceptBookings,
    requireApproval: availability.requireApproval,
  });

  const [newDuration, setNewDuration] = useState('');

  const updateSetting = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setLocalSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value,
        },
      }));
    } else {
      setLocalSettings(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const addDuration = () => {
    const duration = parseInt(newDuration);
    if (duration && duration > 0 && !localSettings.allowedDurations.includes(duration)) {
      const updatedDurations = [...localSettings.allowedDurations, duration].sort((a, b) => a - b);
      setLocalSettings(prev => ({
        ...prev,
        allowedDurations: updatedDurations,
      }));
      setNewDuration('');
    }
  };

  const removeDuration = (duration: number) => {
    setLocalSettings(prev => ({
      ...prev,
      allowedDurations: prev.allowedDurations.filter(d => d !== duration),
    }));
  };

  const handleSave = () => {
    onUpdate(localSettings);
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify({
    timezone: availability.timezone,
    bufferSettings: availability.bufferSettings,
    defaultSessionDuration: availability.defaultSessionDuration,
    allowedDurations: availability.allowedDurations,
    advanceBookingDays: availability.advanceBookingDays,
    lastMinuteBookingHours: availability.lastMinuteBookingHours,
    autoAcceptBookings: availability.autoAcceptBookings,
    requireApproval: availability.requireApproval,
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Availability Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure your booking preferences, buffer times, and session options.
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {/* Timezone Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Timezone & Location
            </CardTitle>
            <CardDescription>
              Set your timezone for accurate scheduling across different regions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <TimezoneSelector
                value={localSettings.timezone}
                onChange={(timezone) => updateSetting('timezone', timezone)}
                placeholder="Select your timezone..."
                showAutoDetect={true}
                showCurrentTime={true}
                groupByRegion={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Buffer Time Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Buffer Times
            </CardTitle>
            <CardDescription>
              Set buffer time before, after, and between sessions for preparation and notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="before-buffer">Before Session</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="before-buffer"
                    type="number"
                    min="0"
                    max="60"
                    value={localSettings.bufferSettings.beforeSession}
                    onChange={(e) => updateSetting('bufferSettings.beforeSession', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="after-buffer">After Session</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="after-buffer"
                    type="number"
                    min="0"
                    max="60"
                    value={localSettings.bufferSettings.afterSession}
                    onChange={(e) => updateSetting('bufferSettings.afterSession', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="between-buffer">Between Sessions</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="between-buffer"
                    type="number"
                    min="0"
                    max="120"
                    value={localSettings.bufferSettings.betweenSessions}
                    onChange={(e) => updateSetting('bufferSettings.betweenSessions', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Duration Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Session Durations
            </CardTitle>
            <CardDescription>
              Configure available session lengths and set your default duration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-duration">Default Session Duration</Label>
              <Select
                value={localSettings.defaultSessionDuration.toString()}
                onValueChange={(value) => updateSetting('defaultSessionDuration', parseInt(value))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localSettings.allowedDurations.map((duration) => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {formatDuration(duration)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Available Durations</Label>
              <div className="flex flex-wrap gap-2">
                {localSettings.allowedDurations.map((duration) => (
                  <Badge
                    key={duration}
                    variant={duration === localSettings.defaultSessionDuration ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {formatDuration(duration)}
                    {localSettings.allowedDurations.length > 1 && (
                      <button
                        onClick={() => removeDuration(duration)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Minutes"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-24"
                  min="15"
                  max="480"
                />
                <Button variant="outline" size="sm" onClick={addDuration} disabled={!newDuration}>
                  Add Duration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Booking Restrictions
            </CardTitle>
            <CardDescription>
              Control how far in advance clients can book and last-minute booking limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="advance-booking">Advance Booking Limit</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="advance-booking"
                    type="number"
                    min="1"
                    max="365"
                    value={localSettings.advanceBookingDays}
                    onChange={(e) => updateSetting('advanceBookingDays', parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">days ahead</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-minute">Last-Minute Booking</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="last-minute"
                    type="number"
                    min="1"
                    max="168"
                    value={localSettings.lastMinuteBookingHours}
                    onChange={(e) => updateSetting('lastMinuteBookingHours', parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">hours minimum</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Approval Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              Booking Approval
            </CardTitle>
            <CardDescription>
              Choose whether bookings are automatically accepted or require your approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-accept">Auto-Accept Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically confirm bookings without manual approval
                </p>
              </div>
              <Switch
                id="auto-accept"
                checked={localSettings.autoAcceptBookings}
                onCheckedChange={(checked) => updateSetting('autoAcceptBookings', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="require-approval">Require Manual Approval</Label>
                <p className="text-sm text-muted-foreground">
                  All bookings must be manually approved by you
                </p>
              </div>
              <Switch
                id="require-approval"
                checked={localSettings.requireApproval}
                onCheckedChange={(checked) => updateSetting('requireApproval', checked)}
              />
            </div>

            {localSettings.autoAcceptBookings && localSettings.requireApproval && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Both auto-accept and require approval are enabled. 
                  Auto-accept will take precedence for eligible bookings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 