export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          bio: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          bio?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          bio?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          date: string
          status: string
          notes: string | null
          client_id: string
          coach_id: string
          payment_id: string | null
          reminder_sent: boolean
          audio_file: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          status?: string
          notes?: string | null
          client_id: string
          coach_id: string
          payment_id?: string | null
          reminder_sent?: boolean
          audio_file?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          status?: string
          notes?: string | null
          client_id?: string
          coach_id?: string
          payment_id?: string | null
          reminder_sent?: boolean
          audio_file?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          amount: number
          status: string
          due_date: string
          client_id: string
          coach_id: string
          reminder_sent: boolean
          sessions_covered: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amount: number
          status?: string
          due_date: string
          client_id: string
          coach_id: string
          reminder_sent?: boolean
          sessions_covered?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amount?: number
          status?: string
          due_date?: string
          client_id?: string
          coach_id?: string
          reminder_sent?: boolean
          sessions_covered?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      reflections: {
        Row: {
          id: string
          content: string
          user_id: string
          session_id: string | null
          mood: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          user_id: string
          session_id?: string | null
          mood?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          user_id?: string
          session_id?: string | null
          mood?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      resources: {
        Row: {
          id: string
          title: string
          content: string
          type: string
          url: string | null
          resource_type: string | null
          coach_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          type: string
          url?: string | null
          resource_type?: string | null
          coach_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          type?: string
          url?: string | null
          resource_type?: string | null
          coach_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      resource_users: {
        Row: {
          id: string
          user_id: string
          resource_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_users_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          }
        ]
      }
      coach_notes: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          session_id: string | null
          title: string
          content: string
          is_private: boolean
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          session_id?: string | null
          title: string
          content: string
          is_private?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          session_id?: string | null
          title?: string
          content?: string
          is_private?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      files: {
        Row: {
          id: string
          user_id: string
          filename: string
          original_name: string
          mimetype: string
          size: number
          storage_path: string
          context: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          original_name: string
          mimetype: string
          size: number
          storage_path: string
          context?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          original_name?: string
          mimetype?: string
          size?: number
          storage_path?: string
          context?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          sender_id: string | null
          session_id: string | null
          type: string
          channel: string
          status: string
          subject: string
          html_body: string
          text_body: string
          variables: Json
          priority: string
          scheduled_at: string | null
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          failed_at: string | null
          failure_reason: string | null
          retry_count: number
          max_retries: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          sender_id?: string | null
          session_id?: string | null
          type: string
          channel: string
          status?: string
          subject: string
          html_body: string
          text_body: string
          variables?: Json
          priority?: string
          scheduled_at?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          retry_count?: number
          max_retries?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          sender_id?: string | null
          session_id?: string | null
          type?: string
          channel?: string
          status?: string
          subject?: string
          html_body?: string
          text_body?: string
          variables?: Json
          priority?: string
          scheduled_at?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          retry_count?: number
          max_retries?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      calendar_integrations: {
        Row: {
          id: string
          user_id: string
          provider: string
          provider_account_id: string
          access_token: string
          refresh_token: string | null
          token_expiry: string | null
          calendar_id: string | null
          calendar_name: string | null
          is_active: boolean
          sync_enabled: boolean
          last_sync_at: string | null
          sync_errors: Json | null
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          provider_account_id: string
          access_token: string
          refresh_token?: string | null
          token_expiry?: string | null
          calendar_id?: string | null
          calendar_name?: string | null
          is_active?: boolean
          sync_enabled?: boolean
          last_sync_at?: string | null
          sync_errors?: Json | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          provider_account_id?: string
          access_token?: string
          refresh_token?: string | null
          token_expiry?: string | null
          calendar_id?: string | null
          calendar_name?: string | null
          is_active?: boolean
          sync_enabled?: boolean
          last_sync_at?: string | null
          sync_errors?: Json | null
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      calendar_events: {
        Row: {
          id: string
          calendar_integration_id: string
          provider_event_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          timezone: string
          is_all_day: boolean
          location: string | null
          attendees: Json | null
          recurrence_rule: string | null
          status: string
          visibility: string
          session_id: string | null
          is_coaching_session: boolean
          is_blocked: boolean
          last_sync_at: string | null
          sync_status: string
          sync_errors: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          calendar_integration_id: string
          provider_event_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          timezone?: string
          is_all_day?: boolean
          location?: string | null
          attendees?: Json | null
          recurrence_rule?: string | null
          status?: string
          visibility?: string
          session_id?: string | null
          is_coaching_session?: boolean
          is_blocked?: boolean
          last_sync_at?: string | null
          sync_status?: string
          sync_errors?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          calendar_integration_id?: string
          provider_event_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          timezone?: string
          is_all_day?: boolean
          location?: string | null
          attendees?: Json | null
          recurrence_rule?: string | null
          status?: string
          visibility?: string
          session_id?: string | null
          is_coaching_session?: boolean
          is_blocked?: boolean
          last_sync_at?: string | null
          sync_status?: string
          sync_errors?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_integration_id_fkey"
            columns: ["calendar_integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          timestamp: string
          user_id: string | null
          user_email: string | null
          user_role: string | null
          session_id: string | null
          ip_address: string
          user_agent: string | null
          action: string
          resource: string
          resource_id: string | null
          phi_accessed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          timestamp?: string
          user_id?: string | null
          user_email?: string | null
          user_role?: string | null
          session_id?: string | null
          ip_address: string
          user_agent?: string | null
          action: string
          resource: string
          resource_id?: string | null
          phi_accessed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          timestamp?: string
          user_id?: string | null
          user_email?: string | null
          user_role?: string | null
          session_id?: string | null
          ip_address?: string
          user_agent?: string | null
          action?: string
          resource?: string
          resource_id?: string | null
          phi_accessed?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      consents: {
        Row: {
          id: string
          user_id: string
          consent_type: string
          consent_text: string
          is_granted: boolean
          granted_at: string | null
          revoked_at: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          consent_type: string
          consent_text: string
          is_granted?: boolean
          granted_at?: string | null
          revoked_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          consent_type?: string
          consent_text?: string
          is_granted?: boolean
          granted_at?: string | null
          revoked_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      performance_metrics: {
        Row: {
          id: string
          user_id: string | null
          metric_name: string
          metric_value: number
          metric_unit: string | null
          tags: Json | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          metric_name: string
          metric_value: number
          metric_unit?: string | null
          tags?: Json | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          metric_name?: string
          metric_value?: number
          metric_unit?: string | null
          tags?: Json | null
          timestamp?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      session_feedback: {
        Row: {
          id: string
          session_id: string
          user_id: string
          rating: number
          feedback_text: string | null
          categories: string[] | null
          is_anonymous: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          rating: number
          feedback_text?: string | null
          categories?: string[] | null
          is_anonymous?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          rating?: number
          feedback_text?: string | null
          categories?: string[] | null
          is_anonymous?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Export individual table types for convenience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Export commonly used string literal types based on actual database constraints
export type UserRole = 'client' | 'coach' | 'admin'
export type SessionStatus = 'Upcoming' | 'Completed' | 'Cancelled' | 'Rescheduled'
export type PaymentStatus = 'Due' | 'Paid' | 'Overdue' | 'Cancelled'
export type ReflectionMood = 'positive' | 'neutral' | 'negative' | 'mixed'
export type FileContext = 'profile' | 'resource' | 'audio_note' | 'document'
export type NotificationType = 'session_cancelled' | 'session_rescheduled' | 'session_reminder' | 'session_confirmation' | 'cancellation_request' | 'reschedule_request' | 'feedback_request'
export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push'
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type CalendarProvider = 'google' | 'microsoft' | 'apple'
export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled'
export type CalendarEventVisibility = 'default' | 'public' | 'private'
export type CalendarSyncStatus = 'synced' | 'pending' | 'error'
export type ResourceType = 'article' | 'video' | 'document' | 'exercise'

// Export table row types with meaningful names
export type DatabaseUser = Tables<'users'>
export type DatabaseSession = Tables<'sessions'>
export type DatabasePayment = Tables<'payments'>
export type DatabaseReflection = Tables<'reflections'>
export type DatabaseResource = Tables<'resources'>
export type DatabaseCoachNote = Tables<'coach_notes'>
export type DatabaseFile = Tables<'files'>
export type DatabaseNotification = Tables<'notifications'>
export type DatabaseCalendarIntegration = Tables<'calendar_integrations'>
export type DatabaseCalendarEvent = Tables<'calendar_events'>
export type DatabaseAuditLog = Tables<'audit_logs'>
export type DatabaseConsent = Tables<'consents'>
export type DatabasePasswordResetToken = Tables<'password_reset_tokens'>
export type DatabasePerformanceMetric = Tables<'performance_metrics'>
export type DatabaseSessionFeedback = Tables<'session_feedback'>
export type DatabaseResourceUser = Tables<'resource_users'>

// Export insert types
export type DatabaseUserInsert = TablesInsert<'users'>
export type DatabaseSessionInsert = TablesInsert<'sessions'>
export type DatabasePaymentInsert = TablesInsert<'payments'>
export type DatabaseReflectionInsert = TablesInsert<'reflections'>
export type DatabaseResourceInsert = TablesInsert<'resources'>
export type DatabaseCoachNoteInsert = TablesInsert<'coach_notes'>
export type DatabaseFileInsert = TablesInsert<'files'>
export type DatabaseNotificationInsert = TablesInsert<'notifications'>
export type DatabaseCalendarIntegrationInsert = TablesInsert<'calendar_integrations'>
export type DatabaseCalendarEventInsert = TablesInsert<'calendar_events'>
export type DatabaseAuditLogInsert = TablesInsert<'audit_logs'>
export type DatabaseConsentInsert = TablesInsert<'consents'>
export type DatabasePasswordResetTokenInsert = TablesInsert<'password_reset_tokens'>
export type DatabasePerformanceMetricInsert = TablesInsert<'performance_metrics'>
export type DatabaseSessionFeedbackInsert = TablesInsert<'session_feedback'>
export type DatabaseResourceUserInsert = TablesInsert<'resource_users'>

// Export update types
export type DatabaseUserUpdate = TablesUpdate<'users'>
export type DatabaseSessionUpdate = TablesUpdate<'sessions'>
export type DatabasePaymentUpdate = TablesUpdate<'payments'>
export type DatabaseReflectionUpdate = TablesUpdate<'reflections'>
export type DatabaseResourceUpdate = TablesUpdate<'resources'>
export type DatabaseCoachNoteUpdate = TablesUpdate<'coach_notes'>
export type DatabaseFileUpdate = TablesUpdate<'files'>
export type DatabaseNotificationUpdate = TablesUpdate<'notifications'>
export type DatabaseCalendarIntegrationUpdate = TablesUpdate<'calendar_integrations'>
export type DatabaseCalendarEventUpdate = TablesUpdate<'calendar_events'>
export type DatabaseAuditLogUpdate = TablesUpdate<'audit_logs'>
export type DatabaseConsentUpdate = TablesUpdate<'consents'>
export type DatabasePasswordResetTokenUpdate = TablesUpdate<'password_reset_tokens'>
export type DatabasePerformanceMetricUpdate = TablesUpdate<'performance_metrics'>
export type DatabaseSessionFeedbackUpdate = TablesUpdate<'session_feedback'>
export type DatabaseResourceUserUpdate = TablesUpdate<'resource_users'>

// Supabase client types
import type { SupabaseClient } from '@supabase/supabase-js'

export type TypedSupabaseClient = SupabaseClient<Database>

// Utility types for Supabase operations
export type SupabaseAuthUser = {
  id: string
  email?: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
}

export type SupabaseSession = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: SupabaseAuthUser
}

export type SupabaseQueryResult<T> = {
  data: T | null
  error: Error | null
  count?: number | null
  status: number
  statusText: string
}

export type SupabaseInsertResult<T> = {
  data: T | null
  error: Error | null
  status: number
  statusText: string
}

export type SupabaseUpdateResult<T> = {
  data: T | null
  error: Error | null
  status: number
  statusText: string
}

export type SupabaseDeleteResult = {
  data: null
  error: Error | null
  status: number
  statusText: string
}

// Database utility types
export type DatabaseTableName = keyof Database['public']['Tables']
export type DatabaseColumnName<T extends DatabaseTableName> = keyof Database['public']['Tables'][T]['Row']
export type DatabaseRelationName<T extends DatabaseTableName> = Database['public']['Tables'][T]['Relationships'][number]['foreignKeyName'] 