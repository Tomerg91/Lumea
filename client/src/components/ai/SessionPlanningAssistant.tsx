import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import aiService, { SessionSuggestion } from '../../services/aiService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/use-toast';
import {
  MessageSquare,
  Lightbulb,
  Target,
  BookOpen,
  Calendar,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Send,
  Sparkles
} from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  recentSessions?: string[];
  recentReflections?: string[];
  coachNotes?: string[];
  goals?: string[];
}

interface SessionPlan {
  id: string;
  title: string;
  description: string;
  duration: number;
  structure: {
    phase: string;
    duration: number;
    activities: string[];
  }[];
  resources: string[];
  objectives: string[];
  notes: string;
  createdAt: Date;
}

export const SessionPlanningAssistant: React.FC = () => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  
  const [suggestions, setSuggestions] = useState<SessionSuggestion[]>([]);
  const [sessionPlans, setSessionPlans] = useState<SessionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [sessionContext, setSessionContext] = useState('');
  const [sessionDuration, setSessionDuration] = useState('60');
  const [sessionType, setSessionType] = useState('coaching');
  const [customPrompt, setCustomPrompt] = useState('');

  // Mock client data
  const mockClients: ClientData[] = [
    {
      id: '1',
      name: 'Sarah M.',
      recentSessions: [
        'Goal setting and action planning session',
        'Exploring career transition challenges',
        'Building confidence and self-awareness'
      ],
      recentReflections: [
        'Feeling more clarity about my career direction',
        'Struggling with imposter syndrome but making progress',
        'Grateful for the tools and insights from coaching'
      ],
      coachNotes: [
        'Client shows strong motivation and growth mindset',
        'Focus areas: confidence building, career clarity',
        'Responds well to visualization and action-oriented exercises'
      ],
      goals: [
        'Transition to a leadership role within 6 months',
        'Build confidence in public speaking',
        'Develop better work-life balance'
      ]
    },
    {
      id: '2',
      name: 'David K.',
      recentSessions: [
        'Work-life balance and stress management',
        'Team leadership challenges discussion',
        'Personal values alignment session'
      ],
      recentReflections: [
        'Learning to set better boundaries at work',
        'Feeling more empowered to lead my team',
        'Recognizing the importance of self-care'
      ],
      coachNotes: [
        'High-achiever with tendency to overwork',
        'Strong analytical skills, responds to structured approaches',
        'Working on delegation and trust in team members'
      ],
      goals: [
        'Reduce overtime by 50% within 3 months',
        'Improve team communication and delegation',
        'Establish consistent self-care routines'
      ]
    }
  ];

  useEffect(() => {
    checkConsentAndLoadData();
  }, [profile?.id]);

  const checkConsentAndLoadData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      // Check if user has consented to session planning
      const consent = await aiService.checkConsent(profile.id as string, 'session_planning');
      setHasConsent(consent);

      if (consent) {
        await loadExistingPlans();
      }
    } catch (error) {
      console.error('Failed to check consent or load data:', error);
      toast({
        title: 'Error Loading Assistant',
        description: 'Failed to load session planning assistant.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingPlans = async () => {
    // Mock session plans
    const mockPlans: SessionPlan[] = [
      {
        id: '1',
        title: 'Career Transition Focus Session',
        description: 'Session focused on exploring career transition goals and building action plan',
        duration: 60,
        structure: [
          {
            phase: 'Check-in & Review',
            duration: 10,
            activities: ['Review previous session outcomes', 'Current state assessment']
          },
          {
            phase: 'Core Work',
            duration: 40,
            activities: ['Career vision clarification', 'Obstacle identification', 'Action planning']
          },
          {
            phase: 'Integration & Next Steps',
            duration: 10,
            activities: ['Key insights summary', 'Commitment to specific actions']
          }
        ],
        resources: ['Career transition worksheet', 'Values assessment tool'],
        objectives: ['Clarify career direction', 'Identify 3 concrete next steps', 'Address limiting beliefs'],
        notes: 'Focus on building confidence and addressing imposter syndrome',
        createdAt: new Date()
      }
    ];

    setSessionPlans(mockPlans);
  };

  const generateSessionSuggestions = async () => {
    if (!profile?.id || !hasConsent || !selectedClient) {
      toast({
        title: 'Missing Requirements',
        description: 'Please select a client and ensure AI features are enabled.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);

      const context = {
        previousSessions: selectedClient.recentSessions,
        recentReflections: selectedClient.recentReflections,
        coachNotes: selectedClient.coachNotes,
        clientGoals: selectedClient.goals
      };

      const generatedSuggestions = await aiService.generateSessionSuggestions(
        profile.id as string,
        selectedClient.id,
        context
      );

      setSuggestions(generatedSuggestions);

      toast({
        title: 'Suggestions Generated',
        description: `Generated ${generatedSuggestions.length} session planning suggestions.`,
      });
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate session suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const acceptSuggestion = async (suggestion: SessionSuggestion) => {
    // In a real implementation, this would save to database
    toast({
      title: 'Suggestion Accepted',
      description: 'The suggestion has been added to your session plan.',
    });
  };

  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    toast({
      title: 'Suggestion Dismissed',
      description: 'The suggestion has been removed.',
    });
  };

  const generateFullSessionPlan = async () => {
    if (!selectedClient) return;

    // Mock session plan generation
    const newPlan: SessionPlan = {
      id: Date.now().toString(),
      title: `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session for ${selectedClient.name}`,
      description: customPrompt || `${sessionDuration}-minute ${sessionType} session with focus on current goals and challenges`,
      duration: parseInt(sessionDuration),
      structure: [
        {
          phase: 'Opening & Check-in',
          duration: Math.round(parseInt(sessionDuration) * 0.15),
          activities: ['Welcome and grounding', 'Review previous session', 'Set session intention']
        },
        {
          phase: 'Core Exploration',
          duration: Math.round(parseInt(sessionDuration) * 0.6),
          activities: ['Explore current situation', 'Identify patterns and insights', 'Work on specific goals']
        },
        {
          phase: 'Integration & Closure',
          duration: Math.round(parseInt(sessionDuration) * 0.25),
          activities: ['Summarize key insights', 'Plan next steps', 'Schedule follow-up']
        }
      ],
      resources: ['Session notes template', 'Goal tracking worksheet'],
      objectives: ['Address current challenges', 'Make progress on stated goals', 'Provide actionable insights'],
      notes: customPrompt || sessionContext,
      createdAt: new Date()
    };

    setSessionPlans(prev => [newPlan, ...prev]);
    
    toast({
      title: 'Session Plan Created',
      description: 'Your complete session plan has been generated.',
    });
  };

  const enableConsentAndRetry = async () => {
    if (!profile?.id) return;

    try {
      await aiService.updateConsent(profile.id as string, 'session_planning', true);
      setHasConsent(true);
      await loadExistingPlans();
      
      toast({
        title: 'Session Planning Enabled',
        description: 'AI session planning has been enabled.',
      });
    } catch (error) {
      console.error('Failed to enable consent:', error);
      toast({
        title: 'Failed to Enable',
        description: 'Failed to enable session planning. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'template': return <BookOpen className="w-4 h-4" />;
      case 'resource': return <Star className="w-4 h-4" />;
      case 'goal': return <Target className="w-4 h-4" />;
      case 'activity': return <Lightbulb className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Session Planning Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasConsent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Session Planning Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI-powered session planning is not enabled. Enable this feature to get personalized session 
              preparation suggestions, template recommendations, and goal-setting assistance.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col gap-3">
            <h4 className="font-medium">What you'll get:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Personalized session recommendations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Template and resource suggestions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Goal-setting assistance
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Session preparation time savings
              </li>
            </ul>
            
            <Button onClick={enableConsentAndRetry} className="w-fit">
              Enable Session Planning
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Planning Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Plan Your Next Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-select">Select Client</Label>
              <Select value={selectedClient?.id || ''} onValueChange={(value) => {
                const client = mockClients.find(c => c.id === value);
                setSelectedClient(client || null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {mockClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {client.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-type">Session Type</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coaching">Coaching Session</SelectItem>
                  <SelectItem value="goal-setting">Goal Setting</SelectItem>
                  <SelectItem value="problem-solving">Problem Solving</SelectItem>
                  <SelectItem value="reflection">Reflection</SelectItem>
                  <SelectItem value="action-planning">Action Planning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={sessionDuration} onValueChange={setSessionDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Session Context</Label>
              <Input
                id="context"
                placeholder="e.g., Follow-up on career goals"
                value={sessionContext}
                onChange={(e) => setSessionContext(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-prompt">Custom Instructions (Optional)</Label>
            <Textarea
              id="custom-prompt"
              placeholder="Any specific focus areas, challenges to address, or session goals..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generateSessionSuggestions}
              disabled={!selectedClient || generating}
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lightbulb className="w-4 h-4 mr-2" />
              )}
              Get AI Suggestions
            </Button>
            
            <Button 
              variant="outline"
              onClick={generateFullSessionPlan}
              disabled={!selectedClient}
            >
              <Send className="w-4 h-4 mr-2" />
              Generate Full Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client Context */}
      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Client Context: {selectedClient.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="goals" className="space-y-4">
              <TabsList>
                <TabsTrigger value="goals">Goals</TabsTrigger>
                <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
                <TabsTrigger value="reflections">Reflections</TabsTrigger>
                <TabsTrigger value="notes">Coach Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="goals" className="space-y-2">
                {selectedClient.goals?.map((goal, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{goal}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="sessions" className="space-y-2">
                {selectedClient.recentSessions?.map((session, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{session}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="reflections" className="space-y-2">
                {selectedClient.recentReflections?.map((reflection, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">{reflection}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="notes" className="space-y-2">
                {selectedClient.coachNotes?.map((note, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                    <BookOpen className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">{note}</span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className={`p-4 ${getPriorityColor(suggestion.priority)}`}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSuggestionIcon(suggestion.type)}
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type}
                      </Badge>
                      <Badge variant={suggestion.priority === 'high' ? 'destructive' : suggestion.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                        {suggestion.priority} priority
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => acceptSuggestion(suggestion)}>
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => dismissSuggestion(suggestion.id)}>
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    <p className="text-sm text-gray-700 mt-1">{suggestion.description}</p>
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    <strong>Reasoning:</strong> {suggestion.reasoning}
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Generated Session Plans */}
      {sessionPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Session Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionPlans.map((plan) => (
              <Card key={plan.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{plan.title}</h3>
                    <Badge variant="outline">{plan.duration} min</Badge>
                  </div>
                  
                  <p className="text-sm text-gray-700">{plan.description}</p>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Session Structure:</h4>
                    {plan.structure.map((phase, index) => (
                      <div key={index} className="pl-4 border-l-2 border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{phase.phase}</span>
                          <span className="text-xs text-gray-600">{phase.duration} min</span>
                        </div>
                        <ul className="text-xs text-gray-600 mt-1">
                          {phase.activities.map((activity, idx) => (
                            <li key={idx}>• {activity}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium">Objectives:</h4>
                      <ul className="text-gray-600 mt-1">
                        {plan.objectives.map((obj, idx) => (
                          <li key={idx}>• {obj}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium">Resources:</h4>
                      <ul className="text-gray-600 mt-1">
                        {plan.resources.map((resource, idx) => (
                          <li key={idx}>• {resource}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {plan.createdAt.toLocaleDateString()}
                    </p>
                    <Button size="sm" variant="outline">
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Plan
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionPlanningAssistant; 