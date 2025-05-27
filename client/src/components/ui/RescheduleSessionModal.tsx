import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { format, addDays, isBefore, isAfter, parseISO } from 'date-fns';
import { rescheduleSession, getAvailableSlots, RescheduleSessionData } from '@/services/sessionService';
import { Session } from '@/components/SessionList';
import { useToast } from '@/hooks/use-toast';

interface RescheduleSessionModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
  onRescheduleSuccess: (rescheduledSession: Session) => void;
}

interface AvailableSlot {
  start: string;
  end: string;
}

export const RescheduleSessionModal: React.FC<RescheduleSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onRescheduleSuccess,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [reasonText, setReasonText] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedDate(undefined);
      setSelectedTime('');
      setReason('');
      setReasonText('');
      setAvailableSlots([]);
    }
  }, [isOpen]);

  // Load available slots when date is selected
  useEffect(() => {
    if (selectedDate && session) {
      loadAvailableSlots();
    }
  }, [selectedDate, session]);

  const loadAvailableSlots = async () => {
    if (!selectedDate || !session) return;

    setLoadingSlots(true);
    try {
      const fromDate = format(selectedDate, 'yyyy-MM-dd');
      const toDate = format(selectedDate, 'yyyy-MM-dd');
      const slots = await getAvailableSlots(session._id, fromDate, toDate, 60);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available time slots. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(''); // Reset time when date changes
  };

  const getTimeOptions = () => {
    if (availableSlots.length === 0) {
      // Fallback to standard business hours if no slots are available
      const times = [];
      for (let hour = 9; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          times.push(timeString);
        }
      }
      return times;
    }

    return availableSlots.map(slot => {
      const startTime = new Date(slot.start);
      return format(startTime, 'HH:mm');
    });
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime || !reason) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!session || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      // Combine date and time into ISO string
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours, minutes, 0, 0);

      const rescheduleData: RescheduleSessionData = {
        newDate: newDateTime.toISOString(),
        reason: reasonText || reason,
      };

      const rescheduledSession = await rescheduleSession(session._id, rescheduleData);
      
      toast({
        title: 'Success',
        description: 'Session has been successfully rescheduled.',
      });

      onRescheduleSuccess(rescheduledSession);
      onClose();
    } catch (error) {
      console.error('Failed to reschedule session:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reschedule session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep('select');
  };

  const isValidReschedule = () => {
    if (!session || !selectedDate || !selectedTime) return false;
    
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(hours, minutes, 0, 0);
    
    // Check if the new date is in the future
    const now = new Date();
    return isAfter(newDateTime, now);
  };

  const canReschedule = () => {
    if (!session) return false;
    
    const sessionDate = new Date(session.date);
    const now = new Date();
    const minAdvanceNotice = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    return isAfter(sessionDate, minAdvanceNotice);
  };

  if (!session) return null;

  const sessionDate = new Date(session.date);
  const isLateReschedule = !canReschedule();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            {step === 'select' ? 'Reschedule Session' : 'Confirm Rescheduling'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' 
              ? 'Select a new date and time for your session.'
              : 'Please review your rescheduling details.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="grid gap-4 py-4">
            {/* Current Session Info */}
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Current Session</h4>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(sessionDate, 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(sessionDate, 'HH:mm')}
                </div>
                {session.client && (
                  <div>With: {session.client.firstName} {session.client.lastName}</div>
                )}
              </div>
            </div>

            {/* Late Rescheduling Warning */}
            {isLateReschedule && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Late Rescheduling Notice:</strong> This session is within 24 hours. 
                  Rescheduling fees may apply according to our policy.
                </AlertDescription>
              </Alert>
            )}

            {/* Date Selection */}
            <div className="grid gap-2">
              <Label htmlFor="new-date">New Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border p-3"
                disabled={(date) => isBefore(date, new Date()) || isBefore(date, addDays(new Date(), 1))}
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div className="grid gap-2">
                <Label htmlFor="new-time">New Time</Label>
                {loadingSlots ? (
                  <div className="text-sm text-muted-foreground">Loading available times...</div>
                ) : (
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a time" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTimeOptions().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Reason Selection */}
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for Rescheduling</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduling_conflict">Scheduling Conflict</SelectItem>
                  <SelectItem value="illness">Illness</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="technical_issues">Technical Issues</SelectItem>
                  <SelectItem value="weather">Weather</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Notes */}
            {reason === 'other' && (
              <div className="grid gap-2">
                <Label htmlFor="reason-text">Please specify</Label>
                <Textarea
                  id="reason-text"
                  placeholder="Please provide details..."
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {reasonText.length}/500 characters
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="grid gap-4 py-4">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Confirmation Required:</strong> Please review the rescheduling details below.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                  <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">From</h4>
                  <div className="space-y-1 text-sm text-red-800 dark:text-red-200">
                    <div>{format(sessionDate, 'EEEE, MMM d')}</div>
                    <div>{format(sessionDate, 'HH:mm')}</div>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">To</h4>
                  <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                    <div>{selectedDate && format(selectedDate, 'EEEE, MMM d')}</div>
                    <div>{selectedTime}</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-950/30 p-3 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Reason</h4>
                <div className="text-sm text-gray-800 dark:text-gray-200">
                  {reason === 'other' ? reasonText : reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>

              {isLateReschedule && (
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    <strong>Fee Notice:</strong> A rescheduling fee may apply due to the late notice.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'select' ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!isValidReschedule() || !reason}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isValidReschedule()}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 