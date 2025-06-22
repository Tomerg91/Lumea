import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  User, 
  Target, 
  Calendar, 
  BookOpen, 
  ArrowRight, 
  ArrowLeft,
  Heart,
  Star,
  MessageCircle,
  Play,
  Gift,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

interface ClientProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  goals: string[];
  challenges: string[];
  coachingExperience: string;
  preferredCommunication: string[];
  availability: string[];
  motivation: string;
}

interface OnboardingState {
  currentStep: number;
  completedSteps: Set<string>;
  profile: ClientProfile;
  tourCompleted: boolean;
  firstReflectionCompleted: boolean;
  resourcesExplored: boolean;
}

const ClientOnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    completedSteps: new Set(),
    profile: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',  
      goals: [],
      challenges: [],
      coachingExperience: '',
      preferredCommunication: [],
      availability: [],
      motivation: '',
    },
    tourCompleted: false,
    firstReflectionCompleted: false,
    resourcesExplored: false,
  });

  const [loading, setLoading] = useState(false);

  // Welcome & Profile Setup Step
  const WelcomeStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Heart className="mx-auto h-16 w-16 text-pink-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Welcome to Your Coaching Journey!</h2>
        <p className="text-gray-600 mt-2">Let's start by getting to know you better</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">What to Expect:</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Personalized coaching experience tailored to your goals</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Regular reflections to track your progress</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Access to resources and tools for growth</span>
          </li>
          <li className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Ongoing support from your dedicated coach</span>
          </li>
        </ul>
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
        <Label htmlFor="phone">Phone Number (Optional)</Label>
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
    </div>
  );

  // Goals & Motivation Step
  const GoalsStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Target className="mx-auto h-16 w-16 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Your Coaching Goals</h2>
        <p className="text-gray-600 mt-2">Help us understand what you want to achieve</p>
      </div>

      <div>
        <Label>What are your main goals for coaching? (Select all that apply)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          {[
            'Career Growth',
            'Work-Life Balance', 
            'Leadership Skills',
            'Personal Development',
            'Relationship Building',
            'Confidence Building',
            'Stress Management',
            'Goal Achievement',
            'Life Transitions'
          ].map((goal) => (
            <Badge
              key={goal}
              variant={state.profile.goals.includes(goal) ? "default" : "outline"}
              className="cursor-pointer p-3 text-center justify-center h-auto"
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    goals: prev.profile.goals.includes(goal)
                      ? prev.profile.goals.filter(g => g !== goal)
                      : [...prev.profile.goals, goal]
                  }
                }));
              }}
            >
              {goal}  
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>What challenges are you currently facing? (Select all that apply)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          {[
            'Lack of Direction',
            'Time Management',
            'Communication Issues', 
            'Procrastination',
            'Self-Doubt',
            'Burnout',
            'Decision Making',
            'Accountability',
            'Motivation'
          ].map((challenge) => (
            <Badge
              key={challenge}
              variant={state.profile.challenges.includes(challenge) ? "destructive" : "outline"}
              className="cursor-pointer p-3 text-center justify-center h-auto"
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    challenges: prev.profile.challenges.includes(challenge)
                      ? prev.profile.challenges.filter(c => c !== challenge)
                      : [...prev.profile.challenges, challenge]
                  }
                }));
              }}
            >
              {challenge}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="motivation">What motivated you to seek coaching? *</Label>
        <Textarea
          id="motivation"
          value={state.profile.motivation}
          onChange={(e) => setState(prev => ({
            ...prev,
            profile: { ...prev.profile, motivation: e.target.value }
          }))}
          placeholder="Share what inspired you to start this coaching journey..."
          rows={3}
        />
      </div>

      <div>
        <Label>Have you worked with a coach before?</Label>
        <div className="flex gap-3 mt-2">
          {['Never', 'Once or Twice', 'Several Times', 'Regularly'].map((exp) => (
            <Badge
              key={exp}
              variant={state.profile.coachingExperience === exp ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  profile: { ...prev.profile, coachingExperience: exp }
                }));
              }}
            >
              {exp}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  // Platform Tour Step
  const PlatformTourStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Play className="mx-auto h-16 w-16 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Platform Tour</h2>
        <p className="text-gray-600 mt-2">Let's explore your coaching dashboard</p>
      </div>

      {!state.tourCompleted ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <MessageCircle className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">Sessions & Communication</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Schedule sessions, video calls, and messaging with your coach.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Explore Sessions
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <BookOpen className="h-8 w-8 text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">Reflections Journal</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Write reflections, track progress, and document insights.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  View Journal
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <Target className="h-8 w-8 text-orange-600 mb-3" />
                <h3 className="font-semibold mb-2">Goals & Progress</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set milestones, track achievements, and celebrate wins.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Check Progress
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <Gift className="h-8 w-8 text-pink-600 mb-3" />
                <h3 className="font-semibold mb-2">Resources Library</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Access articles, tools, and materials shared by your coach.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Browse Resources
                </Button>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Pro Tip:</strong> Your coach will customize your experience based on your goals. 
              The platform adapts to your coaching style and preferences!
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleCompleteTour}
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Completing Tour...' : 'Complete Platform Tour'}
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Tour Complete!</h3>
          <p className="text-gray-600">You're now familiar with your coaching platform.</p>
        </div>
      )}
    </div>
  );

  // First Reflection Step
  const FirstReflectionStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <BookOpen className="mx-auto h-16 w-16 text-purple-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Your First Reflection</h2>
        <p className="text-gray-600 mt-2">Start your coaching journey with a thoughtful reflection</p>
      </div>

      {!state.firstReflectionCompleted ? (
        <div className="space-y-4">
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-3">Reflection Prompt:</h3>
            <p className="text-gray-700 mb-4">
              "Take a moment to reflect on where you are right now in your life. What brought you to seek coaching, 
              and what does success look like to you over the next 3-6 months?"
            </p>
            
            <div className="space-y-4">
              <Textarea
                placeholder="Write your reflection here..."
                rows={6}
                className="w-full"
              />
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Take your time - there are no wrong answers</span>
                <span>0/500 words</span>
              </div>
            </div>
          </div>

          <Alert>
            <Heart className="h-4 w-4" />
            <AlertDescription>
              <strong>Remember:</strong> Reflections are private and secure. Only you and your coach can see them. 
              This is your safe space for honest self-exploration.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleCompleteFirstReflection}
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Saving Reflection...' : 'Save My First Reflection'}
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Reflection Saved!</h3>
          <p className="text-gray-600">Great start! Your coach will review this before your first session.</p>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800">What's Next:</h4>
            <ul className="text-sm text-green-700 mt-2 space-y-1">
              <li>• Your coach will reach out within 24 hours</li>
              <li>• Schedule your first coaching session</li>
              <li>• Explore resources tailored to your goals</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Basic information',
      icon: User,
      component: WelcomeStep,
    },
    {
      id: 'goals',
      title: 'Goals & Motivation',
      description: 'Your coaching objectives',
      icon: Target,
      component: GoalsStep,
    },
    {
      id: 'tour',
      title: 'Platform Tour',
      description: 'Explore the dashboard',
      icon: Play,
      component: PlatformTourStep,
    },
    {
      id: 'reflection',
      title: 'First Reflection',
      description: 'Start your journey',
      icon: BookOpen,
      component: FirstReflectionStep,
    },
  ];

  const currentStepData = steps[state.currentStep];
  const CurrentStepComponent = currentStepData.component;
  const progress = ((state.currentStep + 1) / steps.length) * 100;

  const handleCompleteTour = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate tour completion
      setState(prev => ({ ...prev, tourCompleted: true }));
      toast({
        title: "Tour Complete",
        description: "You're now ready to start using the platform!",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteFirstReflection = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate saving reflection
      setState(prev => ({ ...prev, firstReflectionCompleted: true }));
      toast({
        title: "Reflection Saved",
        description: "Your first reflection has been saved. Your coach will review it soon!",
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
      case 0: // Welcome step
        return state.profile.firstName && state.profile.lastName && state.profile.email;
      case 1: // Goals step
        return state.profile.goals.length > 0 && 
               state.profile.challenges.length > 0 && 
               state.profile.motivation.trim().length > 0 &&
               state.profile.coachingExperience;
      case 2: // Tour step
        return state.tourCompleted;
      case 3: // Reflection step
        return state.firstReflectionCompleted;
      default:
        return true;
    }
  };

  const handleComplete = () => {
    toast({
      title: "Welcome to Your Coaching Journey!",
      description: "Your onboarding is complete. Let's start achieving your goals!",
    });
    navigate('/client/dashboard');
  };

  const isLastStep = state.currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SatyaCoaching</h1>
          <p className="text-gray-600">Your personalized coaching journey starts here</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Onboarding Progress</span>
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
        <Card className="max-w-2xl mx-auto shadow-lg">
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
              Start Coaching
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

export default ClientOnboardingFlow; 