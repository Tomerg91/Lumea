import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RecurringAvailability, availabilityService } from '@/services/availabilityService';
import { Plus, Trash2, Clock } from 'lucide-react';

interface RecurringAvailabilityEditorProps {
  recurringAvailability: RecurringAvailability[];
  onUpdate: (availability: RecurringAvailability[]) => void;
  isLoading: boolean;
}

export const RecurringAvailabilityEditor: React.FC<RecurringAvailabilityEditorProps> = ({
  recurringAvailability,
  onUpdate,
  isLoading,
}) => {
  const [localAvailability, setLocalAvailability] = useState<RecurringAvailability[]>(
    recurringAvailability.length > 0 ? recurringAvailability : []
  );

  const daysOfWeek = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
  ];

  const addTimeSlot = (dayOfWeek: number) => {
    const newSlot: RecurringAvailability = {
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isActive: true,
    };

    const updated = [...localAvailability, newSlot];
    setLocalAvailability(updated);
  };

  const removeTimeSlot = (index: number) => {
    const updated = localAvailability.filter((_, i) => i !== index);
    setLocalAvailability(updated);
  };

  const updateTimeSlot = (index: number, field: keyof RecurringAvailability, value: any) => {
    const updated = localAvailability.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    setLocalAvailability(updated);
  };

  const toggleDay = (dayOfWeek: number) => {
    const existingSlots = localAvailability.filter(slot => slot.dayOfWeek === dayOfWeek);
    
    if (existingSlots.length > 0) {
      // Toggle all slots for this day
      const allActive = existingSlots.every(slot => slot.isActive);
      const updated = localAvailability.map(slot =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, isActive: !allActive } : slot
      );
      setLocalAvailability(updated);
    } else {
      // Add a default slot for this day
      addTimeSlot(dayOfWeek);
    }
  };

  const handleSave = () => {
    onUpdate(localAvailability);
  };

  const hasChanges = JSON.stringify(localAvailability) !== JSON.stringify(recurringAvailability);

  const getSlotsByDay = (dayOfWeek: number) => {
    return localAvailability
      .map((slot, index) => ({ ...slot, index }))
      .filter(slot => slot.dayOfWeek === dayOfWeek);
  };

  const isDayActive = (dayOfWeek: number) => {
    const slots = getSlotsByDay(dayOfWeek);
    return slots.length > 0 && slots.some(slot => slot.isActive);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Weekly Schedule</h3>
          <p className="text-sm text-muted-foreground">
            Set your regular weekly availability. You can add multiple time slots per day.
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {daysOfWeek.map((day) => {
          const daySlots = getSlotsByDay(day.value);
          const isActive = isDayActive(day.value);

          return (
            <Card key={day.value} className={isActive ? 'border-primary/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Label className="text-base font-medium">{day.label}</Label>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => toggleDay(day.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeSlot(day.value)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {daySlots.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.index}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          slot.isActive ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                        }`}
                      >
                        <Switch
                          checked={slot.isActive}
                          onCheckedChange={(checked) =>
                            updateTimeSlot(slot.index, 'isActive', checked)
                          }
                        />

                        <div className="flex items-center gap-2 flex-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) =>
                              updateTimeSlot(slot.index, 'startTime', e.target.value)
                            }
                            className="w-auto"
                            disabled={!slot.isActive}
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) =>
                              updateTimeSlot(slot.index, 'endTime', e.target.value)
                            }
                            className="w-auto"
                            disabled={!slot.isActive}
                          />
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {slot.isActive && (
                            <>
                              {availabilityService.formatTime(slot.startTime)} -{' '}
                              {availabilityService.formatTime(slot.endTime)}
                            </>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(slot.index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {localAvailability.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Schedule Set</h3>
            <p className="text-muted-foreground mb-4">
              Add time slots to your weekly schedule to allow clients to book sessions.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {daysOfWeek.slice(1, 6).map((day) => (
                <Button
                  key={day.value}
                  variant="outline"
                  size="sm"
                  onClick={() => addTimeSlot(day.value)}
                >
                  Add {day.short}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 