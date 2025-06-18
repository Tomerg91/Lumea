import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import aiService, { AIConsent } from '../../services/aiService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { useToast } from '../ui/use-toast';
import {
  Shield,
  Brain,
  MessageSquare,
  BarChart3,
  Zap,
  Info,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock
} from 'lucide-react';

interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
  dataUsage: string;
  privacy: string;
  enabled: boolean;
}

const AI_FEATURES: AIFeature[] = [
  {
    id: 'reflection_insights',
    name: 'Reflection Insights',
    description: 'AI analyzes client reflections to provide sentiment analysis, mood tracking, and coaching insights.',
    icon: <Brain className="w-5 h-5" />,
    benefits: [
      'Understand client emotional patterns',
      'Identify coaching opportunities',
      'Track mood and progress trends',
      'Personalized coaching suggestions'
    ],
    dataUsage: 'Reflection text content is analyzed using secure AI services',
    privacy: 'Data is encrypted in transit and processed with anonymization where possible',
    enabled: false
  },
  {
    id: 'session_planning',
    name: 'Session Planning Assistant',
    description: 'AI helps prepare effective sessions based on client history and coaching patterns.',
    icon: <MessageSquare className="w-5 h-5" />,
    benefits: [
      'Personalized session recommendations',
      'Template and resource suggestions',
      'Goal-setting assistance',
      'Preparation time savings'
    ],
    dataUsage: 'Previous session notes, reflections, and coach notes provide context',
    privacy: 'Only necessary context is shared, with client consent and data minimization',
    enabled: false
  },
  {
    id: 'analytics',
    name: 'Advanced Analytics',
    description: 'AI-powered insights into coaching effectiveness and client progress patterns.',
    icon: <BarChart3 className="w-5 h-5" />,
    benefits: [
      'Coaching effectiveness insights',
      'Client progress visualization',
      'Engagement pattern analysis',
      'Outcome predictions'
    ],
    dataUsage: 'Anonymized session and reflection data for pattern analysis',
    privacy: 'All analytics use aggregated, anonymized data with no personal identifiers',
    enabled: false
  },
  {
    id: 'automation',
    name: 'Smart Automation',
    description: 'AI-driven workflows for reminders, follow-ups, and resource recommendations.',
    icon: <Zap className="w-5 h-5" />,
    benefits: [
      'Automated follow-up reminders',
      'Smart resource suggestions',
      'Milestone detection and celebration',
      'Optimized communication timing'
    ],
    dataUsage: 'Session outcomes and client preferences guide automation decisions',
    privacy: 'Automation rules are stored locally with encrypted triggers',
    enabled: false
  },
  {
    id: 'communication',
    name: 'Communication Intelligence',
    description: 'AI enhances messaging with tone analysis and personalization suggestions.',
    icon: <MessageSquare className="w-5 h-5" />,
    benefits: [
      'Message tone optimization',
      'Personalized templates',
      'Communication timing suggestions',
      'Multi-language support'
    ],
    dataUsage: 'Message content analyzed for tone and effectiveness',
    privacy: 'Analysis happens client-side where possible, with opt-in cloud processing',
    enabled: false
  }
];

