import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { format, addDays, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { availabilityService, AvailableSlot } from '@/services/availabilityService';
import { createPublicBookingSession, CreateSessionData } from '@/services/sessionService';

interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  selectedDate: Date | null;
  selectedSlot: AvailableSlot | null;
  duration: number;
}

interface CoachInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  specialties?: string[];
  profileImage?: string;
}

const BookingPage: React.FC = () => {
  const { coachId } = useParams<{ coachId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Booking state
  const [step, setStep] = useState<'select' | 'details' | 'confirm' | 'success'>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [coach, setCoach] = useState<CoachInfo | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDurations, setAvailableDurations] = useState<number[]>([60]);
  
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    selectedDate: null,
    selectedSlot: null,
    duration: 60,
  });

  // Load coach information and availability settings
  useEffect(() => {
    if (coachId) {
      loadCoachInfo();
      loadAvailabilitySettings();
    }
  }, [coachId]);

  // Load available slots when date or duration changes
  useEffect(() => {
    if (selectedDate && coachId) {
      loadAvailableSlots();
    }
  }, [selectedDate, formData.duration, coachId]);

  // Pre-fill form data from URL parameters
  useEffect(() => {
    const email = searchParams.get('email');
    const firstName = searchParams.get('firstName');
    const lastName = searchParams.get('lastName');
    const phone = searchParams.get('phone');
    const duration = searchParams.get('duration');

    if (email || firstName || lastName || phone || duration) {
      setFormData(prev => ({
        ...prev,
        ...(email && { email }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(duration && { duration: parseInt(duration) }),
      }));
    }
  }, [searchParams]);

  const loadCoachInfo = async () => {
    try {
      // Mock coach data - in real implementation, fetch from API
      setCoach({
        id: coachId!,
        firstName: 'Sarah',
        lastName: 'Cohen',
        email: 'sarah@satyacoaching.com',
        bio: 'Experienced life coach specializing in personal development and mindfulness using the Satya Method.',
        specialties: ['Personal Development', 'Mindfulness', 'Career Coaching', 'Relationship Coaching'],
      });
    } catch (error) {
      console.error('Failed to load coach info:', error);
      toast({
        title: 'Error',
        description: 'Failed to load coach information.',
        variant: 'destructive',
      });
    }
  };

  const loadAvailabilitySettings = async () => {
    try {
      const availability = await availabilityService.getCoachAvailability(coachId!);
      setAvailableDurations(availability.allowedDurations);
      setFormData(prev => ({
        ...prev,
        duration: availability.defaultSessionDuration,
      }));
    } catch (error) {
      console.error('Failed to load availability settings:', error);
      // Use defaults
      setAvailableDurations([30, 45, 60, 90, 120]);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !coachId) return;

    setLoadingSlots(true);
    try {
      const startDate = startOfDay(selectedDate);
      const endDate = endOfDay(selectedDate);
      
      const response = await availabilityService.getAvailableSlots(
        coachId,
        startDate.toISOString(),
        endDate.toISOString(),
        formData.duration
      );

      setAvailableSlots(response.slots.filter(slot => slot.isAvailable));
    } catch (error) {
      console.error('Failed to load available slots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available time slots.',
        variant: 'destructive',
      });
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({
        ...prev,
        selectedDate: date,
        selectedSlot: null, // Reset slot when date changes
      }));
    }
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setFormData(prev => ({
      ...prev,
      selectedSlot: slot,
    }));
  };

  const handleDurationChange = (duration: string) => {
    setFormData(prev => ({
      ...prev,
      duration: parseInt(duration),
      selectedSlot: null, // Reset slot when duration changes
    }));
  };

  const handleFormChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'First name is required.',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.lastName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Last name is required.',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast({
        title: 'Validation Error',
        description: 'Valid email address is required.',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.selectedDate || !formData.selectedSlot) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date and time slot.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleBookSession = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const sessionData: CreateSessionData = {
        coachId: coachId!,
        clientEmail: formData.email,
        clientFirstName: formData.firstName,
        clientLastName: formData.lastName,
        clientPhone: formData.phone,
        date: formData.selectedSlot!.start,
        duration: formData.duration,
        notes: formData.notes,
      };

      await createPublicBookingSession(sessionData);
      setStep('success');
      
      toast({
        title: 'Booking Confirmed!',
        description: 'Your session has been successfully booked.',
      });
    } catch (error) {
      console.error('Failed to book session:', error);
      toast({
        title: 'Booking Failed',
        description: error instanceof Error ? error.message : 'Failed to book session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const groupSlotsByTime = (slots: AvailableSlot[]) => {
    return slots.reduce((groups: { [time: string]: AvailableSlot }, slot) => {
      const time = format(new Date(slot.start), 'HH:mm');
      groups[time] = slot;
      return groups;
    }, {});
  };

  if (!coach) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient-purple mb-2">
            Book a Session
          </h1>
          <p className="text-lg opacity-80">
            Schedule your coaching session with {coach.firstName} {coach.lastName}
          </p>
        </div>

        {/* Coach Info Card */}
        <Card className="lumea-card mb-8">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-teal-blue rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {coach.firstName} {coach.lastName}
                </CardTitle>
                <CardDescription className="text-base">
                  {coach.bio}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {coach.specialties && (
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {coach.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Booking Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Step 1: Date & Time Selection */}
          <Card className={`lumea-card ${step === 'select' ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                1. Select Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Duration Selection */}
              <div>
                <Label>Session Duration</Label>
                <Select value={formData.duration.toString()} onValueChange={handleDurationChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDurations.map(duration => (
                      <SelectItem key={duration} value={duration.toString()}>
                        {formatDuration(duration)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div>
                <Label>Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                  disabled={(date) => isBefore(date, new Date()) || isAfter(date, addDays(new Date(), 30))}
                />
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div>
                  <Label>Available Times</Label>
                  {loadingSlots ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading times...</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No available time slots for this date. Please select another date.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(groupSlotsByTime(availableSlots)).map(([time, slot]) => (
                        <Button
                          key={time}
                          variant={formData.selectedSlot?.start === slot.start ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSlotSelect(slot)}
                          className="justify-center"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {formData.selectedSlot && (
                <Button 
                  onClick={() => setStep('details')} 
                  className="w-full"
                  disabled={!formData.selectedSlot}
                >
                  Continue to Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Contact Details */}
          <Card className={`lumea-card ${step === 'details' ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                2. Your Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                    placeholder="Your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleFormChange('lastName', e.target.value)}
                    placeholder="Your last name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="notes">Session Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="What would you like to focus on in this session?"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('select')}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => setStep('confirm')} 
                  className="flex-1"
                  disabled={!formData.firstName || !formData.lastName || !formData.email}
                >
                  Review Booking
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Confirmation */}
          <Card className={`lumea-card ${step === 'confirm' ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                3. Confirm Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 'confirm' && formData.selectedSlot && (
                <>
                  <div className="bg-primary/10 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold">Session Details</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {format(new Date(formData.selectedSlot.start), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(formData.selectedSlot.start), 'HH:mm')} - {format(new Date(formData.selectedSlot.end), 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {coach.firstName} {coach.lastName}
                      </div>
                    </div>
                  </div>

                  <div className="bg-secondary/10 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold">Your Information</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {formData.firstName} {formData.lastName}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {formData.email}
                      </div>
                      {formData.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {formData.phone}
                        </div>
                      )}
                      {formData.notes && (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 mt-0.5" />
                          <span>{formData.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep('details')}
                      className="flex-1"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      onClick={handleBookSession}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Booking...
                        </div>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm Booking
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {step === 'success' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Booking Confirmed!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      You'll receive a confirmation email shortly with session details and calendar invite.
                    </p>
                  </div>
                  <Button 
                    onClick={() => window.location.href = '/'}
                    className="w-full"
                  >
                    Return to Home
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookingPage; 