-- Lumea Coaching Platform - Triggers and Functions
-- Implements automatic profile creation and business logic
-- Date: 2025-02-19

-- =============================================================================
-- USER PROFILE MANAGEMENT
-- =============================================================================

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- TIMESTAMP MANAGEMENT
-- =============================================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_reflections_updated_at
  BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_resource_users_updated_at
  BEFORE UPDATE ON public.resource_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_coach_notes_updated_at
  BEFORE UPDATE ON public.coach_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_calendar_integrations_updated_at
  BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_consents_updated_at
  BEFORE UPDATE ON public.consents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_session_feedback_updated_at
  BEFORE UPDATE ON public.session_feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- AUDIT LOGGING
-- =============================================================================

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action TEXT,
  p_resource TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_phi_accessed BOOLEAN DEFAULT FALSE,
  p_phi_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
  user_info RECORD;
BEGIN
  -- Get user information
  SELECT u.email, u.role INTO user_info
  FROM public.users u
  WHERE u.id = auth.uid();

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    user_role,
    ip_address,
    action,
    resource,
    resource_id,
    phi_accessed,
    phi_type,
    data_classification,
    event_type,
    old_values,
    new_values,
    description
  ) VALUES (
    auth.uid(),
    user_info.email,
    user_info.role,
    inet_client_addr(),
    p_action,
    p_resource,
    p_resource_id,
    p_phi_accessed,
    p_phi_type,
    CASE 
      WHEN p_phi_accessed THEN 'restricted'
      ELSE 'confidential'
    END,
    'user_action',
    p_old_values,
    p_new_values,
    p_description
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SESSION MANAGEMENT
-- =============================================================================

-- Function to validate session scheduling
CREATE OR REPLACE FUNCTION public.validate_session_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping sessions for the same coach
  IF EXISTS (
    SELECT 1 FROM public.sessions
    WHERE coach_id = NEW.coach_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND status IN ('Upcoming', 'Rescheduled')
    AND (
      (NEW.date <= date + INTERVAL '2 hours' AND NEW.date >= date) OR
      (NEW.date + INTERVAL '2 hours' >= date AND NEW.date + INTERVAL '2 hours' <= date + INTERVAL '2 hours')
    )
  ) THEN
    RAISE EXCEPTION 'Coach has a conflicting session scheduled within 2 hours';
  END IF;

  -- Check for overlapping sessions for the same client
  IF EXISTS (
    SELECT 1 FROM public.sessions
    WHERE client_id = NEW.client_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND status IN ('Upcoming', 'Rescheduled')
    AND (
      (NEW.date <= date + INTERVAL '2 hours' AND NEW.date >= date) OR
      (NEW.date + INTERVAL '2 hours' >= date AND NEW.date + INTERVAL '2 hours' <= date + INTERVAL '2 hours')
    )
  ) THEN
    RAISE EXCEPTION 'Client has a conflicting session scheduled within 2 hours';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply session validation trigger
CREATE TRIGGER validate_session_schedule_trigger
  BEFORE INSERT OR UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_session_schedule();

-- =============================================================================
-- NOTIFICATION MANAGEMENT
-- =============================================================================

-- Function to create session reminder notifications
CREATE OR REPLACE FUNCTION public.create_session_reminder(session_id UUID)
RETURNS UUID AS $$
DECLARE
  session_info RECORD;
  notification_id UUID;
BEGIN
  -- Get session information
  SELECT 
    s.id, s.date, s.client_id, s.coach_id,
    c.name as client_name, ch.name as coach_name
  INTO session_info
  FROM public.sessions s
  JOIN public.users c ON c.id = s.client_id
  JOIN public.users ch ON ch.id = s.coach_id
  WHERE s.id = session_id;

  -- Create reminder notification for client
  INSERT INTO public.notifications (
    recipient_id,
    sender_id,
    session_id,
    type,
    channel,
    subject,
    html_body,
    text_body,
    priority,
    scheduled_at
  ) VALUES (
    session_info.client_id,
    session_info.coach_id,
    session_info.id,
    'session_reminder',
    'email',
    'Upcoming Coaching Session Reminder',
    'Your coaching session with ' || session_info.coach_name || ' is scheduled for ' || session_info.date,
    'Your coaching session with ' || session_info.coach_name || ' is scheduled for ' || session_info.date,
    'high',
    session_info.date - INTERVAL '24 hours'
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PASSWORD RESET TOKEN CLEANUP
-- =============================================================================

-- Function to clean up expired password reset tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CONSENT MANAGEMENT
-- =============================================================================

-- Function to withdraw consent
CREATE OR REPLACE FUNCTION public.withdraw_consent(
  consent_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  consent_record RECORD;
BEGIN
  -- Get consent record
  SELECT * INTO consent_record
  FROM public.consents
  WHERE id = consent_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consent not found or access denied';
  END IF;

  -- Update consent status
  UPDATE public.consents
  SET 
    status = 'withdrawn',
    withdrawn_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = consent_id;

  -- Create audit log
  PERFORM public.create_audit_log(
    'WITHDRAW',
    'consent',
    consent_id,
    row_to_json(consent_record)::jsonb,
    json_build_object('status', 'withdrawn', 'withdrawn_at', CURRENT_TIMESTAMP)::jsonb,
    'Consent withdrawn: ' || COALESCE(reason, 'No reason provided'),
    TRUE,
    'consent_management'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FILE STORAGE FUNCTIONS
-- =============================================================================

-- Function to get secure file URL (placeholder for Supabase Storage integration)
CREATE OR REPLACE FUNCTION public.get_secure_file_url(file_id UUID)
RETURNS TEXT AS $$
DECLARE
  file_record RECORD;
BEGIN
  -- Check file access permissions
  SELECT * INTO file_record
  FROM public.files
  WHERE id = file_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Return storage path (to be used with Supabase Storage)
  RETURN file_record.storage_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- BUSINESS METRICS FUNCTIONS
-- =============================================================================

-- Function to calculate coach metrics
CREATE OR REPLACE FUNCTION public.get_coach_metrics(coach_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  metrics JSONB;
BEGIN
  SELECT json_build_object(
    'total_sessions', COUNT(*),
    'completed_sessions', COUNT(*) FILTER (WHERE status = 'Completed'),
    'cancelled_sessions', COUNT(*) FILTER (WHERE status = 'Cancelled'),
    'total_clients', COUNT(DISTINCT client_id),
    'total_revenue', COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'Paid'), 0),
    'pending_payments', COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'Due'), 0)
  ) INTO metrics
  FROM public.sessions s
  LEFT JOIN public.payments p ON p.id = s.payment_id
  WHERE s.coach_id = coach_user_id;

  RETURN metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate client metrics
CREATE OR REPLACE FUNCTION public.get_client_metrics(client_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  metrics JSONB;
BEGIN
  SELECT json_build_object(
    'total_sessions', COUNT(*),
    'completed_sessions', COUNT(*) FILTER (WHERE status = 'Completed'),
    'upcoming_sessions', COUNT(*) FILTER (WHERE status = 'Upcoming'),
    'total_reflections', (
      SELECT COUNT(*) FROM public.reflections 
      WHERE user_id = client_user_id
    ),
    'total_payments', COALESCE(SUM(p.amount), 0),
    'pending_payments', COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'Due'), 0)
  ) INTO metrics
  FROM public.sessions s
  LEFT JOIN public.payments p ON p.id = s.payment_id
  WHERE s.client_id = client_user_id;

  RETURN metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 