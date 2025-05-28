import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateOverride } from '@/services/availabilityService';
import { Calendar, Plus, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

interface DateOverrideManagerProps {
  dateOverrides: DateOverride[];
  onAdd: (dateOverride: DateOverride) => void;
  onRemove: (date: string) => void;
  isLoading: boolean;
}

export const DateOverrideManager: React.FC<DateOverrideManagerProps> = ({
  dateOverrides,
  onAdd,
  onRemove,
  isLoading,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOverride, setNewOverride] = useState<Partial<DateOverride>>({
    date: '',
    isAvailable: false,
    reason: 'vacation',
    timeSlots: [],
  });

  const reasonOptions = [
    { value: 'vacation', label: 'Vacation', color: 'bg-blue-100 text-blue-800' },
    { value: 'sick', label: 'Sick Day', color: 'bg-red-100 text-red-800' },
    { value: 'personal', label: 'Personal', color: 'bg-purple-100 text-purple-800' },
    { value: 'training', label: 'Training', color: 'bg-green-100 text-green-800' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
  ];

  const handleAddOverride = () => {
    if (!newOverride.date) return;

    const override: DateOverride = {
      date: newOverride.date,
      isAvailable: newOverride.isAvailable || false,
      reason: newOverride.reason as DateOverride['reason'],
      ...(newOverride.isAvailable && newOverride.timeSlots && { timeSlots: newOverride.timeSlots }),
    };

    onAdd(override);
    setNewOverride({
      date: '',
      isAvailable: false,
      reason: 'vacation',
      timeSlots: [],
    });
    setShowAddForm(false);
  };

  const addTimeSlot = () => {
    const currentSlots = newOverride.timeSlots || [];
    setNewOverride({
      ...newOverride,
      timeSlots: [
        ...currentSlots,
        { startTime: '09:00', endTime: '17:00' },
      ],
    });
  };

  const removeTimeSlot = (index: number) => {
    const currentSlots = newOverride.timeSlots || [];
    setNewOverride({
      ...newOverride,
      timeSlots: currentSlots.filter((_, i) => i !== index),
    });
  };

  const updateTimeSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const currentSlots = newOverride.timeSlots || [];
    const updatedSlots = currentSlots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    setNewOverride({
      ...newOverride,
      timeSlots: updatedSlots,
    });
  };

  const getReasonStyle = (reason?: string) => {
    const option = reasonOptions.find(opt => opt.value === reason);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const sortedOverrides = [...dateOverrides].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcomingOverrides = sortedOverrides.filter(override => 
    isAfter(parseISO(override.date), startOfDay(new Date()))
  );

  const pastOverrides = sortedOverrides.filter(override => 
    isBefore(parseISO(override.date), startOfDay(new Date()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Time Off & Special Availability</h3>
          <p className="text-sm text-muted-foreground">
            Override your regular schedule for specific dates (vacations, sick days, special hours).
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Override
        </Button>
      </div>

      {/* Add Override Form */}
      {showAddForm && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">Add Date Override</CardTitle>
            <CardDescription>
              Set special availability or time-off for a specific date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="override-date">Date</Label>
                <Input
                  id="override-date"
                  type="date"
                  value={newOverride.date}
                  onChange={(e) => setNewOverride({ ...newOverride, date: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="override-reason">Reason</Label>
                <Select
                  value={newOverride.reason}
                  onValueChange={(value) => setNewOverride({ ...newOverride, reason: value as DateOverride['reason'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="override-available"
                checked={newOverride.isAvailable}
                onCheckedChange={(checked) => setNewOverride({ ...newOverride, isAvailable: checked })}
              />
              <Label htmlFor="override-available">
                {newOverride.isAvailable ? 'Available with custom hours' : 'Not available (time off)'}
              </Label>
            </div>

            {newOverride.isAvailable && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Custom Time Slots</Label>
                  <Button variant="outline" size="sm" onClick={addTimeSlot}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Slot
                  </Button>
                </div>
                
                {(newOverride.timeSlots || []).map((slot, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                      className="w-auto"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                      className="w-auto"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTimeSlot(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {(!newOverride.timeSlots || newOverride.timeSlots.length === 0) && (
                  <p className="text-sm text-muted-foreground italic">
                    Add time slots for custom availability on this date.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddOverride} disabled={!newOverride.date || isLoading}>
                {isLoading ? 'Adding...' : 'Add Override'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Overrides */}
      {upcomingOverrides.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Upcoming ({upcomingOverrides.length})
          </h4>
          <div className="grid gap-3">
            {upcomingOverrides.map((override) => (
              <Card key={override.date} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {format(parseISO(override.date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getReasonStyle(override.reason)}>
                            {reasonOptions.find(r => r.value === override.reason)?.label || override.reason}
                          </Badge>
                          {override.isAvailable ? (
                            <Badge variant="outline" className="text-green-700 border-green-200">
                              Custom Hours
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-700 border-red-200">
                              Not Available
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {override.isAvailable && override.timeSlots && override.timeSlots.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {override.timeSlots.map((slot, index) => (
                            <div key={index}>
                              {slot.startTime} - {slot.endTime}
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(override.date)}
                        className="text-destructive hover:text-destructive"
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Overrides */}
      {pastOverrides.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Past ({pastOverrides.length})
          </h4>
          <div className="grid gap-2">
            {pastOverrides.slice(-5).map((override) => (
              <Card key={override.date} className="opacity-60">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {format(parseISO(override.date), 'MMM d, yyyy')}
                      </span>
                      <Badge size="sm" className={getReasonStyle(override.reason)}>
                        {reasonOptions.find(r => r.value === override.reason)?.label || override.reason}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(override.date)}
                      className="text-destructive hover:text-destructive h-6 w-6 p-0"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {pastOverrides.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing last 5 of {pastOverrides.length} past overrides
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {dateOverrides.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Date Overrides</h3>
            <p className="text-muted-foreground mb-4">
              You haven't set any special availability or time-off dates yet.
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Override
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 