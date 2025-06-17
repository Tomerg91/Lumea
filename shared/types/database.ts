/**
 * Database Types for Lumea Coaching Platform
 * Generated from Supabase schema migration files
 * 
 * This file contains TypeScript type definitions for all database tables
 * and provides type safety for Supabase client operations.
 */

// =============================================================================
// ENUMS AND UNIONS
// =============================================================================

export type UserRole = 'client' | 'coach' | 'admin';

export type UserStatus = 'active' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';

export type SessionStatus = 'Upcoming' | 'Completed' | 'Cancelled' | 'Rescheduled';

export type PaymentStatus = 'Due' | 'Paid' | 'Overdue' | 'Cancelled';

export type MoodType = 'positive' | 'neutral' | 'negative' | 'mixed';

export type ResourceType = 'article' | 'video' | 'document' | 'exercise';

export type FileContext = 'profile' | 'resource' | 'audio_note' | 'document';

export type NotificationType = 
  | 'session_cancelled' 
  | 'session_rescheduled' 
  | 'session_reminder' 
  | 'session_confirmation' 
  | 'cancellation_request' 
  | 'reschedule_request' 
  | 'feedback_request';

export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type CalendarProvider = 'google' | 'microsoft' | 'apple';

export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled';

export type CalendarEventVisibility = 'default' | 'public' | 'private';

export type CalendarSyncStatus = 'synced' | 'pending' | 'error';

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export type EventType = 'user_action' | 'system_event' | 'security_event' | 'data_access' | 'admin_action';

export type ConsentType = 
  | 'cookies' 
  | 'analytics' 
  | 'marketing' 
  | 'data_processing' 
  | 'communication' 
  | 'third_party_sharing' 
  | 'hipaa_authorization';

export type ConsentStatus = 'granted' | 'denied' | 'withdrawn' | 'expired';

export type LegalBasis = 
  | 'consent' 
  | 'legitimate_interest' 
  | 'contract' 
  | 'legal_obligation' 
  | 'vital_interests' 
  | 'public_task';

export type ConsentCategory = 
  | 'essential' 
  | 'functional' 
  | 'analytics' 
  | 'marketing' 
  | 'hipaa_treatment' 
  | 'hipaa_payment' 
  | 'hipaa_operations';

export type FeedbackType = 'coach' | 'client';

export type FeedbackStatus = 'pending' | 'submitted' | 'reviewed' | 'archived';

// =============================================================================
// CORE DATABASE TYPES
// =============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      sessions: {
        Row: Session;
        Insert: SessionInsert;
        Update: SessionUpdate;
      };
      payments: {
        Row: Payment;
        Insert: PaymentInsert;
        Update: PaymentUpdate;
      };
      reflections: {
        Row: Reflection;
        Insert: ReflectionInsert;
        Update: ReflectionUpdate;
      };
      resources: {
        Row: Resource;
        Insert: ResourceInsert;
        Update: ResourceUpdate;
      };
      resource_users: {
        Row: ResourceUser;
        Insert: ResourceUserInsert;
        Update: ResourceUserUpdate;
      };
      coach_notes: {
        Row: CoachNote;
        Insert: CoachNoteInsert;
        Update: CoachNoteUpdate;
      };
      files: {
        Row: File;
        Insert: FileInsert;
        Update: FileUpdate;
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
      };
      calendar_integrations: {
        Row: CalendarIntegration;
        Insert: CalendarIntegrationInsert;
        Update: CalendarIntegrationUpdate;
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: CalendarEventInsert;
        Update: CalendarEventUpdate;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
      };
      consents: {
        Row: Consent;
        Insert: ConsentInsert;
        Update: ConsentUpdate;
      };
      password_reset_tokens: {
        Row: PasswordResetToken;
        Insert: PasswordResetTokenInsert;
        Update: PasswordResetTokenUpdate;
      };
      performance_metrics: {
        Row: PerformanceMetric;
        Insert: PerformanceMetricInsert;
        Update: PerformanceMetricUpdate;
      };
      session_feedback: {
        Row: SessionFeedback;
        Insert: SessionFeedbackInsert;
        Update: SessionFeedbackUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// =============================================================================
// TABLE TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  id: string;
  email: string;
  name?: string | null;
  bio?: string | null;
  role?: UserRole;
  status?: UserStatus;
  created_at?: string;
  updated_at?: string;
}

