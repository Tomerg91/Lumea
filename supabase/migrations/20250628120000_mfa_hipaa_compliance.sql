-- MFA and HIPAA Compliance Enhancement Migration
-- Adds Multi-Factor Authentication support for healthcare providers
-- Date: 2025-06-28

-- =============================================================================
-- MULTI-FACTOR AUTHENTICATION
-- =============================================================================

-- User MFA settings table for HIPAA compliance
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backup_codes TEXT[] NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT false,
  setup_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  enabled_at TIMESTAMP WITH TIME ZONE,
  disabled_at TIMESTAMP WITH TIME ZONE,
  disabled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  failed_attempts INTEGER DEFAULT 0,
  last_failed_at TIMESTAMP WITH TIME ZONE,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- =============================================================================
-- ENHANCED AUDIT LOGGING FOR HIPAA
-- =============================================================================

-- Add missing columns to audit_logs table for HIPAA compliance
-- These additions enhance the existing audit_logs table
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS event_category TEXT DEFAULT 'data_access' CHECK (event_category IN ('authentication', 'data_access', 'data_modification', 'administrative', 'security', 'system')),
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS compliance_flags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS geographic_location TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS session_token TEXT,
ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS bytes_accessed INTEGER,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- =============================================================================
-- DATA RETENTION POLICIES
-- =============================================================================

-- Data retention policies table for HIPAA compliance
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL,
  legal_basis TEXT NOT NULL,
  compliance_requirements TEXT[] NOT NULL DEFAULT '{}',
  auto_delete_enabled BOOLEAN DEFAULT false,
  last_cleanup_at TIMESTAMP WITH TIME ZONE,
  next_cleanup_at TIMESTAMP WITH TIME ZONE,
  policy_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(data_type, table_name)
);

-- =============================================================================
-- SECURITY INCIDENTS
-- =============================================================================

-- Security incident tracking for HIPAA breach detection
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL CHECK (incident_type IN ('unauthorized_access', 'data_breach', 'phi_exposure', 'failed_authentication', 'suspicious_activity', 'system_compromise', 'policy_violation')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'contained', 'resolved', 'false_positive')),
  affected_users UUID[] DEFAULT '{}',
  affected_data_types TEXT[] DEFAULT '{}',
  detection_method TEXT NOT NULL,
  detection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  impact_assessment TEXT,
  remediation_steps TEXT,
  resolution_notes TEXT,
  estimated_records_affected INTEGER DEFAULT 0,
  phi_involved BOOLEAN DEFAULT false,
  breach_notification_required BOOLEAN DEFAULT false,
  breach_notification_sent BOOLEAN DEFAULT false,
  breach_notification_date TIMESTAMP WITH TIME ZONE,
  regulatory_reporting_required BOOLEAN DEFAULT false,
  regulatory_reporting_completed BOOLEAN DEFAULT false,
  lessons_learned TEXT,
  preventive_measures TEXT,
  evidence JSONB DEFAULT '{}',
  timeline JSONB DEFAULT '{}',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- ACCESS CONTROL MATRIX
-- =============================================================================

-- Access control matrix for fine-grained HIPAA permissions
CREATE TABLE IF NOT EXISTS public.access_control_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write', 'delete', 'admin', 'phi_access')),
  granted_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  justification TEXT NOT NULL,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- NOTIFICATION PREFERENCES
-- =============================================================================

-- User notification preferences for security and compliance alerts
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  enabled BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'monthly')),
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, notification_type, channel)
);

-- =============================================================================
-- ENCRYPTION KEY MANAGEMENT
-- =============================================================================

