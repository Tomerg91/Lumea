import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
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
  Heart, 
  Target, 
  Calendar, 
  BookOpen, 
  Star,
  PlayCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MessageCircle,
  Users
} from 'lucide-react';

// Validation schemas for each step
const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  timezone: z.string().min(1, 'Please select your timezone'),
  preferredLanguage: z.enum(['en', 'he']),
});

const goalsSchema = z.object({
  primaryGoals: z.array(z.string()).min(1, 'Please select at least one goal'),
  motivation: z.string().min(20, 'Please tell us more about your motivation (minimum 20 characters)'),
  coachingAreas: z.array(z.string()).min(1, 'Please select at least one area of focus'),
  previousExperience: z.enum(['none', 'some', 'extensive']),
});

const preferencesSchema = z.object({
  sessionFrequency: z.enum(['weekly', 'biweekly', 'monthly']),
  preferredTime: z.enum(['morning', 'afternoon', 'evening']),
  sessionDuration: z.enum(['30', '45', '60', '90']),
  communicationStyle: z.enum(['direct', 'supportive', 'challenging']),
  notificationPreferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;
type GoalsData = z.infer<typeof goalsSchema>;
type PreferencesData = z.infer<typeof preferencesSchema>;

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

const COACHING_GOALS = [
  'Career Development',
  'Work-Life Balance',
  'Personal Growth',
  'Stress Management',
  'Confidence Building',
  'Relationship Improvement',
  'Health & Wellness',
  'Financial Planning',
  'Communication Skills',
  'Leadership Development'
];

const COACHING_AREAS = [
  'Life Coaching',
  'Career Coaching',
  'Health & Wellness',
  'Mindfulness',
  'Business Coaching',
  'Relationship Coaching',
  'Executive Coaching',
  'Financial Coaching',
  'Spiritual Growth',
  'Performance Coaching'
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'Europe/London', label: 'British Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST)' },
  { value: 'Asia/Jerusalem', label: 'Israel Time (IST)' },
  { value: 'Asia/Tokyo', label: 'Japan Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST/AEDT)' },
];

export const ClientOnboardingExperience: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [coachInfo, setCoachInfo] = useState<any>(null);

  // Get coach info from URL params if coming from invitation
  const coachId = searchParams.get('coach');
  const inviteToken = searchParams.get('token');

  // Form instances for each step
  const personalInfoForm = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      timezone: '',
      preferredLanguage: 'en',
    },
  });

  const goalsForm = useForm<GoalsData>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      primaryGoals: [],
      motivation: '',
      coachingAreas: [],
      previousExperience: 'none',
    },
  });

  const preferencesForm = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      sessionFrequency: 'weekly',
      preferredTime: 'morning',
      sessionDuration: '60',
      communicationStyle: 'supportive',
      notificationPreferences: {
        email: true,
        push: true,
        sms: false,
      },
    },
  });

  const steps: OnboardingStep[] = [
    {
      id: 'personal-info',
      title: 'Personal Info',
      description: 'Tell us a bit about yourself',
      icon: <Heart className="w-5 h-5" />,
      completed: completedSteps.includes('personal-info'),
    },
    {
      id: 'goals',
      title: 'Your Goals',
      description: 'What do you want to achieve?',
      icon: <Target className="w-5 h-5" />,
      completed: completedSteps.includes('goals'),
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'How do you prefer to work?',
      icon: <Calendar className="w-5 h-5" />,
      completed: completedSteps.includes('preferences'),
    },
    {
      id: 'welcome',
      title: 'Welcome!',
      description: 'Ready to start your journey',
      icon: <Star className="w-5 h-5" />,
      completed: completedSteps.includes('welcome'),
    },
  ];

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  // Load coach information if coming from invitation
  useEffect(() => {
    if (coachId) {
      loadCoachInfo();
    }
  }, [coachId]);

  const loadCoachInfo = async () => {
    try {
      // TODO: Implement API call to get coach info
      // Mock coach data for now
      setCoachInfo({
        id: coachId,
        firstName: 'Sarah',
        lastName: 'Cohen',
        bio: 'Experienced life coach specializing in personal development and mindfulness.',
        specializations: ['Life Coaching', 'Mindfulness', 'Personal Growth'],
      });
    } catch (error) {
      console.error('Failed to load coach info:', error);
    }
  };

  // Handle personal info step submission
  const handlePersonalInfoSubmit = async (data: PersonalInfoData) => {
    setIsLoading(true);
    try {
      // TODO: Implement profile update API call
      console.log('Updating personal info:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCompletedSteps(prev => [...prev, 'personal-info']);
      toast({
        title: 'Profile Updated',
        description: 'Your personal information has been saved successfully.',
      });
      
      setCurrentStep(1);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle goals step submission
  const handleGoalsSubmit = async (data: GoalsData) => {
    setIsLoading(true);
    try {
      // TODO: Implement goals API call
      console.log('Setting goals:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCompletedSteps(prev => [...prev, 'goals']);
      toast({
        title: 'Goals Set',
        description: 'Your coaching goals have been saved successfully.',
      });
      
      setCurrentStep(2);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save goals. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle preferences step submission
  const handlePreferencesSubmit = async (data: PreferencesData) => {
    setIsLoading(true);
    try {
      // TODO: Implement preferences API call
      console.log('Setting preferences:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCompletedSteps(prev => [...prev, 'preferences']);
      toast({
        title: 'Preferences Saved',
        description: 'Your coaching preferences have been configured.',
      });
      
      setCurrentStep(3);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Complete onboarding
  const handleCompleteOnboarding = () => {
    setCompletedSteps(prev => [...prev, 'welcome']);
    toast({
      title: 'Welcome to SatyaCoaching! 🎉',
      description: 'Your coaching journey begins now!',
    });
    
    setTimeout(() => {
      navigate('/client/dashboard');
    }, 2000);
  };

  // Handle goal toggle
  const handleGoalToggle = (goal: string) => {
    const current = goalsForm.getValues('primaryGoals');
    const updated = current.includes(goal)
      ? current.filter(g => g !== goal)
      : [...current, goal];
    
    goalsForm.setValue('primaryGoals', updated);
  };

  // Handle coaching area toggle
  const handleCoachingAreaToggle = (area: string) => {
    const current = goalsForm.getValues('coachingAreas');
    const updated = current.includes(area)
      ? current.filter(a => a !== area)
      : [...current, area];
    
    goalsForm.setValue('coachingAreas', updated);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Welcome! Let's get to know you
              </CardTitle>
              <CardDescription>
                {coachInfo 
                  ? `${coachInfo.firstName} ${coachInfo.lastName} has invited you to start your coaching journey!`
                  : 'Tell us a bit about yourself to personalize your experience'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coachInfo && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">Your Coach</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {coachInfo.firstName[0]}{coachInfo.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">
                        {coachInfo.firstName} {coachInfo.lastName}
                      </p>
                      <p className="text-sm text-blue-700 mb-2">{coachInfo.bio}</p>
                      <div className="flex flex-wrap gap-1">
                        {coachInfo.specializations?.map((spec: string) => (
                          <Badge key={spec} variant="secondary" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={personalInfoForm.handleSubmit(handlePersonalInfoSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName"
                      {...personalInfoForm.register('firstName')}
                      placeholder="Your first name"
                    />
                    {personalInfoForm.formState.errors.firstName && (
                      <p className="text-sm text-red-500 mt-1">
                        {personalInfoForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName"
                      {...personalInfoForm.register('lastName')}
                      placeholder="Your last name"
                    />
                    {personalInfoForm.formState.errors.lastName && (
                      <p className="text-sm text-red-500 mt-1">
                        {personalInfoForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={personalInfoForm.watch('timezone')} 
                    onValueChange={(value) => personalInfoForm.setValue('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {personalInfoForm.formState.errors.timezone && (
                    <p className="text-sm text-red-500 mt-1">
                      {personalInfoForm.formState.errors.timezone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="preferredLanguage">Preferred Language</Label>
                  <Select 
                    value={personalInfoForm.watch('preferredLanguage')} 
                    onValueChange={(value: 'en' | 'he') => personalInfoForm.setValue('preferredLanguage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your preferred language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="he">עברית (Hebrew)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Continue'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                What are your goals?
              </CardTitle>
              <CardDescription>
                Help us understand what you want to achieve through coaching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={goalsForm.handleSubmit(handleGoalsSubmit)} className="space-y-6">
                <div>
                  <Label>Primary Goals</Label>
                  <p className="text-sm text-gray-600 mb-3">
                    Select the areas where you'd like to see improvement (choose all that apply)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COACHING_GOALS.map((goal) => (
                      <Badge
                        key={goal}
                        variant={goalsForm.watch('primaryGoals').includes(goal) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleGoalToggle(goal)}
                      >
                        {goal}
                      </Badge>
                    ))}
                  </div>
                  {goalsForm.formState.errors.primaryGoals && (
                    <p className="text-sm text-red-500 mt-1">
                      {goalsForm.formState.errors.primaryGoals.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Areas of Focus</Label>
                  <p className="text-sm text-gray-600 mb-3">
                    Which coaching approaches interest you most?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COACHING_AREAS.map((area) => (
                      <Badge
                        key={area}
                        variant={goalsForm.watch('coachingAreas').includes(area) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleCoachingAreaToggle(area)}
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                  {goalsForm.formState.errors.coachingAreas && (
                    <p className="text-sm text-red-500 mt-1">
                      {goalsForm.formState.errors.coachingAreas.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="motivation">What's motivating you to start coaching?</Label>
                  <Textarea 
                    id="motivation"
                    {...goalsForm.register('motivation')}
                    placeholder="Tell us about what's driving you to seek coaching and what you hope to achieve..."
                    className="min-h-32"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {goalsForm.watch('motivation')?.length || 0} characters (minimum 20)
                  </p>
                  {goalsForm.formState.errors.motivation && (
                    <p className="text-sm text-red-500 mt-1">
                      {goalsForm.formState.errors.motivation.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="previousExperience">Previous Coaching Experience</Label>
                  <Select 
                    value={goalsForm.watch('previousExperience')} 
                    onValueChange={(value: 'none' | 'some' | 'extensive') => goalsForm.setValue('previousExperience', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No previous coaching experience</SelectItem>
                      <SelectItem value="some">Some coaching or therapy experience</SelectItem>
                      <SelectItem value="extensive">Extensive coaching experience</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setCurrentStep(0)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Continue'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Your Preferences
              </CardTitle>
              <CardDescription>
                Help us tailor your coaching experience to your preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionFrequency">Session Frequency</Label>
                    <Select 
                      value={preferencesForm.watch('sessionFrequency')} 
                      onValueChange={(value: 'weekly' | 'biweekly' | 'monthly') => preferencesForm.setValue('sessionFrequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How often?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="sessionDuration">Session Duration</Label>
                    <Select 
                      value={preferencesForm.watch('sessionDuration')} 
                      onValueChange={(value: '30' | '45' | '60' | '90') => preferencesForm.setValue('sessionDuration', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How long?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredTime">Preferred Time of Day</Label>
                    <Select 
                      value={preferencesForm.watch('preferredTime')} 
                      onValueChange={(value: 'morning' | 'afternoon' | 'evening') => preferencesForm.setValue('preferredTime', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Best time?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12 PM - 6 PM)</SelectItem>
                        <SelectItem value="evening">Evening (6 PM - 9 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="communicationStyle">Communication Style</Label>
                    <Select 
                      value={preferencesForm.watch('communicationStyle')} 
                      onValueChange={(value: 'direct' | 'supportive' | 'challenging') => preferencesForm.setValue('communicationStyle', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Your style?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supportive">Supportive & Gentle</SelectItem>
                        <SelectItem value="direct">Direct & Clear</SelectItem>
                        <SelectItem value="challenging">Challenging & Growth-Focused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Notification Preferences</Label>
                  <p className="text-sm text-gray-600 mb-3">
                    How would you like to receive updates and reminders?
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="email-notifications"
                        checked={preferencesForm.watch('notificationPreferences.email')}
                        onChange={(e) => preferencesForm.setValue('notificationPreferences.email', e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="email-notifications" className="text-sm">
                        Email notifications
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="push-notifications"
                        checked={preferencesForm.watch('notificationPreferences.push')}
                        onChange={(e) => preferencesForm.setValue('notificationPreferences.push', e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="push-notifications" className="text-sm">
                        Push notifications
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="sms-notifications"
                        checked={preferencesForm.watch('notificationPreferences.sms')}
                        onChange={(e) => preferencesForm.setValue('notificationPreferences.sms', e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="sms-notifications" className="text-sm">
                        SMS notifications
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setCurrentStep(1)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Continue'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Welcome to Your Coaching Journey!
              </CardTitle>
              <CardDescription>
                You're all set up and ready to start
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Congratulations! 🎉</h3>
                <p className="text-gray-600 mb-6">
                  Your profile is complete and you're ready to begin your coaching journey.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" />
                    What happens next?
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• You can now schedule your first session with your coach</li>
                    <li>• Explore the resources library for helpful materials</li>
                    <li>• Start reflecting on your goals and progress</li>
                    <li>• Your coach will reach out to you soon</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/client/resources')}
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Browse Resources
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/client/sessions')}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule Session
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                <Button onClick={handleCompleteOnboarding} size="lg">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Enter Your Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // Redirect if not a client
  if (profile?.role !== 'client') {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to SatyaCoaching!
          </h1>
          <p className="text-gray-600 mb-6">
            Let's personalize your coaching experience
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Progress</span>
              <span className="text-sm font-medium text-gray-700">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center space-x-4 mb-8">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col items-center space-y-2 ${
                  index <= currentStep ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.completed
                      ? 'bg-green-600 text-white'
                      : index === currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className="text-xs font-medium text-center max-w-20">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex justify-center">
          {renderStepContent()}
        </div>

        {/* Completion Message */}
        {completedSteps.length === steps.length && (
          <div className="text-center mt-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                Welcome aboard! 🎉
              </h2>
              <p className="text-green-700">
                Your coaching journey is about to begin. 
                You'll be redirected to your dashboard shortly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 