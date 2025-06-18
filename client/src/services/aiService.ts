import { createClient } from '@supabase/supabase-js';

export interface AIConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  enabled: boolean;
  features: {
    reflectionInsights: boolean;
    sessionPlanning: boolean;
    analytics: boolean;
    automation: boolean;
    communication: boolean;
  };
}

export interface ReflectionInsight {
  id: string;
  type: 'sentiment' | 'pattern' | 'mood' | 'suggestion';
  content: string;
  confidence: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface SessionSuggestion {
  id: string;
  type: 'template' | 'resource' | 'goal' | 'activity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  confidence: number;
}

export interface AIConsent {
  userId: string;
  featureType: string;
  consented: boolean;
  consentedAt?: Date;
  updatedAt: Date;
}

class AIService {
  private config: AIConfig;
  private supabase: any;

  constructor() {
    this.config = {
      enabled: false,
      features: {
        reflectionInsights: false,
        sessionPlanning: false,
        analytics: false,
        automation: false,
        communication: false
      }
    };
    
    // Initialize Supabase client for consent management
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );
  }

  // Configuration management
  async initializeConfig(): Promise<void> {
    try {
      // Check if API keys are available
      const hasOpenAI = !!import.meta.env.VITE_OPENAI_API_KEY;
      const hasAnthropic = !!import.meta.env.VITE_ANTHROPIC_API_KEY;

      this.config = {
        openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
        anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        enabled: hasOpenAI || hasAnthropic,
        features: {
          reflectionInsights: hasOpenAI,
          sessionPlanning: hasOpenAI,
          analytics: hasOpenAI,
          automation: hasOpenAI,
          communication: hasOpenAI
        }
      };
    } catch (error) {
      console.error('Failed to initialize AI config:', error);
      this.config.enabled = false;
    }
  }

  // Consent management
  async checkConsent(userId: string, featureType: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('ai_consents')
        .select('consented')
        .eq('user_id', userId)
        .eq('feature_type', featureType)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }

