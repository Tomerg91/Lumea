import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CheckCircle, Circle, ArrowRight, ArrowLeft, User, Target, Heart, Sparkles, Calendar, MessageSquare } from 'lucide-react';
import { toast } from '../ui/use-toast';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface ClientProfile {
  firstName: string;
  lastName: string;
  age: string;
  bio: string;
  goals: string;
  challenges: string;
  expectations: string;
  preferredContactMethod: string;
  availabilityPreference: string;
}

interface Coach {
  id: string;
  name: string;
  bio: string;
  specialties: string[];
  experience: string;
  hourlyRate: number;
  rating: number;
  totalSessions: number;
}

export default function ClientOnboardingWizard() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [profile, setProfile] = useState<ClientProfile>({
    firstName: user?.user_metadata?.first_name || user?.user_metadata?.name?.split(' ')[0] || '',
    lastName: user?.user_metadata?.last_name || user?.user_metadata?.name?.split(' ')[1] || '',
    age: '',
    bio: '',
    goals: '',
    challenges: '',
    expectations: '',
    preferredContactMethod: 'email',
    availabilityPreference: 'weekdays'
  });

  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([]);
  const [goalSettingComplete, setGoalSettingComplete] = useState(false);
  const [firstReflectionComplete, setFirstReflectionComplete] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'profile',
      title: 'Tell Us About Yourself',
      description: 'Help us understand who you are and what you hope to achieve',
      icon: <User className="w-5 h-5" />,
      completed: Boolean(profile.bio && profile.goals && profile.challenges)
    },
    {
      id: 'coach',
      title: 'Choose Your Coach',
      description: 'Find the perfect coach for your journey',
      icon: <Heart className="w-5 h-5" />,
      completed: Boolean(selectedCoach)
    },
    {
      id: 'goals',
      title: 'Set Your Goals',
      description: 'Define what success looks like for you',
      icon: <Target className="w-5 h-5" />,
      completed: goalSettingComplete
    },
    {
      id: 'reflection',
      title: 'First Reflection',
      description: 'Start your coaching journey with your first reflection',
      icon: <MessageSquare className="w-5 h-5" />,
      completed: firstReflectionComplete
    }
  ];

  const progress = ((steps.filter(s => s.completed).length) / steps.length) * 100;

  // Load available coaches
  useEffect(() => {
    fetchAvailableCoaches();
  }, []);

  const fetchAvailableCoaches = async () => {
    try {
      const response = await fetch('/api/coaches/available', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const coaches = await response.json();
        setAvailableCoaches(coaches);
      }
    } catch (error) {
      console.error('Failed to fetch coaches:', error);
    }
  };

  const handleProfileSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          age: parseInt(profile.age),
          bio: profile.bio,
          goals: profile.goals,
          challenges: profile.challenges,
          expectations: profile.expectations,
          preferredContactMethod: profile.preferredContactMethod,
          availabilityPreference: profile.availabilityPreference,
          onboardingCompleted: false
        })
      });

      if (response.ok) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated."
        });
        setCurrentStep(1);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleCoachSelection = async (coach: Coach) => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients/select-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          coachId: coach.id
        })
      });

      if (response.ok) {
        setSelectedCoach(coach);
        toast({
          title: "Coach Selected",
          description: `${coach.name} is now your coach! They will reach out to you soon.`
        });
        setCurrentStep(2);
      } else {
        throw new Error('Failed to select coach');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to select coach. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleGoalSetting = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          goals: profile.goals.split('\n').filter(g => g.trim()),
          challenges: profile.challenges.split('\n').filter(c => c.trim()),
          expectations: profile.expectations
        })
      });

      if (response.ok) {
        setGoalSettingComplete(true);
        toast({
          title: "Goals Set",
          description: "Your coaching goals have been saved successfully."
        });
        setCurrentStep(3);
      } else {
        throw new Error('Failed to save goals');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save goals. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleFirstReflection = async (reflection: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/reflections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: reflection,
          type: 'text',
          isFirstReflection: true
        })
      });

      if (response.ok) {
        setFirstReflectionComplete(true);
        toast({
          title: "First Reflection Saved",
          description: "Your reflection has been saved. Your coach will review it soon."
        });
      } else {
        throw new Error('Failed to save reflection');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save reflection. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/complete-onboarding', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "Welcome to SatyaCoaching!",
          description: "Your client account is now fully set up. Your coaching journey begins now!",
        });
        navigate('/dashboard');
      } else {
        throw new Error('Failed to complete onboarding');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Profile Setup
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Tell Us About Yourself</h2>
              <p className="text-muted-foreground">Help us understand your background and what you hope to achieve</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                  placeholder="Your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({...profile, age: e.target.value})}
                  placeholder="Your age"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactMethod">Preferred Contact Method</Label>
                <Select value={profile.preferredContactMethod} onValueChange={(value) => setProfile({...profile, preferredContactMethod: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="video">Video Call</SelectItem>
                    <SelectItem value="messaging">In-App Messaging</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">About You</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile({...profile, bio: e.target.value})}
                placeholder="Tell us about yourself, your background, interests, and current situation..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">What are your main goals?</Label>
              <Textarea
                id="goals"
                value={profile.goals}
                onChange={(e) => setProfile({...profile, goals: e.target.value})}
                placeholder="List your main goals - one per line. For example:&#10;• Improve work-life balance&#10;• Build confidence in leadership&#10;• Develop better communication skills"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="challenges">What challenges are you facing?</Label>
              <Textarea
                id="challenges"
                value={profile.challenges}
                onChange={(e) => setProfile({...profile, challenges: e.target.value})}
                placeholder="What obstacles or challenges would you like help overcoming?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectations">What do you expect from coaching?</Label>
              <Textarea
                id="expectations"
                value={profile.expectations}
                onChange={(e) => setProfile({...profile, expectations: e.target.value})}
                placeholder="What are your expectations for the coaching relationship and process?"
                rows={3}
              />
            </div>
          </div>
        );

      case 1: // Coach Selection
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Choose Your Coach</h2>
              <p className="text-muted-foreground">Find the perfect coach for your journey</p>
            </div>

            <div className="grid gap-4">
              {availableCoaches.map((coach) => (
                <Card key={coach.id} className={`cursor-pointer transition-all ${selectedCoach?.id === coach.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{coach.name}</h3>
                        <p className="text-sm text-muted-foreground">{coach.experience} experience</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${coach.hourlyRate}/session</div>
                        <div className="text-sm text-muted-foreground">
                          ⭐ {coach.rating} ({coach.totalSessions} sessions)
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-3">{coach.bio}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {coach.specialties.map((specialty, index) => (
                        <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                          {specialty}
                        </span>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={() => handleCoachSelection(coach)}
                      disabled={loading}
                      className="w-full"
                      variant={selectedCoach?.id === coach.id ? "default" : "outline"}
                    >
                      {loading ? 'Selecting...' : selectedCoach?.id === coach.id ? 'Selected' : 'Choose This Coach'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {availableCoaches.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading available coaches...</p>
              </div>
            )}
          </div>
        );

      case 2: // Goal Setting
        return (
          <div className="space-y-6 text-center">
            <Target className="w-16 h-16 text-primary mx-auto" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Set Your Goals</h2>
              <p className="text-muted-foreground mb-6">
                Let's refine your goals with your selected coach: {selectedCoach?.name}
              </p>
            </div>

            <div className="bg-muted/50 p-6 rounded-lg space-y-4 text-left">
              <h3 className="font-semibold mb-4">Your Current Goals:</h3>
              <div className="space-y-2">
                {profile.goals.split('\n').filter(g => g.trim()).map((goal, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{goal.replace(/^[•\-*]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-600 space-y-1 text-left">
                <li>• Your coach will review your goals and challenges</li>
                <li>• They'll create a personalized coaching plan</li>
                <li>• You'll work together to refine and achieve your goals</li>
                <li>• Regular check-ins will track your progress</li>
              </ul>
            </div>

            <Button onClick={handleGoalSetting} disabled={loading} size="lg">
              {loading ? 'Saving Goals...' : 'Confirm Goals & Continue'}
            </Button>
          </div>
        );

      case 3: // First Reflection
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Your First Reflection</h2>
              <p className="text-muted-foreground">Start your coaching journey by sharing your thoughts</p>
            </div>

            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">Reflection Prompts</h3>
              <ul className="space-y-2 text-sm">
                <li>• What brought you to seek coaching at this point in your life?</li>
                <li>• What would success look like for you in 3-6 months?</li>
                <li>• What's one thing you're excited about in this coaching journey?</li>
                <li>• What's one thing you're nervous or uncertain about?</li>
              </ul>
            </div>

            <ReflectionForm onSubmit={handleFirstReflection} loading={loading} />
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return profile.bio && profile.goals && profile.challenges && profile.firstName && profile.lastName;
      case 1:
        return selectedCoach !== null;
      case 2:
        return goalSettingComplete;
      case 3:
        return firstReflectionComplete;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Your Coaching Journey!</h1>
          <p className="text-gray-600">Let's get you set up for success in just a few steps</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-700">Setup Progress</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                index === currentStep 
                  ? 'border-primary bg-primary/5' 
                  : step.completed
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                {step.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : index === currentStep ? (
                  <Circle className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {step.icon}
                    <h3 className="font-medium text-sm">{step.title}</h3>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
          <CardFooter className="flex justify-between p-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex space-x-2">
              {currentStep < steps.length - 1 && (
                <Button
                  onClick={() => {
                    if (currentStep === 0) {
                      handleProfileSubmit();
                    } else if (currentStep === 2) {
                      handleGoalSetting();
                    } else {
                      setCurrentStep(currentStep + 1);
                    }
                  }}
                  disabled={!canProceed() || loading}
                >
                  {loading ? 'Processing...' : 'Next Step'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {currentStep === steps.length - 1 && firstReflectionComplete && (
                <Button
                  onClick={handleCompleteOnboarding}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Finishing...' : 'Complete Setup'}
                  <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700"
          >
            Skip setup and explore the platform
          </Button>
        </div>
      </div>
    </div>
  );
}

// Reflection Form Component
interface ReflectionFormProps {
  onSubmit: (reflection: string) => void;
  loading: boolean;
}

function ReflectionForm({ onSubmit, loading }: ReflectionFormProps) {
  const [reflection, setReflection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reflection.trim()) {
      onSubmit(reflection);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reflection">Your Reflection</Label>
        <Textarea
          id="reflection"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Take a moment to reflect on the prompts above. Share whatever feels meaningful to you - there are no wrong answers..."
          rows={6}
          className="min-h-[150px]"
        />
      </div>
      
      <Button type="submit" disabled={!reflection.trim() || loading} className="w-full">
        {loading ? 'Saving Reflection...' : 'Save My First Reflection'}
      </Button>
    </form>
  );
} 