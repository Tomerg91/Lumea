-- Enhanced Authentication for Production Deployment
-- Created: 2025-06-28
-- Purpose: Production-ready authentication enhancements with security features

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================== ENHANCED USER PROFILES ======================

-- Add enhanced authentication fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS backup_codes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_ip INET,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 480; -- 8 hours

-- ====================== AUTHENTICATION SESSIONS ======================

-- Create authentication sessions table for enhanced session management
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  location JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for authentication sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_is_active ON auth_sessions(is_active);

-- ====================== LOGIN ATTEMPTS TRACKING ======================

-- Create login attempts table for security monitoring
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT,
  ip_address INET NOT NULL,
  user_agent TEXT,
  attempt_type VARCHAR(20) NOT NULL, -- 'success', 'failed', 'blocked'
  failure_reason TEXT,
  location JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for login attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempt_type ON login_attempts(attempt_type);

-- ====================== PASSWORD RESET TOKENS ======================

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ====================== AUDIT LOGGING ======================

-- Create authentication audit log table
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  event_details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  risk_score INTEGER DEFAULT 0, -- 0-100 risk score
  location JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for audit logging
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_success ON auth_audit_log(success);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_risk_score ON auth_audit_log(risk_score);

-- ====================== SECURITY POLICIES ======================

-- Create security policies table for configurable security rules
CREATE TABLE IF NOT EXISTS security_policies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  policy_name VARCHAR(100) NOT NULL UNIQUE,
  policy_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default security policies
INSERT INTO security_policies (policy_name, policy_value, description) VALUES
('max_failed_login_attempts', '{"value": 5}', 'Maximum failed login attempts before account lockout'),
('account_lockout_duration_minutes', '{"value": 30}', 'Account lockout duration in minutes'),
('session_timeout_hours', '{"value": 8}', 'Default session timeout in hours'),
('password_min_length', '{"value": 12}', 'Minimum password length requirement'),
('password_require_special_chars', '{"value": true}', 'Require special characters in passwords'),
('two_factor_grace_period_days', '{"value": 7}', 'Grace period for 2FA setup after account creation'),
('suspicious_login_threshold', '{"value": 3}', 'Number of failed attempts to trigger suspicious activity alert')
ON CONFLICT (policy_name) DO NOTHING;

-- ====================== ROW LEVEL SECURITY ======================

-- Enable RLS on all authentication tables
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;

-- Auth sessions policies
CREATE POLICY "Users can view their own sessions" ON auth_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON auth_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Login attempts policies (admin only)
CREATE POLICY "Only admins can view login attempts" ON login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Password reset tokens policies
CREATE POLICY "Users can view their own reset tokens" ON password_reset_tokens
  FOR SELECT USING (user_id = auth.uid());

-- Audit log policies (admin only)
CREATE POLICY "Only admins can view audit logs" ON auth_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Security policies (admin only)
CREATE POLICY "Only admins can view security policies" ON security_policies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update security policies" ON security_policies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ====================== TRIGGERS AND FUNCTIONS ======================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_auth_sessions_updated_at ON auth_sessions;
CREATE TRIGGER update_auth_sessions_updated_at
  BEFORE UPDATE ON auth_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_security_policies_updated_at ON security_policies;
CREATE TRIGGER update_security_policies_updated_at
  BEFORE UPDATE ON security_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_sessions 
  WHERE expires_at < NOW() OR is_active = FALSE;
  
  DELETE FROM password_reset_tokens 
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
  
  -- Clean up old login attempts (keep last 90 days)
  DELETE FROM login_attempts 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Clean up old audit logs (keep last 1 year)
  DELETE FROM auth_audit_log 
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Function to track login attempts
CREATE OR REPLACE FUNCTION track_login_attempt(
  p_email TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_attempt_type VARCHAR(20),
  p_failure_reason TEXT DEFAULT NULL,
  p_location JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO login_attempts (
    email,
    ip_address,
    user_agent,
    attempt_type,
    failure_reason,
    location
  ) VALUES (
    p_email,
    p_ip_address,
    p_user_agent,
    p_attempt_type,
    p_failure_reason,
    p_location
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if account should be locked
CREATE OR REPLACE FUNCTION should_lock_account(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  failed_attempts INTEGER;
  max_attempts INTEGER;
BEGIN
  -- Get max failed attempts from security policy
  SELECT (policy_value->>'value')::INTEGER 
  INTO max_attempts
  FROM security_policies 
  WHERE policy_name = 'max_failed_login_attempts' AND is_active = TRUE;
  
  -- Default to 5 if policy not found
  IF max_attempts IS NULL THEN
    max_attempts := 5;
  END IF;
  
  -- Count failed attempts in last hour
  SELECT COUNT(*)
  INTO failed_attempts
  FROM login_attempts
  WHERE email = p_email 
    AND attempt_type = 'failed'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN failed_attempts >= max_attempts;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_auth_audit_log(
  p_user_id UUID,
  p_event_type VARCHAR(50),
  p_event_details JSONB,
  p_ip_address INET,
  p_user_agent TEXT,
  p_success BOOLEAN,
  p_risk_score INTEGER DEFAULT 0,
  p_location JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO auth_audit_log (
    user_id,
    event_type,
    event_details,
    ip_address,
    user_agent,
    success,
    risk_score,
    location
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_details,
    p_ip_address,
    p_user_agent,
    p_success,
    p_risk_score,
    p_location
  );
END;
$$ LANGUAGE plpgsql;

-- ====================== SECURITY INDEXES ======================

-- Additional performance indexes for security queries
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(email_verified_at) WHERE email_verified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_two_factor_enabled ON profiles(two_factor_enabled) WHERE two_factor_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_account_locked ON profiles(account_locked_until) WHERE account_locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login_at);

-- ====================== COMMENTS ======================

COMMENT ON TABLE auth_sessions IS 'Enhanced session management with device tracking and activity monitoring';
COMMENT ON TABLE login_attempts IS 'Security monitoring for login attempts and suspicious activity detection';
COMMENT ON TABLE password_reset_tokens IS 'Secure password reset token management with expiration and usage tracking';
COMMENT ON TABLE auth_audit_log IS 'Comprehensive audit logging for authentication events and security monitoring';
COMMENT ON TABLE security_policies IS 'Configurable security policies for authentication and access control';

COMMENT ON COLUMN profiles.email_verified_at IS 'Timestamp when email was verified';
COMMENT ON COLUMN profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN profiles.account_locked_until IS 'Account lockout expiration timestamp';
COMMENT ON COLUMN profiles.failed_login_attempts IS 'Current count of failed login attempts';
COMMENT ON COLUMN profiles.session_timeout_minutes IS 'Custom session timeout for this user';

-- ====================== GRANTS ======================

-- Grant necessary permissions for the application
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON security_policies TO anon, authenticated;
GRANT INSERT ON login_attempts TO anon, authenticated;
GRANT INSERT ON auth_audit_log TO anon, authenticated;

-- Grant session management permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO authenticated;