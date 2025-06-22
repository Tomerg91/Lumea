import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useToast } from '../../hooks/use-toast';
import { 
  CheckCircle, 
  User, 
  CreditCard, 
  Calendar, 
  UserPlus, 
  Star,
  Upload,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Circle,
  ArrowRight,
  ArrowLeft,
  Users,
  Mail,
  Globe,
  Shield,
  Clock,
  DollarSign
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Validation schemas for each step
const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  bio: z.string().min(50, 'Bio must be at least 50 characters'),
  experience: z.string().min(1, 'Please select your experience level'),
  specialization: z.array(z.string()).min(1, 'Please select at least one specialization'),
  profileImage: z.string().optional(),
});

const paymentSchema = z.object({
  hourlyRate: z.number().min(10, 'Hourly rate must be at least $10'),
  sessionPackageRate: z.number().min(50, 'Session package rate must be at least $50'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'ILS']),
  stripeConnectId: z.string().optional(),
});

const calendarSchema = z.object({
  calendarConnected: z.boolean(),
  workingDays: z.array(z.string()).min(1, 'Please select at least one working day'),
  startTime: z.string().min(1, 'Please select start time'),
  endTime: z.string().min(1, 'Please select end time'),
  bufferTime: z.number().min(0, 'Buffer time must be 0 or more minutes'),
});

const clientInviteSchema = z.object({
  clientEmail: z.string().email('Please enter a valid email address'),
  personalMessage: z.string().min(20, 'Personal message must be at least 20 characters'),
});

type ProfileData = z.infer<typeof profileSchema>;
type PaymentData = z.infer<typeof paymentSchema>;
type CalendarData = z.infer<typeof calendarSchema>;
type ClientInviteData = z.infer<typeof clientInviteSchema>;

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

interface CoachProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  specializations: string[];
  certifications: string[];
  hourlyRate: number;
  languages: string[];
  timeZone: string;
  profileImage?: string;
}

interface OnboardingState {
  currentStep: number;
  completedSteps: Set<string>;
  profile: CoachProfile;
  stripeConnected: boolean;
  calendarConnected: boolean;
  sampleClientCreated: boolean;
}

const SPECIALIZATIONS = [
  'Life Coaching',
  'Career Coaching',
  'Health & Wellness',
  'Business Coaching',
  'Relationship Coaching',
  'Executive Coaching',
  'Mindfulness & Meditation',
  'Financial Coaching',
  'Spiritual Coaching',
  'Performance Coaching'
];

const EXPERIENCE_LEVELS = [
  { value: 'new', label: 'New to Coaching (0-1 years)' },
  { value: 'beginner', label: 'Beginner (1-2 years)' },
  { value: 'intermediate', label: 'Intermediate (3-5 years)' },
  { value: 'experienced', label: 'Experienced (5-10 years)' },
  { value: 'expert', label: 'Expert (10+ years)' }
];