export interface UserUpdate {
  id?: string;
  email?: string;
  name?: string | null;
  bio?: string | null;
  role?: UserRole;
  status?: UserStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  id: string;
  date: string;
  status: SessionStatus;
  notes: string | null;
  client_id: string;
  coach_id: string;
  payment_id: string | null;
  reminder_sent: boolean;
  audio_file: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionInsert {
  id?: string;
  date: string;
  status?: SessionStatus;
  notes?: string | null;
  client_id: string;
  coach_id: string;
  payment_id?: string | null;
  reminder_sent?: boolean;
  audio_file?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SessionUpdate {
  id?: string;
  date?: string;
  status?: SessionStatus;
  notes?: string | null;
  client_id?: string;
  coach_id?: string;
  payment_id?: string | null;
  reminder_sent?: boolean;
  audio_file?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  amount: number;
  status: PaymentStatus;
  due_date: string;
  client_id: string;
  coach_id: string;
  reminder_sent: boolean;
  sessions_covered: string[];
  created_at: string;
  updated_at: string;
}

export interface PaymentInsert {
  id?: string;
  amount: number;
  status?: PaymentStatus;
  due_date: string;
  client_id: string;
  coach_id: string;
  reminder_sent?: boolean;
  sessions_covered?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PaymentUpdate {
  id?: string;
  amount?: number;
  status?: PaymentStatus;
  due_date?: string;
  client_id?: string;
  coach_id?: string;
  reminder_sent?: boolean;
  sessions_covered?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Reflection {
  id: string;
  content: string;
  user_id: string;
  session_id: string | null;
  mood: MoodType | null;
  created_at: string;
  updated_at: string;
}

export interface ReflectionInsert {
  id?: string;
  content: string;
  user_id: string;
  session_id?: string | null;
  mood?: MoodType | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReflectionUpdate {
  id?: string;
  content?: string;
  user_id?: string;
  session_id?: string | null;
  mood?: MoodType | null;
  created_at?: string;
  updated_at?: string;
}

export interface Resource {
  id: string;
  title: string;
  content: string;
  type: string;
  url: string | null;
  resource_type: ResourceType | null;
  coach_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceInsert {
  id?: string;
  title: string;
  content: string;
  type: string;
  url?: string | null;
  resource_type?: ResourceType | null;
  coach_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResourceUpdate {
  id?: string;
  title?: string;
  content?: string;
  type?: string;
  url?: string | null;
  resource_type?: ResourceType | null;
  coach_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResourceUser {
  id: string;
  user_id: string;
  resource_id: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceUserInsert {
  id?: string;
  user_id: string;
  resource_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResourceUserUpdate {
  id?: string;
  user_id?: string;
  resource_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoachNote {
  id: string;
  coach_id: string;
  client_id: string;
  session_id: string | null;
  title: string;
  content: string;
  is_private: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CoachNoteInsert {
  id?: string;
  coach_id: string;
  client_id: string;
  session_id?: string | null;
  title: string;
  content: string;
  is_private?: boolean;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CoachNoteUpdate {
  id?: string;
  coach_id?: string;
  client_id?: string;
  session_id?: string | null;
  title?: string;
  content?: string;
  is_private?: boolean;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface File {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  storage_path: string;
  context: FileContext | null;
  created_at: string;
  updated_at: string;
}

export interface FileInsert {
  id?: string;
  user_id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  storage_path: string;
  context?: FileContext | null;
  created_at?: string;
  updated_at?: string;
}

export interface FileUpdate {
  id?: string;
  user_id?: string;
  filename?: string;
  original_name?: string;
  mimetype?: string;
  size?: number;
  storage_path?: string;
  context?: FileContext | null;
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  session_id: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject: string;
  html_body: string;
  text_body: string;
  variables: Record<string, any>;
  priority: NotificationPriority;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationInsert {
  id?: string;
  recipient_id: string;
  sender_id?: string | null;
  session_id?: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  status?: NotificationStatus;
  subject: string;
  html_body: string;
  text_body: string;
  variables?: Record<string, any>;
  priority?: NotificationPriority;
  scheduled_at?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  retry_count?: number;
  max_retries?: number;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationUpdate {
  id?: string;
  recipient_id?: string;
  sender_id?: string | null;
  session_id?: string | null;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  subject?: string;
  html_body?: string;
  text_body?: string;
  variables?: Record<string, any>;
  priority?: NotificationPriority;
  scheduled_at?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  retry_count?: number;
  max_retries?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  provider_account_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
  calendar_id: string | null;
  calendar_name: string | null;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync_at: string | null;
  sync_errors: Record<string, any> | null;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarIntegrationInsert {
  id?: string;
  user_id: string;
  provider: CalendarProvider;
  provider_account_id: string;
  access_token: string;
  refresh_token?: string | null;
  token_expiry?: string | null;
  calendar_id?: string | null;
  calendar_name?: string | null;
  is_active?: boolean;
  sync_enabled?: boolean;
  last_sync_at?: string | null;
  sync_errors?: Record<string, any> | null;
  settings?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarIntegrationUpdate {
  id?: string;
  user_id?: string;
  provider?: CalendarProvider;
  provider_account_id?: string;
  access_token?: string;
  refresh_token?: string | null;
  token_expiry?: string | null;
  calendar_id?: string | null;
  calendar_name?: string | null;
  is_active?: boolean;
  sync_enabled?: boolean;
  last_sync_at?: string | null;
  sync_errors?: Record<string, any> | null;
  settings?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarEvent {
  id: string;
  calendar_integration_id: string;
  provider_event_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  is_all_day: boolean;
  location: string | null;
  attendees: Record<string, any> | null;
  recurrence_rule: string | null;
  status: CalendarEventStatus;
  visibility: CalendarEventVisibility;
  session_id: string | null;
  is_coaching_session: boolean;
  is_blocked: boolean;
  last_sync_at: string | null;
  sync_status: CalendarSyncStatus;
  sync_errors: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventInsert {
  id?: string;
  calendar_integration_id: string;
  provider_event_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  timezone?: string;
  is_all_day?: boolean;
  location?: string | null;
  attendees?: Record<string, any> | null;
  recurrence_rule?: string | null;
  status?: CalendarEventStatus;
  visibility?: CalendarEventVisibility;
  session_id?: string | null;
  is_coaching_session?: boolean;
  is_blocked?: boolean;
  last_sync_at?: string | null;
  sync_status?: CalendarSyncStatus;
  sync_errors?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarEventUpdate {
  id?: string;
  calendar_integration_id?: string;
  provider_event_id?: string;
  title?: string;
  description?: string | null;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  is_all_day?: boolean;
  location?: string | null;
  attendees?: Record<string, any> | null;
  recurrence_rule?: string | null;
  status?: CalendarEventStatus;
  visibility?: CalendarEventVisibility;
  session_id?: string | null;
  is_coaching_session?: boolean;
  is_blocked?: boolean;
  last_sync_at?: string | null;
  sync_status?: CalendarSyncStatus;
  sync_errors?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  session_id: string | null;
  ip_address: string;
  user_agent: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  phi_accessed: boolean;
  phi_type: string | null;
  data_classification: DataClassification;
  event_type: EventType;
  http_method: string | null;
  endpoint: string | null;
  status_code: number | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  description: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface AuditLogInsert {
  id?: string;
  timestamp?: string;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  session_id?: string | null;
  ip_address: string;
  user_agent?: string | null;
  action: string;
  resource: string;
  resource_id?: string | null;
  phi_accessed?: boolean;
  phi_type?: string | null;
  data_classification: DataClassification;
  event_type: EventType;
  http_method?: string | null;
  endpoint?: string | null;
  status_code?: number | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  description: string;
  metadata?: Record<string, any> | null;
  created_at?: string;
}

export interface AuditLogUpdate {
  id?: string;
  timestamp?: string;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  session_id?: string | null;
  ip_address?: string;
  user_agent?: string | null;
  action?: string;
  resource?: string;
  resource_id?: string | null;
  phi_accessed?: boolean;
  phi_type?: string | null;
  data_classification?: DataClassification;
  event_type?: EventType;
  http_method?: string | null;
  endpoint?: string | null;
  status_code?: number | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  description?: string;
  metadata?: Record<string, any> | null;
  created_at?: string;
}

export interface Consent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  purpose: string;
  status: ConsentStatus;
  version: string;
  granted_at: string;
  withdrawn_at: string | null;
  expires_at: string | null;
  ip_address: string;
  user_agent: string;
  legal_basis: LegalBasis;
  category: ConsentCategory;
  is_required: boolean;
  data_processed: string[];
  retention_period: number;
  evidence_of_consent: Record<string, any>;
  compliance_flags: string[];
  created_at: string;
  updated_at: string;
}

export interface ConsentInsert {
  id?: string;
  user_id: string;
  consent_type: ConsentType;
  purpose: string;
  status?: ConsentStatus;
  version?: string;
  granted_at?: string;
  withdrawn_at?: string | null;
  expires_at?: string | null;
  ip_address: string;
  user_agent: string;
  legal_basis?: LegalBasis;
  category?: ConsentCategory;
  is_required?: boolean;
  data_processed?: string[];
  retention_period?: number;
  evidence_of_consent: Record<string, any>;
  compliance_flags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ConsentUpdate {
  id?: string;
  user_id?: string;
  consent_type?: ConsentType;
  purpose?: string;
  status?: ConsentStatus;
  version?: string;
  granted_at?: string;
  withdrawn_at?: string | null;
  expires_at?: string | null;
  ip_address?: string;
  user_agent?: string;
  legal_basis?: LegalBasis;
  category?: ConsentCategory;
  is_required?: boolean;
  data_processed?: string[];
  retention_period?: number;
  evidence_of_consent?: Record<string, any>;
  compliance_flags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PasswordResetToken {
  id: string;
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface PasswordResetTokenInsert {
  id?: string;
  token: string;
  user_id: string;
  expires_at: string;
  created_at?: string;
}

export interface PasswordResetTokenUpdate {
  id?: string;
  token?: string;
  user_id?: string;
  expires_at?: string;
  created_at?: string;
}

export interface PerformanceMetric {
  id: string;
  user_id: string | null;
  url: string | null;
  user_agent: string | null;
  ip_address: string | null;
  timestamp: string;
  metrics: Record<string, any>;
  created_at: string;
}

export interface PerformanceMetricInsert {
  id?: string;
  user_id?: string | null;
  url?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  timestamp?: string;
  metrics: Record<string, any>;
  created_at?: string;
}

export interface PerformanceMetricUpdate {
  id?: string;
  user_id?: string | null;
  url?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  timestamp?: string;
  metrics?: Record<string, any>;
  created_at?: string;
}

export interface SessionFeedback {
  id: string;
  session_id: string;
  coach_id: string;
  client_id: string;
  feedback_type: FeedbackType;
  submitted_by: string;
  status: FeedbackStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  due_date: string;
  ratings: Record<string, any>;
  overall_comments: string | null;
  private_notes: string | null;
  session_goals_met: boolean;
  session_goals_comments: string | null;
  challenges_faced: string | null;
  success_highlights: string | null;
  improvement_suggestions: string | null;
  next_session_focus: string | null;
  response_time: number | null;
  anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionFeedbackInsert {
  id?: string;
  session_id: string;
  coach_id: string;
  client_id: string;
  feedback_type: FeedbackType;
  submitted_by: string;
  status?: FeedbackStatus;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  due_date: string;
  ratings: Record<string, any>;
  overall_comments?: string | null;
  private_notes?: string | null;
  session_goals_met: boolean;
  session_goals_comments?: string | null;
  challenges_faced?: string | null;
  success_highlights?: string | null;
  improvement_suggestions?: string | null;
  next_session_focus?: string | null;
  response_time?: number | null;
  anonymous?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SessionFeedbackUpdate {
  id?: string;
  session_id?: string;
  coach_id?: string;
  client_id?: string;
  feedback_type?: FeedbackType;
  submitted_by?: string;
  status?: FeedbackStatus;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  due_date?: string;
  ratings?: Record<string, any>;
  overall_comments?: string | null;
  private_notes?: string | null;
  session_goals_met?: boolean;
  session_goals_comments?: string | null;
  challenges_faced?: string | null;
  success_highlights?: string | null;
  improvement_suggestions?: string | null;
  next_session_focus?: string | null;
  response_time?: number | null;
  anonymous?: boolean;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Type for any table name
export type Tables = keyof Database['public']['Tables'];

// Type for getting a table's row type
export type Row<T extends Tables> = Database['public']['Tables'][T]['Row'];

// Type for getting a table's insert type
export type Insert<T extends Tables> = Database['public']['Tables'][T]['Insert'];

// Type for getting a table's update type
export type Update<T extends Tables> = Database['public']['Tables'][T]['Update'];

// Helper types for common operations
export type UserWithProfile = User;
export type SessionWithRelations = Session & {
  client?: User;
  coach?: User;
  payment?: Payment;
};

export type ReflectionWithUser = Reflection & {
  user?: User;
  session?: Session;
};

export type CoachNoteWithRelations = CoachNote & {
  coach?: User;
  client?: User;
  session?: Session;
};

export type NotificationWithRelations = Notification & {
  recipient?: User;
  sender?: User;
  session?: Session;
};

// =============================================================================
// SUPABASE CLIENT TYPE
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

// Type for the typed Supabase client
export type TypedSupabaseClient = SupabaseClient<Database>;

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default Database;
