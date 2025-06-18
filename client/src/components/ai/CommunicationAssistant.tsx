import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import aiService from '../../services/aiService';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  MessageSquare, 
  Lightbulb, 
  BarChart3, 
  RefreshCw,
  Send,
  Copy,
  CheckCircle,
  AlertCircle,
  Heart,
  Brain,
  TrendingUp,
  Users,
  Clock,
  ThumbsUp
} from 'lucide-react';

interface MessageSuggestion {
  id: string;
  type: 'empathetic' | 'motivational' | 'clarifying' | 'celebratory' | 'supportive';
  content: string;
  context: string;
  confidence: number;
  tone: 'warm' | 'professional' | 'encouraging' | 'neutral';
}

interface CommunicationAnalysis {
  totalMessages: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  toneAnalysis: {
    empathy: number;
    clarity: number;
    engagement: number;
    professionalism: number;
  };
  commonPhrases: string[];
  improvementSuggestions: string[];
  responseTimeAverage: number;
  clientEngagementScore: number;
}

const messageTypes = [
  { value: 'empathetic', label: 'Empathetic Response', description: 'Show understanding and validation' },
  { value: 'motivational', label: 'Motivational Message', description: 'Inspire and encourage action' },
  { value: 'clarifying', label: 'Clarifying Question', description: 'Gather more information or understanding' },
  { value: 'celebratory', label: 'Celebration Note', description: 'Acknowledge achievements and progress' },
  { value: 'supportive', label: 'Supportive Check-in', description: 'Offer support during challenges' }
];

const toneOptions = [
  { value: 'warm', label: 'Warm & Personal' },
  { value: 'professional', label: 'Professional & Clear' },
  { value: 'encouraging', label: 'Encouraging & Uplifting' },
  { value: 'neutral', label: 'Neutral & Balanced' }
];

export const CommunicationAssistant: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [hasConsent, setHasConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Message composition state
  const [messageContext, setMessageContext] = useState('');
  const [messageType, setMessageType] = useState<MessageSuggestion['type']>('empathetic');
  const [preferredTone, setPreferredTone] = useState<MessageSuggestion['tone']>('warm');
  const [clientName, setClientName] = useState('');
  const [suggestions, setSuggestions] = useState<MessageSuggestion[]>([]);
  
  // Analysis state
  const [analysis, setAnalysis] = useState<CommunicationAnalysis | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      checkConsentAndLoadData();
    }
  }, [profile?.id]);

  const checkConsentAndLoadData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const consent = await aiService.checkConsent(profile.id as string, 'communication');
      setHasConsent(consent);

      if (consent) {
        await loadCommunicationAnalysis();
      }
    } catch (error) {
      console.error('Failed to check consent or load data:', error);
      toast({
        title: 'Error Loading Communication Assistant',
        description: 'Failed to load communication analysis.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCommunicationAnalysis = async () => {
    // Load communication analysis from database
    // For now, we'll create mock analysis data
    const mockAnalysis: CommunicationAnalysis = {
      totalMessages: 247,
      sentimentDistribution: {
        positive: 73,
        neutral: 22,
        negative: 5
      },
      toneAnalysis: {
        empathy: 85,
        clarity: 78,
        engagement: 82,
        professionalism: 91
      },
      commonPhrases: [
        "I understand how you're feeling",
        "That's a great insight",
        "Let's explore this together",
        "You're making wonderful progress",
        "What does that mean to you?"
      ],
      improvementSuggestions: [
        "Consider asking more open-ended questions to encourage deeper reflection",
        "Use more specific acknowledgments of client achievements",
        "Incorporate more future-focused language to maintain momentum"
      ],
      responseTimeAverage: 4.2, // hours
      clientEngagementScore: 87
    };

    setAnalysis(mockAnalysis);
  };

  const generateMessageSuggestions = async () => {
    if (!profile?.id || !messageContext) {
      toast({
        title: 'Missing Information',
        description: 'Please provide context for the message.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);

      // Mock AI-generated suggestions
      const mockSuggestions: MessageSuggestion[] = [
        {
          id: '1',
          type: messageType,
          content: `Hi ${clientName || '[Client Name]'}, I've been reflecting on what you shared about ${messageContext.toLowerCase()}. Your awareness around this shows real growth, and I'm curious to hear more about how this insight might influence your next steps. What feels most important to explore when we connect next?`,
          context: messageContext,
          confidence: 0.92,
          tone: preferredTone
        },
        {
          id: '2',
          type: messageType,
          content: `${clientName || '[Client Name]'}, thank you for sharing your thoughts about ${messageContext.toLowerCase()}. I really appreciate your openness. As you've been processing this, what have you noticed about yourself that feels significant? I'm looking forward to diving deeper into this together.`,
          context: messageContext,
          confidence: 0.87,
          tone: preferredTone
        },
        {
          id: '3',
          type: messageType,
          content: `I wanted to check in about what you mentioned regarding ${messageContext.toLowerCase()}. Your perspective on this really resonated with me. How are you feeling about it now? Sometimes sitting with these insights can reveal new layers of understanding.`,
          context: messageContext,
          confidence: 0.84,
          tone: preferredTone
        }
      ];

      setSuggestions(mockSuggestions);

      toast({
        title: 'Suggestions Generated',
        description: `Generated ${mockSuggestions.length} message suggestions.`,
      });
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate message suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      
      toast({
        title: 'Copied!',
        description: 'Message copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy message to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const refreshAnalysis = async () => {
    setAnalyzing(true);
    await loadCommunicationAnalysis();
    setAnalyzing(false);
    
    toast({
      title: 'Analysis Updated',
      description: 'Communication analysis has been refreshed.',
    });
  };

  const enableConsentAndRetry = async () => {
    if (!profile?.id) return;

    try {
      await aiService.updateConsent(profile.id as string, 'communication', true);
      setHasConsent(true);
      await loadCommunicationAnalysis();
      
      toast({
        title: 'Communication Assistant Enabled',
        description: 'AI communication assistance has been enabled.',
      });
    } catch (error) {
      console.error('Failed to enable consent:', error);
      toast({
        title: 'Failed to Enable',
        description: 'Failed to enable communication assistance. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'empathetic': return <Heart className="w-4 h-4" />;
      case 'motivational': return <TrendingUp className="w-4 h-4" />;
      case 'clarifying': return <MessageSquare className="w-4 h-4" />;
      case 'celebratory': return <ThumbsUp className="w-4 h-4" />;
      case 'supportive': return <Users className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.8) return 'text-blue-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Communication Assistant
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
            Communication Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI-powered communication assistance is not enabled. Enable this feature to get help crafting 
              empathetic messages, analyzing communication patterns, and improving client interactions.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col gap-3">
            <h4 className="font-medium">What you'll get:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                AI-powered message suggestions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Communication pattern analysis
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Tone and empathy optimization
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Client engagement insights
              </li>
            </ul>
            
            <Button onClick={enableConsentAndRetry} className="w-fit">
              Enable Communication Assistant
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Communication Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Brain className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI Communication Features</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Advanced AI-powered communication tools to help you craft better messages, 
              analyze interaction patterns, and improve client engagement.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Message Composer
                </h4>
                <p className="text-sm text-gray-600">AI-generated message suggestions based on context and tone preferences.</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Communication Analytics
                </h4>
                <p className="text-sm text-gray-600">Analyze sentiment, tone quality, and engagement patterns.</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Empathy Enhancement
                </h4>
                <p className="text-sm text-gray-600">Suggestions to improve empathy and emotional connection in messages.</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Response Optimization
                </h4>
                <p className="text-sm text-gray-600">Learn optimal timing and style for better client engagement.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 