const WORKING_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const CoachOnboardingWizard: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    completedSteps: new Set(),
    profile: {
      firstName: user?.user_metadata?.first_name || user?.user_metadata?.name?.split(' ')[0] || '',
      lastName: user?.user_metadata?.last_name || user?.user_metadata?.name?.split(' ')[1] || '',
      email: '',
      phone: '',
      bio: '',
      specializations: [],
      certifications: [],
      hourlyRate: 0,
      languages: [],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    stripeConnected: false,
    calendarConnected: false,
    sampleClientCreated: false,
  });

  const [loading, setLoading] = useState(false);

  // Profile Setup Step
  const ProfileSetupStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
        <p className="text-gray-600 mt-2">Let's set up your coaching profile to attract clients</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={state.profile.firstName}
            onChange={(e) => setState(prev => ({
              ...prev,
              profile: { ...prev.profile, firstName: e.target.value }
            }))}
            placeholder="Enter your first name"
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={state.profile.lastName}
            onChange={(e) => setState(prev => ({
              ...prev,
              profile: { ...prev.profile, lastName: e.target.value }
            }))}
            placeholder="Enter your last name"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={state.profile.email}
          onChange={(e) => setState(prev => ({
            ...prev,
            profile: { ...prev.profile, email: e.target.value }
          }))}
          placeholder="your.email@example.com"
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          value={state.profile.phone}
          onChange={(e) => setState(prev => ({
            ...prev,
            profile: { ...prev.profile, phone: e.target.value }
          }))}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div>
        <Label htmlFor="bio">Professional Bio *</Label>
        <Textarea
          id="bio"
          value={state.profile.bio}
          onChange={(e) => setState(prev => ({
            ...prev,
            profile: { ...prev.profile, bio: e.target.value }
          }))}
          placeholder="Tell clients about your coaching experience, methodology, and what makes you unique..."
          rows={4}
        />
        <p className="text-sm text-gray-500 mt-1">
          {state.profile.bio.length}/500 characters
        </p>
      </div>

      <div>
        <Label htmlFor="hourlyRate">Hourly Rate (USD) *</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            id="hourlyRate"
            type="number"
            value={state.profile.hourlyRate}
            onChange={(e) => setState(prev => ({
              ...prev,
              profile: { ...prev.profile, hourlyRate: Number(e.target.value) }
            }))}
            placeholder="150"
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <Label>Specializations</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {['Life Coaching', 'Career Coaching', 'Executive Coaching', 'Wellness Coaching', 'Relationship Coaching'].map((spec) => (
            <Badge
              key={spec}
              variant={state.profile.specializations.includes(spec) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    specializations: prev.profile.specializations.includes(spec)
                      ? prev.profile.specializations.filter(s => s !== spec)
                      : [...prev.profile.specializations, spec]
                  }
                }));
              }}
            >
              {spec}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  // Stripe Setup Step
  const StripeSetupStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CreditCard className="mx-auto h-16 w-16 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Payment Setup</h2>
        <p className="text-gray-600 mt-2">Connect your Stripe account to receive payments</p>
      </div>

      {!state.stripeConnected ? (
        <div className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Stripe is our secure payment processor. Your financial information is protected with bank-level security.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-3">What you'll need:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Bank account information</li>
              <li>• Tax ID or SSN</li>
              <li>• Business address</li>
              <li>• Government-issued ID</li>
            </ul>
          </div>

          <Button 
            onClick={handleStripeConnect} 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect with Stripe'}
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Stripe Connected!</h3>
          <p className="text-gray-600">You're ready to receive payments from clients.</p>
        </div>
      )}
    </div>
  );

  // Calendar Integration Step
  const CalendarIntegrationStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Calendar className="mx-auto h-16 w-16 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Calendar Integration</h2>
        <p className="text-gray-600 mt-2">Sync your calendar to manage availability</p>
      </div>

      {!state.calendarConnected ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold">Google Calendar</h3>
                <p className="text-sm text-gray-600 mt-2">Sync with your Google Calendar</p>
                <Button 
                  variant="outline" 
                  className="mt-4 w-full"
                  onClick={() => handleCalendarConnect('google')}
                >
                  Connect Google
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold">Outlook Calendar</h3>
                <p className="text-sm text-gray-600 mt-2">Sync with your Outlook Calendar</p>
                <Button 
                  variant="outline" 
                  className="mt-4 w-full"
                  onClick={() => handleCalendarConnect('outlook')}
                >
                  Connect Outlook
                </Button>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Calendar integration helps you manage your availability and automatically prevents double-booking.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Calendar Connected!</h3>
          <p className="text-gray-600">Your availability is now synced with your calendar.</p>
        </div>
      )}
    </div>
  );

  // Sample Client Creation Step
  const SampleClientStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Users className="mx-auto h-16 w-16 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Create Your First Client</h2>
        <p className="text-gray-600 mt-2">Let's walk through creating a sample client to familiarize you with the process</p>
      </div>

      {!state.sampleClientCreated ? (
        <div className="space-y-4">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-3">Tutorial: Creating a Client</h3>
            <p className="text-sm text-gray-600 mb-4">
              We'll create a sample client profile to show you how the process works. 
              This helps you understand the client onboarding flow.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</div>
                <span className="text-sm">Add client information</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</div>
                <span className="text-sm">Set coaching goals</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">3</div>
                <span className="text-sm">Schedule first session</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleCreateSampleClient} 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Creating Sample Client...' : 'Start Client Creation Tutorial'}
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Tutorial Complete!</h3>
          <p className="text-gray-600">You've successfully learned how to create and manage clients.</p>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800">Next Steps:</h4>
            <ul className="text-sm text-green-700 mt-2 space-y-1">
              <li>• Invite real clients to your coaching platform</li>
              <li>• Create your first coaching session</li>
              <li>• Set up your availability schedule</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  const steps: OnboardingStep[] = [
    {
      id: 'profile',
      title: 'Profile Setup',
      description: 'Complete your coaching profile',
      icon: User,
      component: ProfileSetupStep,
    },
    {
      id: 'stripe',
      title: 'Payment Setup',
      description: 'Connect your Stripe account',
      icon: CreditCard,
      component: StripeSetupStep,
    },
    {
      id: 'calendar',
      title: 'Calendar Integration',
      description: 'Sync your calendar',
      icon: Calendar,
      component: CalendarIntegrationStep,
    },
    {
      id: 'sample-client',
      title: 'Client Tutorial',
      description: 'Learn client management',
      icon: Users,
      component: SampleClientStep,
    },
  ];

  const currentStepData = steps[state.currentStep];
  const CurrentStepComponent = currentStepData.component;
  const progress = ((state.currentStep + 1) / steps.length) * 100;

  const handleStripeConnect = async () => {
    setLoading(true);
    try {
      // TODO: Implement Stripe Connect integration
      // This would typically redirect to Stripe Connect flow
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setState(prev => ({ ...prev, stripeConnected: true }));
      toast({
        title: "Stripe Connected",
        description: "Your payment account has been successfully connected.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Stripe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarConnect = async (provider: 'google' | 'outlook') => {
    setLoading(true);
    try {
      // TODO: Implement calendar integration
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setState(prev => ({ ...prev, calendarConnected: true }));
      toast({
        title: "Calendar Connected",
        description: `Your ${provider} calendar has been successfully connected.`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleClient = async () => {
    setLoading(true);
    try {
      // TODO: Implement sample client creation
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setState(prev => ({ ...prev, sampleClientCreated: true }));
      toast({
        title: "Tutorial Complete",
        description: "You've successfully completed the client creation tutorial.",
      });
    } catch (error) {
      toast({
        title: "Tutorial Failed",
        description: "Failed to complete tutorial. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const currentStep = steps[state.currentStep];
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, steps.length - 1),
      completedSteps: new Set([...prev.completedSteps, currentStep.id])
    }));
  };

  const handlePrevious = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0)
    }));
  };

  const canProceed = () => {
    switch (state.currentStep) {
      case 0: // Profile step
        return state.profile.firstName && state.profile.lastName && 
               state.profile.email && state.profile.bio && 
               state.profile.hourlyRate > 0;
      case 1: // Stripe step
        return state.stripeConnected;
      case 2: // Calendar step
        return state.calendarConnected;
      case 3: // Sample client step
        return state.sampleClientCreated;
      default:
        return true;
    }
  };

  const handleComplete = () => {
    toast({
      title: "Onboarding Complete!",
      description: "Welcome to SatyaCoaching. You're ready to start coaching!",
    });
    navigate('/dashboard');
  };

  const isLastStep = state.currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SatyaCoaching</h1>
          <p className="text-gray-600">Let's get you set up to start coaching</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Setup Progress</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex justify-between items-center mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    state.completedSteps.has(step.id)
                      ? 'bg-green-600 text-white'
                      : index === state.currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {state.completedSteps.has(step.id) ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-3 hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-gray-200 mx-4 hidden md:block" />
              )}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <currentStepData.icon className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>{currentStepData.title}</CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CurrentStepComponent />
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={state.currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {isLastStep ? (
            <Button
              onClick={handleComplete}
              disabled={!canProceed()}
              className="bg-green-600 hover:bg-green-700"
            >
              Complete Setup
              <Star className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachOnboardingWizard; 