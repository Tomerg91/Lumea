import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cancelSession, CancelSessionData } from '@/services/sessionService';
import { Session } from '@/components/SessionList';
import { useToast } from '@/hooks/use-toast';

interface CancelSessionModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelSuccess: (cancelledSession: Session) => void;
}

const CANCELLATION_REASONS = [
  { value: 'coach_emergency', label: 'Coach Emergency' },
  { value: 'client_request', label: 'Client Request' },
  { value: 'illness', label: 'Illness' },
  { value: 'scheduling_conflict', label: 'Scheduling Conflict' },
  { value: 'technical_issues', label: 'Technical Issues' },
  { value: 'weather', label: 'Weather Conditions' },
  { value: 'personal_emergency', label: 'Personal Emergency' },
  { value: 'other', label: 'Other' },
] as const;

export const CancelSessionModal: React.FC<CancelSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onCancelSuccess,
}) => {
  const { toast } = useToast();
  const [reason, setReason] = useState<CancelSessionData['reason'] | ''>('');
  const [reasonText, setReasonText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleCancel = () => {
    setReason('');
    setReasonText('');
    setShowConfirmation(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!reason) {
      toast({
        title: 'Error',
        description: 'Please select a cancellation reason.',
        variant: 'destructive',
      });
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmCancellation = async () => {
    if (!session || !reason) return;

    setIsLoading(true);
    try {
      const cancelData: CancelSessionData = {
        reason,
        reasonText: reasonText.trim() || undefined,
      };

      const cancelledSession = await cancelSession(session._id, cancelData);
      
      toast({
        title: 'Session Cancelled',
        description: 'The session has been successfully cancelled.',
      });

      onCancelSuccess(cancelledSession);
      handleCancel();
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: error instanceof Error ? error.message : 'Failed to cancel session',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) return null;

  // Calculate hours until session
  const hoursUntilSession = Math.ceil(
    (new Date(session.date).getTime() - new Date().getTime()) / (1000 * 60 * 60)
  );

  const isLateCancel = hoursUntilSession < 24;
  const sessionDateTime = format(new Date(session.date), 'MMMM d, yyyy \'at\' HH:mm');

  if (showConfirmation) {
    return (
      <Dialog open={isOpen} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Cancellation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Session Details:</h4>
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {sessionDateTime}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Client:</strong> {session.client 
                  ? `${session.client.firstName} ${session.client.lastName}`
                  : 'Client'
                }
              </p>
              <p className="text-sm text-gray-600">
                <strong>Reason:</strong> {CANCELLATION_REASONS.find(r => r.value === reason)?.label}
              </p>
              {reasonText && (
                <p className="text-sm text-gray-600">
                  <strong>Notes:</strong> {reasonText}
                </p>
              )}
            </div>

            {isLateCancel && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Late Cancellation:</strong> This session is scheduled within 24 hours. 
                  Cancellation fees may apply according to our cancellation policy.
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                The client will be automatically notified of this cancellation via email.
                {isLateCancel && ' Please note that late cancellation fees may apply.'}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancellation}
              disabled={isLoading}
            >
              {isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Session</DialogTitle>
          <DialogDescription>
            Cancel your session scheduled for {sessionDateTime}. 
            Please provide a reason for the cancellation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hoursUntilSession < 24 && (
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This session is scheduled within 24 hours. 
                Late cancellation fees may apply.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as CancelSessionData['reason'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason for cancellation" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((reasonOption) => (
                  <SelectItem key={reasonOption.value} value={reasonOption.value}>
                    {reasonOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Provide any additional details about the cancellation..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              {reasonText.length}/500 characters
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cancelling this session will automatically notify the client and cannot be undone. 
              Please review our cancellation policy for information about potential fees.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={!reason}
          >
            Continue to Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 