import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  availabilityService, 
  CoachAvailability, 
  AvailableSlot 
} from '@/services/availabilityService';
import { Calendar, Clock, Eye, RefreshCw, AlertCircle } from 'lucide-react';
import { format, addDays, startOfDay, endOfDay, addWeeks } from 'date-fns';

interface AvailabilityPreviewProps {
  availability: CoachAvailability;
  coachId: string;
}

export const AvailabilityPreview: React.FC<AvailabilityPreviewProps> = ({
  availability,
  coachId,
}) => {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(availability.defaultSessionDuration);
  const [previewPeriod, setPreviewPeriod] = useState('week'); // 'week' | '2weeks' | 'month'

  useEffect(() => {
    loadAvailableSlots();
  }, [coachId, selectedDuration, previewPeriod]);

  const loadAvailableSlots = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const startDate = startOfDay(new Date());
      let endDate: Date;

      switch (previewPeriod) {
        case '2weeks':
          endDate = endOfDay(addWeeks(startDate, 2));
          break;
        case 'month':
          endDate = endOfDay(addDays(startDate, 30));
          break;
        default:
          endDate = endOfDay(addWeeks(startDate, 1));
      }

      const response = await availabilityService.getAvailableSlots(
        coachId,
        startDate.toISOString(),
        endDate.toISOString(),
        selectedDuration
      );

      setSlots(response.slots);
    } catch (error) {
      console.error('Error loading available slots:', error);
      setError(error instanceof Error ? error.message : 'Failed to load available slots');
    } finally {
      setIsLoading(false);
    }
  };

  const groupSlotsByDate = (slots: AvailableSlot[]) => {
    const grouped: { [date: string]: AvailableSlot[] } = {};
    
    slots.forEach(slot => {
      const date = format(new Date(slot.start), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(slot);
    });

    return grouped;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getSlotStatusColor = (slot: AvailableSlot) => {
    if (!slot.isAvailable) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const availableSlots = slots.filter(slot => slot.isAvailable);
  const unavailableSlots = slots.filter(slot => !slot.isAvailable);
  const groupedSlots = groupSlotsByDate(availableSlots);

  const getPeriodLabel = () => {
    switch (previewPeriod) {
      case '2weeks':
        return 'Next 2 Weeks';
      case 'month':
        return 'Next Month';
      default:
        return 'Next Week';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Availability Preview</h3>
          <p className="text-sm text-muted-foreground">
            Preview your upcoming available time slots as clients would see them.
          </p>
        </div>
        <Button variant="outline" onClick={loadAvailableSlots} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Duration:</label>
          <Select
            value={selectedDuration.toString()}
            onValueChange={(value) => setSelectedDuration(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availability.allowedDurations.map((duration) => (
                <SelectItem key={duration} value={duration.toString()}>
                  {formatDuration(duration)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Period:</label>
          <Select value={previewPeriod} onValueChange={setPreviewPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Next Week</SelectItem>
              <SelectItem value="2weeks">Next 2 Weeks</SelectItem>
              <SelectItem value="month">Next Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-green-600">{availableSlots.length}</p>
                <p className="text-sm text-muted-foreground">Available Slots</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-red-600">{unavailableSlots.length}</p>
                <p className="text-sm text-muted-foreground">Blocked Slots</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{Object.keys(groupedSlots).length}</p>
                <p className="text-sm text-muted-foreground">Available Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading available slots...</p>
          </CardContent>
        </Card>
      )}

      {/* Available Slots by Date */}
      {!isLoading && !error && (
        <div className="space-y-4">
          <h4 className="font-medium">
            {getPeriodLabel()} - {formatDuration(selectedDuration)} Sessions
          </h4>

          {Object.keys(groupedSlots).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Available Slots</h3>
                <p className="text-muted-foreground mb-4">
                  No available time slots found for the selected duration and period.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>This could be because:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your schedule doesn't have availability for this duration</li>
                    <li>All slots are already booked</li>
                    <li>Date overrides are blocking availability</li>
                    <li>Buffer times are preventing slot generation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {Object.entries(groupedSlots)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([date, daySlots]) => (
                  <Card key={date}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                      </CardTitle>
                      <CardDescription>
                        {daySlots.length} available slot{daySlots.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {daySlots
                          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                          .map((slot, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className={`justify-center py-2 ${getSlotStatusColor(slot)}`}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(slot.start), 'HH:mm')}
                            </Badge>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Blocked Slots Summary */}
      {unavailableSlots.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-700">
              Blocked Time Slots ({unavailableSlots.length})
            </CardTitle>
            <CardDescription>
              Time slots that are not available due to conflicts or restrictions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unavailableSlots.slice(0, 5).map((slot, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>
                    {format(new Date(slot.start), 'MMM d, HH:mm')} - {format(new Date(slot.end), 'HH:mm')}
                  </span>
                  {slot.conflictReason && (
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      {slot.conflictReason}
                    </Badge>
                  )}
                </div>
              ))}
              {unavailableSlots.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  ... and {unavailableSlots.length - 5} more blocked slots
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 