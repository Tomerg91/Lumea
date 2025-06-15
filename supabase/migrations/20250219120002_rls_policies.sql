-- Lumea Coaching Platform - Row Level Security Policies
-- Implements comprehensive RLS for multi-tenant security
-- Date: 2025-02-19

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USERS TABLE POLICIES
-- =============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read their own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Coaches can read their clients' basic info
CREATE POLICY "Coaches can read client profiles"
ON public.users FOR SELECT
USING (
  role = 'client' AND 
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE coach_id = auth.uid() AND client_id = users.id
  )
);

-- Clients can read their coaches' basic info
CREATE POLICY "Clients can read coach profiles"
ON public.users FOR SELECT
USING (
  role = 'coach' AND 
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE client_id = auth.uid() AND coach_id = users.id
  )
);

-- =============================================================================
-- SESSIONS TABLE POLICIES
-- =============================================================================

-- Coaches can manage their own sessions
CREATE POLICY "Coaches can manage their sessions"
ON public.sessions FOR ALL
USING (coach_id = auth.uid());

-- Clients can view and update their own sessions
CREATE POLICY "Clients can manage their sessions"
ON public.sessions FOR ALL
USING (client_id = auth.uid());

-- =============================================================================
-- PAYMENTS TABLE POLICIES
-- =============================================================================

-- Coaches can view payments for their sessions
CREATE POLICY "Coaches can view their payments"
ON public.payments FOR SELECT
USING (coach_id = auth.uid());

-- Clients can view their own payments
CREATE POLICY "Clients can view their payments"
ON public.payments FOR SELECT
USING (client_id = auth.uid());

-- Only coaches can update payment status
CREATE POLICY "Coaches can update payment status"
ON public.payments FOR UPDATE
USING (coach_id = auth.uid());

-- =============================================================================
-- REFLECTIONS TABLE POLICIES
-- =============================================================================

-- Users can manage their own reflections
CREATE POLICY "Users can manage their reflections"
ON public.reflections FOR ALL
USING (user_id = auth.uid());

-- Coaches can read reflections from their clients
CREATE POLICY "Coaches can read client reflections"
ON public.reflections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE coach_id = auth.uid() AND client_id = reflections.user_id
  )
);

-- =============================================================================
-- RESOURCES TABLE POLICIES
-- =============================================================================

-- Anyone can read public resources
CREATE POLICY "Anyone can read public resources"
ON public.resources FOR SELECT
USING (coach_id IS NULL);

-- Coaches can manage their own resources
CREATE POLICY "Coaches can manage their resources"
ON public.resources FOR ALL
USING (coach_id = auth.uid());

-- Users can read resources shared with them
CREATE POLICY "Users can read shared resources"
ON public.resources FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.resource_users 
    WHERE resource_id = resources.id AND user_id = auth.uid()
  )
);

-- =============================================================================
-- RESOURCE_USERS TABLE POLICIES
-- =============================================================================

-- Resource owners can manage sharing
CREATE POLICY "Resource owners can manage sharing"
ON public.resource_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.resources 
    WHERE id = resource_users.resource_id AND coach_id = auth.uid()
  )
);

-- Users can see resources shared with them
CREATE POLICY "Users can see their shared resources"
ON public.resource_users FOR SELECT
USING (user_id = auth.uid());

-- =============================================================================
-- COACH NOTES TABLE POLICIES
-- =============================================================================

-- Coaches can manage their own notes
CREATE POLICY "Coaches can manage their notes"
ON public.coach_notes FOR ALL
USING (coach_id = auth.uid());

-- Clients can read non-private notes about them
CREATE POLICY "Clients can read non-private notes"
ON public.coach_notes FOR SELECT
USING (client_id = auth.uid() AND is_private = false);

-- =============================================================================
-- FILES TABLE POLICIES
-- =============================================================================

-- Users can manage their own files
CREATE POLICY "Users can manage their files"
ON public.files FOR ALL
USING (user_id = auth.uid());

-- =============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- =============================================================================

-- Users can manage their received notifications
CREATE POLICY "Users can manage received notifications"
ON public.notifications FOR ALL
USING (recipient_id = auth.uid());

-- Users can read notifications they sent
CREATE POLICY "Users can read sent notifications"
ON public.notifications FOR SELECT
USING (sender_id = auth.uid());

-- =============================================================================
-- CALENDAR INTEGRATIONS TABLE POLICIES
-- =============================================================================

-- Users can manage their own calendar integrations
CREATE POLICY "Users can manage their calendar integrations"
ON public.calendar_integrations FOR ALL
USING (user_id = auth.uid());

-- =============================================================================
-- CALENDAR EVENTS TABLE POLICIES
-- =============================================================================

-- Users can manage events from their integrations
CREATE POLICY "Users can manage their calendar events"
ON public.calendar_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_integrations 
    WHERE id = calendar_events.calendar_integration_id AND user_id = auth.uid()
  )
);

-- =============================================================================
-- AUDIT LOGS TABLE POLICIES
-- =============================================================================

-- Users can read their own audit logs
CREATE POLICY "Users can read their audit logs"
ON public.audit_logs FOR SELECT
USING (user_id = auth.uid());

-- Admins can read all audit logs (assuming admin role)
CREATE POLICY "Admins can read all audit logs"
ON public.audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =============================================================================
-- CONSENTS TABLE POLICIES
-- =============================================================================

-- Users can manage their own consents
CREATE POLICY "Users can manage their consents"
ON public.consents FOR ALL
USING (user_id = auth.uid());

-- =============================================================================
-- PASSWORD RESET TOKENS TABLE POLICIES
-- =============================================================================

-- Users can manage their own password reset tokens
CREATE POLICY "Users can manage their reset tokens"
ON public.password_reset_tokens FOR ALL
USING (user_id = auth.uid());

-- =============================================================================
-- PERFORMANCE METRICS TABLE POLICIES
-- =============================================================================

-- Users can read their own performance metrics
CREATE POLICY "Users can read their metrics"
ON public.performance_metrics FOR SELECT
USING (user_id = auth.uid());

-- Anonymous metrics (no user_id) are readable by anyone
CREATE POLICY "Anyone can read anonymous metrics"
ON public.performance_metrics FOR SELECT
USING (user_id IS NULL);

-- =============================================================================
-- SESSION FEEDBACK TABLE POLICIES
-- =============================================================================

-- Coaches can manage feedback for their sessions
CREATE POLICY "Coaches can manage session feedback"
ON public.session_feedback FOR ALL
USING (coach_id = auth.uid());

-- Clients can manage feedback for their sessions
CREATE POLICY "Clients can manage session feedback"
ON public.session_feedback FOR ALL
USING (client_id = auth.uid());

-- =============================================================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is coach
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'coach'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is client
CREATE OR REPLACE FUNCTION public.is_client()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'client'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check coach-client relationship
CREATE OR REPLACE FUNCTION public.has_coach_client_relationship(coach_user_id UUID, client_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE coach_id = coach_user_id AND client_id = client_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 