      return data?.consented || false;
    } catch (error) {
      console.error('Failed to check AI consent:', error);
      return false;
    }
  }

  async updateConsent(userId: string, featureType: string, consented: boolean): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_consents')
        .upsert({
          user_id: userId,
          feature_type: featureType,
          consented,
          consented_at: consented ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update AI consent:', error);
      throw error;
    }
  }

  async getAllConsents(userId: string): Promise<AIConsent[]> {
    try {
      const { data, error } = await this.supabase
        .from('ai_consents')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return data?.map((item: any) => ({
        userId: item.user_id,
        featureType: item.feature_type,
        consented: item.consented,
        consentedAt: item.consented_at ? new Date(item.consented_at) : undefined,
        updatedAt: new Date(item.updated_at)
      })) || [];
    } catch (error) {
      console.error('Failed to get AI consents:', error);
      return [];
    }
  }

  // AI API calls with error handling
  private async callOpenAI(prompt: string, options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}): Promise<string> {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callAnthropic(prompt: string, options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}): Promise<string> {
    if (!this.config.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.anthropicApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-haiku-20240307',
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  // Main AI service methods
  async analyzeReflection(
    userId: string,
    reflectionText: string,
    reflectionId: string,
    previousReflections?: string[]
  ): Promise<ReflectionInsight[]> {
    // Check consent first
    const hasConsent = await this.checkConsent(userId, 'reflection_insights');
    if (!hasConsent) {
      throw new Error('User has not consented to reflection analysis');
    }

    if (!this.config.features.reflectionInsights) {
      throw new Error('Reflection insights feature not available');
    }

    try {
      const context = previousReflections?.length 
        ? `Previous reflections context: ${previousReflections.slice(-3).join('\n---\n')}\n\n`
        : '';

      const prompt = `${context}Analyze this coaching reflection for insights. Provide sentiment, patterns, and coaching suggestions.

Reflection: "${reflectionText}"

Please provide a JSON response with the following format:
{
  "insights": [
    {
      "type": "sentiment|pattern|mood|suggestion",
      "content": "insight description",
      "confidence": 0.0-1.0,
      "metadata": {}
    }
  ]
}

Focus on:
1. Emotional sentiment and mood patterns
2. Progress indicators and growth areas
3. Specific coaching opportunities
4. Areas needing attention or support

Keep insights supportive and coaching-focused.`;

      const response = await this.callOpenAI(prompt, {
        model: 'gpt-4o-mini',
        maxTokens: 800,
        temperature: 0.3
      });

      const parsed = JSON.parse(response);
      const insights: ReflectionInsight[] = parsed.insights.map((insight: any, index: number) => ({
        id: `${reflectionId}-insight-${index}`,
        type: insight.type,
        content: insight.content,
        confidence: insight.confidence,
        metadata: insight.metadata,
        createdAt: new Date()
      }));

      // Store insights in database
      await this.storeInsights(userId, reflectionId, insights);

      return insights;
    } catch (error) {
      console.error('Failed to analyze reflection:', error);
      throw error;
    }
  }

  async generateSessionSuggestions(
    userId: string,
    clientId: string,
    sessionContext: {
      previousSessions?: string[];
      recentReflections?: string[];
      coachNotes?: string[];
      clientGoals?: string[];
    }
  ): Promise<SessionSuggestion[]> {
    // Check consent first
    const hasConsent = await this.checkConsent(userId, 'session_planning');
    if (!hasConsent) {
      throw new Error('User has not consented to session planning assistance');
    }

    if (!this.config.features.sessionPlanning) {
      throw new Error('Session planning feature not available');
    }

    try {
      const contextString = [
        sessionContext.previousSessions?.length && `Previous sessions: ${sessionContext.previousSessions.slice(-3).join('\n')}`,
        sessionContext.recentReflections?.length && `Recent reflections: ${sessionContext.recentReflections.slice(-3).join('\n')}`,
        sessionContext.coachNotes?.length && `Coach notes: ${sessionContext.coachNotes.slice(-3).join('\n')}`,
        sessionContext.clientGoals?.length && `Client goals: ${sessionContext.clientGoals.join('\n')}`
      ].filter(Boolean).join('\n\n');

      const prompt = `Based on the following context, generate session planning suggestions for a coaching session using the Satya Method approach.

Context:
${contextString}

Please provide a JSON response with the following format:
{
  "suggestions": [
    {
      "type": "template|resource|goal|activity",
      "title": "suggestion title",
      "description": "detailed description",
      "priority": "high|medium|low",
      "reasoning": "why this suggestion is relevant",
      "confidence": 0.0-1.0
    }
  ]
}

Focus on:
1. Session structure and flow
2. Relevant exercises or activities
3. Resource recommendations
4. Goal-setting opportunities
5. Areas to explore based on client patterns

Keep suggestions practical and aligned with the Satya Method principles.`;

      const response = await this.callOpenAI(prompt, {
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.4
      });

      const parsed = JSON.parse(response);
      const suggestions: SessionSuggestion[] = parsed.suggestions.map((suggestion: any, index: number) => ({
        id: `session-suggestion-${Date.now()}-${index}`,
        type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority,
        reasoning: suggestion.reasoning,
        confidence: suggestion.confidence
      }));

      return suggestions;
    } catch (error) {
      console.error('Failed to generate session suggestions:', error);
      throw error;
    }
  }

  // Helper method to store insights in database
  private async storeInsights(userId: string, reflectionId: string, insights: ReflectionInsight[]): Promise<void> {
    try {
      const insightsData = insights.map(insight => ({
        user_id: userId,
        reflection_id: reflectionId,
        insight_type: insight.type,
        content: {
          text: insight.content,
          confidence: insight.confidence,
          metadata: insight.metadata
        },
        confidence_score: insight.confidence,
        created_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('ai_insights')
        .insert(insightsData);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to store insights:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  // Utility methods
  isEnabled(): boolean {
    return this.config.enabled;
  }

  isFeatureEnabled(feature: keyof AIConfig['features']): boolean {
    return this.config.enabled && this.config.features[feature];
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const aiService = new AIService();

// Initialize on module load
aiService.initializeConfig();

export default aiService; 