-- Encryption key management for field-level encryption
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT NOT NULL UNIQUE,
  algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  key_material TEXT NOT NULL, -- Encrypted with master key
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired', 'compromised')),
  purpose TEXT NOT NULL CHECK (purpose IN ('field_encryption', 'file_encryption', 'communication')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  rotated_at TIMESTAMP WITH TIME ZONE,
  retired_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for MFA table
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id ON public.user_mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_enabled ON public.user_mfa_settings(is_enabled);

-- Enhanced indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_timestamp ON public.audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_phi_accessed ON public.audit_logs(phi_accessed) WHERE phi_accessed = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_category ON public.audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON public.audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance_flags ON public.audit_logs USING GIN(compliance_flags);

-- Indexes for security incidents
CREATE INDEX IF NOT EXISTS idx_security_incidents_type_severity ON public.security_incidents(incident_type, severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_phi_involved ON public.security_incidents(phi_involved) WHERE phi_involved = true;

-- Indexes for access control
CREATE INDEX IF NOT EXISTS idx_access_control_user_resource ON public.access_control_matrix(user_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_control_expires ON public.access_control_matrix(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_control_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- MFA settings policies
CREATE POLICY "Users can only access their own MFA settings" ON public.user_mfa_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all MFA settings" ON public.user_mfa_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Data retention policies (admin only)
CREATE POLICY "Only admins can access data retention policies" ON public.data_retention_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Security incidents (admin and coaches)
CREATE POLICY "Admins and coaches can access security incidents" ON public.security_incidents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'coach')
    )
  );

-- Access control matrix
CREATE POLICY "Users can view their own access rights" ON public.access_control_matrix
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage access control" ON public.access_control_matrix
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Notification preferences
CREATE POLICY "Users can manage their own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Encryption keys (admin only)
CREATE POLICY "Only admins can access encryption keys" ON public.encryption_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- INITIAL DATA AND RETENTION POLICIES
-- =============================================================================

-- Insert default data retention policies for HIPAA compliance
INSERT INTO public.data_retention_policies (data_type, table_name, retention_period_days, legal_basis, compliance_requirements, auto_delete_enabled) VALUES
('session_data', 'sessions', 2190, 'HIPAA Requirements', ARRAY['HIPAA'], true), -- 6 years
('coach_notes', 'coach_notes', 2190, 'HIPAA Requirements', ARRAY['HIPAA'], true), -- 6 years
('reflections', 'reflections', 2190, 'HIPAA Requirements', ARRAY['HIPAA'], true), -- 6 years
('audit_logs', 'audit_logs', 2190, 'HIPAA Requirements', ARRAY['HIPAA'], false), -- 6 years, manual deletion
('payments', 'payments', 2555, 'Tax Law', ARRAY['IRS', 'HIPAA'], true), -- 7 years
('consent_records', 'consents', 2190, 'HIPAA Requirements', ARRAY['HIPAA'], false), -- 6 years, manual
('mfa_settings', 'user_mfa_settings', 2190, 'Security Requirements', ARRAY['HIPAA'], false), -- 6 years, manual
('security_incidents', 'security_incidents', 2190, 'HIPAA Requirements', ARRAY['HIPAA'], false); -- 6 years, manual

-- Insert default notification preferences for all users
INSERT INTO public.notification_preferences (user_id, notification_type, channel, enabled)
SELECT 
  id as user_id,
  'security_alert' as notification_type,
  'email' as channel,
  true as enabled
FROM public.users
WHERE role IN ('coach', 'admin')
ON CONFLICT (user_id, notification_type, channel) DO NOTHING;

-- =============================================================================
-- FUNCTIONS FOR AUTOMATED CLEANUP
-- =============================================================================

-- Function to check and enforce data retention policies
CREATE OR REPLACE FUNCTION enforce_data_retention()
RETURNS void AS $$
DECLARE
  policy_record RECORD;
  deletion_count INTEGER;
BEGIN
  FOR policy_record IN 
    SELECT * FROM public.data_retention_policies 
    WHERE auto_delete_enabled = true
  LOOP
    EXECUTE format(
      'DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
      policy_record.table_name,
      policy_record.retention_period_days
    );
    
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    
    -- Log the cleanup activity
    INSERT INTO public.audit_logs (
      action, resource, description, metadata, event_type, event_category
    ) VALUES (
      'data_retention_cleanup',
      policy_record.table_name,
      format('Automatic cleanup of %s records older than %s days', 
             deletion_count, policy_record.retention_period_days),
      jsonb_build_object(
        'table_name', policy_record.table_name,
        'records_deleted', deletion_count,
        'retention_days', policy_record.retention_period_days
      ),
      'system_event',
      'administrative'
    );
    
    -- Update last cleanup time
    UPDATE public.data_retention_policies 
    SET 
      last_cleanup_at = NOW(),
      next_cleanup_at = NOW() + INTERVAL '1 day'
    WHERE id = policy_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS FOR AUDIT LOGGING
-- =============================================================================

-- Function to automatically log MFA events
CREATE OR REPLACE FUNCTION log_mfa_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_enabled != NEW.is_enabled THEN
      INSERT INTO public.audit_logs (
        user_id, action, resource, description, metadata, 
        event_type, event_category, risk_level, compliance_flags
      ) VALUES (
        NEW.user_id,
        CASE WHEN NEW.is_enabled THEN 'mfa_enabled' ELSE 'mfa_disabled' END,
        'mfa_settings',
        CASE WHEN NEW.is_enabled THEN 'MFA enabled by user' ELSE 'MFA disabled by user' END,
        jsonb_build_object(
          'mfa_enabled', NEW.is_enabled,
          'setup_at', NEW.setup_at,
          'enabled_at', NEW.enabled_at
        ),
        'security_event',
        'authentication',
        'medium',
        ARRAY['HIPAA']
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for MFA events
CREATE TRIGGER trigger_log_mfa_events
  AFTER UPDATE ON public.user_mfa_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_mfa_events();

-- =============================================================================
-- PERIODIC CLEANUP SETUP
-- =============================================================================

-- Note: In production, set up a cron job or scheduled function to run:
-- SELECT enforce_data_retention();

COMMENT ON TABLE public.user_mfa_settings IS 'Multi-factor authentication settings for HIPAA compliance';
COMMENT ON TABLE public.data_retention_policies IS 'Data retention policies for HIPAA and regulatory compliance';
COMMENT ON TABLE public.security_incidents IS 'Security incident tracking for HIPAA breach detection and response';
COMMENT ON TABLE public.access_control_matrix IS 'Fine-grained access control for PHI and sensitive resources';
COMMENT ON TABLE public.notification_preferences IS 'User preferences for security and compliance notifications';
COMMENT ON TABLE public.encryption_keys IS 'Encryption key management for field-level encryption';