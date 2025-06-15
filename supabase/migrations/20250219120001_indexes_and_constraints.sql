-- Lumea Coaching Platform - Indexes and Constraints
-- Creates optimized indexes for performance and query efficiency
-- Date: 2025-02-19

-- =============================================================================
-- USERS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- =============================================================================
-- SESSIONS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON public.sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_payment_id ON public.sessions(payment_id);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_date ON public.sessions(coach_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON public.sessions(client_id, date);

-- =============================================================================
-- PAYMENTS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_coach_id ON public.payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status_due_date ON public.payments(status, due_date);

-- =============================================================================
-- REFLECTIONS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_reflections_user_id ON public.reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_session_id ON public.reflections(session_id);
CREATE INDEX IF NOT EXISTS idx_reflections_created_at ON public.reflections(created_at);
CREATE INDEX IF NOT EXISTS idx_reflections_user_created ON public.reflections(user_id, created_at);

-- =============================================================================
-- RESOURCES TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_title ON public.resources(title);
CREATE INDEX IF NOT EXISTS idx_resources_coach_id ON public.resources(coach_id);
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON public.resources(resource_type);

-- =============================================================================
-- RESOURCE_USERS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_resource_users_user_id ON public.resource_users(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_users_resource_id ON public.resource_users(resource_id);

-- =============================================================================
-- COACH_NOTES TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_id ON public.coach_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_client_id ON public.coach_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_session_id ON public.coach_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_client ON public.coach_notes(coach_id, client_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_is_private ON public.coach_notes(is_private);

-- =============================================================================
-- FILES TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_context ON public.files(context);
CREATE INDEX IF NOT EXISTS idx_files_user_context ON public.files(user_id, context);
CREATE INDEX IF NOT EXISTS idx_files_mimetype ON public.files(mimetype);

-- =============================================================================
-- NOTIFICATIONS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON public.notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_session_id ON public.notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status ON public.notifications(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON public.notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON public.notifications(sent_at);

-- =============================================================================
-- CALENDAR INTEGRATIONS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON public.calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider ON public.calendar_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_is_active ON public.calendar_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_provider ON public.calendar_integrations(user_id, provider);

-- =============================================================================
-- CALENDAR EVENTS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_calendar_events_integration_id ON public.calendar_events(calendar_integration_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_session_id ON public.calendar_events(session_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_is_coaching_session ON public.calendar_events(is_coaching_session);
CREATE INDEX IF NOT EXISTS idx_calendar_events_is_blocked ON public.calendar_events(is_blocked);
CREATE INDEX IF NOT EXISTS idx_calendar_events_provider_event_id ON public.calendar_events(calendar_integration_id, provider_event_id);

-- =============================================================================
-- AUDIT LOGS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_phi_accessed ON public.audit_logs(phi_accessed);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON public.audit_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_timestamp ON public.audit_logs(resource, timestamp);

-- =============================================================================
-- CONSENTS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_consents_user_id ON public.consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_consent_type ON public.consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_consents_status ON public.consents(status);
CREATE INDEX IF NOT EXISTS idx_consents_user_type ON public.consents(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_consents_expires_at ON public.consents(expires_at);
CREATE INDEX IF NOT EXISTS idx_consents_granted_at ON public.consents(granted_at);

-- =============================================================================
-- PASSWORD RESET TOKENS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);

-- =============================================================================
-- PERFORMANCE METRICS TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_url ON public.performance_metrics(url);

-- =============================================================================
-- SESSION FEEDBACK TABLE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_session_feedback_session_id ON public.session_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_coach_id ON public.session_feedback(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_client_id ON public.session_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_feedback_type ON public.session_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_session_feedback_status ON public.session_feedback(status);
CREATE INDEX IF NOT EXISTS idx_session_feedback_due_date ON public.session_feedback(due_date);
CREATE INDEX IF NOT EXISTS idx_session_feedback_submitted_by ON public.session_feedback(submitted_by);

-- =============================================================================
-- ADDITIONAL CONSTRAINTS
-- =============================================================================

-- Ensure payment amounts are positive
ALTER TABLE public.payments ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);

-- Ensure session dates are not in the past (for new sessions)
-- Note: This constraint is commented out as it may interfere with data migration
-- ALTER TABLE public.sessions ADD CONSTRAINT chk_sessions_date_future CHECK (date >= CURRENT_TIMESTAMP);

-- Ensure feedback due dates are reasonable
ALTER TABLE public.session_feedback ADD CONSTRAINT chk_feedback_due_date_reasonable 
CHECK (due_date >= created_at AND due_date <= created_at + INTERVAL '30 days');

-- Ensure password reset tokens expire in the future when created
ALTER TABLE public.password_reset_tokens ADD CONSTRAINT chk_reset_token_expires_future 
CHECK (expires_at > created_at);

-- Ensure consent retention period is reasonable
ALTER TABLE public.consents ADD CONSTRAINT chk_consents_retention_reasonable 
CHECK (retention_period > 0 AND retention_period <= 3650); -- Max 10 years

-- Ensure file sizes are reasonable (max 100MB)
ALTER TABLE public.files ADD CONSTRAINT chk_files_size_reasonable 
CHECK (size > 0 AND size <= 104857600); 