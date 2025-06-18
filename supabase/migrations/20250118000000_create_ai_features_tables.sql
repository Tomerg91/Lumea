-- Epic 11: Advanced Features - AI database tables
-- AI insights table for storing reflection analysis results
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reflection_id UUID REFERENCES reflections(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('sentiment', 'pattern', 'mood', 'suggestion')),
  content JSONB NOT NULL,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI consents table for privacy management
CREATE TABLE ai_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('reflection_insights', 'session_planning', 'analytics', 'automation', 'communication')),
  consented BOOLEAN DEFAULT FALSE,
  consented_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_type)
);

-- Automation rules table for smart workflows
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('reminder', 'resource_suggestion', 'milestone_detection', 'follow_up')),
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session suggestions table for AI-generated recommendations
CREATE TABLE session_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('template', 'resource', 'goal', 'activity')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  reasoning TEXT,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_accepted BOOLEAN,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI usage logs for audit and analytics
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL,
  action TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_cents INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_reflection_id ON ai_insights(reflection_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_created_at ON ai_insights(created_at DESC);

CREATE INDEX idx_ai_consents_user_id ON ai_consents(user_id);
CREATE INDEX idx_ai_consents_feature_type ON ai_consents(feature_type);

CREATE INDEX idx_automation_rules_coach_id ON automation_rules(coach_id);
CREATE INDEX idx_automation_rules_type ON automation_rules(rule_type);
CREATE INDEX idx_automation_rules_active ON automation_rules(is_active);

CREATE INDEX idx_session_suggestions_coach_id ON session_suggestions(coach_id);
CREATE INDEX idx_session_suggestions_client_id ON session_suggestions(client_id);
CREATE INDEX idx_session_suggestions_type ON session_suggestions(suggestion_type);
CREATE INDEX idx_session_suggestions_priority ON session_suggestions(priority);
CREATE INDEX idx_session_suggestions_created_at ON session_suggestions(created_at DESC);

CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_feature_type ON ai_usage_logs(feature_type);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);

-- Row Level Security (RLS) policies

-- AI insights - users can only see their own insights
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI insights" ON ai_insights
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI insights" ON ai_insights
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI insights" ON ai_insights
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI insights" ON ai_insights
  FOR DELETE
  USING (auth.uid() = user_id);

-- AI consents - users can only manage their own consents
ALTER TABLE ai_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI consents" ON ai_consents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own AI consents" ON ai_consents
  FOR ALL
  USING (auth.uid() = user_id);

-- Automation rules - coaches can only manage their own rules
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their own automation rules" ON automation_rules
  FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can manage their own automation rules" ON automation_rules
  FOR ALL
  USING (auth.uid() = coach_id);

-- Session suggestions - coaches see their own, clients see suggestions for them
ALTER TABLE session_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their session suggestions" ON session_suggestions
  FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Clients can view suggestions for them" ON session_suggestions
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Coaches can manage their session suggestions" ON session_suggestions
  FOR ALL
  USING (auth.uid() = coach_id);

-- AI usage logs - users can only see their own usage
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage logs" ON ai_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert AI usage logs" ON ai_usage_logs
  FOR INSERT
  WITH CHECK (true); -- Allow system to log usage

-- Functions for automated timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_ai_insights_updated_at 
  BEFORE UPDATE ON ai_insights 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_consents_updated_at 
  BEFORE UPDATE ON ai_consents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at 
  BEFORE UPDATE ON automation_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_suggestions_updated_at 
  BEFORE UPDATE ON session_suggestions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE ai_insights IS 'AI-generated insights from reflection analysis';
COMMENT ON TABLE ai_consents IS 'User consent tracking for AI features';
COMMENT ON TABLE automation_rules IS 'Coach-defined automation workflows';
COMMENT ON TABLE session_suggestions IS 'AI-generated session planning suggestions';
COMMENT ON TABLE ai_usage_logs IS 'Audit log for AI feature usage and costs';

COMMENT ON COLUMN ai_insights.insight_type IS 'Type of insight: sentiment, pattern, mood, or suggestion';
COMMENT ON COLUMN ai_insights.content IS 'JSONB containing insight details and metadata';
COMMENT ON COLUMN ai_insights.confidence_score IS 'AI confidence level (0.0 to 1.0)';

COMMENT ON COLUMN ai_consents.feature_type IS 'AI feature the consent applies to';
COMMENT ON COLUMN ai_consents.consented IS 'Whether user has consented to this feature';

COMMENT ON COLUMN automation_rules.conditions IS 'JSONB defining when the rule triggers';
COMMENT ON COLUMN automation_rules.actions IS 'JSONB defining what actions to take';

COMMENT ON COLUMN session_suggestions.confidence_score IS 'AI confidence in the suggestion (0.0 to 1.0)';
COMMENT ON COLUMN session_suggestions.is_accepted IS 'Whether coach accepted the suggestion';
COMMENT ON COLUMN session_suggestions.is_dismissed IS 'Whether coach dismissed the suggestion'; 