export const AIPrivacyControls: React.FC = () => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  
  const [features, setFeatures] = useState<AIFeature[]>(AI_FEATURES);
  const [consents, setConsents] = useState<AIConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [aiEnabled, setAIEnabled] = useState(false);

  // Load current consents and AI status
  useEffect(() => {
    loadConsents();
    checkAIStatus();
  }, [profile?.id]);

  const loadConsents = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const userConsents = await aiService.getAllConsents(profile.id as string);
      setConsents(userConsents);

      // Update features with current consent status
      setFeatures(prev => prev.map(feature => ({
        ...feature,
        enabled: userConsents.find(c => c.featureType === feature.id)?.consented || false
      })));
    } catch (error) {
      console.error('Failed to load AI consents:', error);
      toast({
        title: 'Error Loading Preferences',
        description: 'Failed to load your AI privacy preferences.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAIStatus = () => {
    const enabled = aiService.isEnabled();
    setAIEnabled(enabled);
  };

  const handleConsentChange = async (featureId: string, consented: boolean) => {
    if (!profile?.id) return;

    try {
      setUpdating(featureId);
      await aiService.updateConsent(profile.id as string, featureId, consented);

      // Update local state
      setFeatures(prev => prev.map(feature => 
        feature.id === featureId ? { ...feature, enabled: consented } : feature
      ));

      setConsents(prev => {
        const existing = prev.find(c => c.featureType === featureId);
        if (existing) {
          return prev.map(c => 
            c.featureType === featureId 
              ? { ...c, consented, updatedAt: new Date() }
              : c
          );
        } else {
          return [...prev, {
            userId: profile.id as string,
            featureType: featureId,
            consented,
            updatedAt: new Date()
          }];
        }
      });

      toast({
        title: consented ? 'AI Feature Enabled' : 'AI Feature Disabled',
        description: `${features.find(f => f.id === featureId)?.name} has been ${consented ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Failed to update AI consent:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update your AI preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const enabledFeaturesCount = features.filter(f => f.enabled).length;
  const lastUpdated = consents.length > 0 
    ? Math.max(...consents.map(c => c.updatedAt.getTime()))
    : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            AI Privacy Controls
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

  return (
    <div className="space-y-6">
      {/* AI Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            AI Privacy & Consent Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Availability Status */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {aiEnabled ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>AI features are available and can be enabled with your consent.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span>AI features are currently unavailable. API keys may not be configured.</span>
                </div>
              )}
            </AlertDescription>
          </Alert>

          {/* Consent Summary */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">AI Features Status</p>
              <p className="text-sm text-gray-600">
                {enabledFeaturesCount} of {features.length} features enabled
              </p>
            </div>
            <div className="text-right">
              <Badge variant={enabledFeaturesCount > 0 ? "default" : "secondary"}>
                {enabledFeaturesCount > 0 ? "Active" : "Inactive"}
              </Badge>
              {lastUpdated && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated {new Date(lastUpdated).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Feature Controls */}
      <div className="space-y-4">
        {features.map((feature, index) => (
          <Card key={feature.id} className={feature.enabled ? "border-blue-200 bg-blue-50/30" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {feature.icon}
                  {feature.name}
                  {feature.enabled && (
                    <Badge variant="default" className="ml-2">Enabled</Badge>
                  )}
                </CardTitle>
                <Switch
                  checked={feature.enabled}
                  onCheckedChange={(checked) => handleConsentChange(feature.id, checked)}
                  disabled={!aiEnabled || updating === feature.id}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{feature.description}</p>

              {/* Benefits */}
              <div>
                <h4 className="font-medium mb-2">Benefits:</h4>
                <ul className="space-y-1">
                  {feature.benefits.map((benefit, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* Privacy Information */}
              <div className="space-y-2">
                <div>
                  <h4 className="font-medium text-sm">Data Usage:</h4>
                  <p className="text-xs text-gray-600">{feature.dataUsage}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Privacy Protection:</h4>
                  <p className="text-xs text-gray-600">{feature.privacy}</p>
                </div>
              </div>

              {updating === feature.id && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating preferences...
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Privacy Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Privacy Commitment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Data Minimization:</strong> Only necessary data is processed by AI services.</p>
            <p><strong>Encryption:</strong> All data is encrypted in transit and at rest.</p>
            <p><strong>Consent Control:</strong> You can enable or disable features at any time.</p>
            <p><strong>Transparency:</strong> All AI suggestions include confidence levels and explanations.</p>
            <p><strong>Audit Trail:</strong> All AI usage is logged for your review.</p>
            <p><strong>Data Deletion:</strong> Disabling a feature removes associated AI processing data.</p>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadConsents}
              disabled={loading}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIPrivacyControls; 