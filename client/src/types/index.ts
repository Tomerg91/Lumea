// Main types export file
// This file exports all type definitions used throughout the application

// Database types (from shared source of truth)
export type {
  Database,
  Json,
  UserRole,
  SessionStatus,
  PaymentStatus,
  NotificationStatus,
  CalendarProvider,
  TypedSupabaseClient,
  // Database table types
  DatabaseUser,
  DatabaseSession,
  DatabasePayment,
  DatabaseReflection,
  DatabaseResource,
  DatabaseCoachNote,
  DatabaseFile,
  DatabaseNotification,
  DatabaseCalendarIntegration,
  // Insert types
  DatabaseUserInsert,
  DatabaseSessionInsert,
  DatabasePaymentInsert,
  DatabaseReflectionInsert,
  DatabaseResourceInsert,
  DatabaseCoachNoteInsert,
  DatabaseFileInsert,
  DatabaseNotificationInsert,
  DatabaseCalendarIntegrationInsert,
  // Update types
  DatabaseUserUpdate,
  DatabaseSessionUpdate,
  DatabasePaymentUpdate,
  DatabaseReflectionUpdate,
  DatabaseResourceUpdate,
  DatabaseCoachNoteUpdate,
  DatabaseFileUpdate,
  DatabaseNotificationUpdate,
  DatabaseCalendarIntegrationUpdate,
  // Utility types
  DatabaseTableName,
  DatabaseColumnName
} from '../../../shared/types/database';

// Application-specific types
export * from './analytics';
export type { SessionTemplate } from './sessionTemplate';

// Convenience type aliases for common usage
export type User = DatabaseUser;
export type Session = DatabaseSession;
export type Payment = DatabasePayment;
export type Reflection = DatabaseReflection;
export type Resource = DatabaseResource;
export type CoachNote = DatabaseCoachNote;
export type File = DatabaseFile;
export type Notification = DatabaseNotification;
export type CalendarIntegration = DatabaseCalendarIntegration;

// Insert types
export type UserInsert = DatabaseUserInsert;
export type SessionInsert = DatabaseSessionInsert;
export type PaymentInsert = DatabasePaymentInsert;
export type ReflectionInsert = DatabaseReflectionInsert;
export type ResourceInsert = DatabaseResourceInsert;
export type CoachNoteInsert = DatabaseCoachNoteInsert;
export type FileInsert = DatabaseFileInsert;
export type NotificationInsert = DatabaseNotificationInsert;
export type CalendarIntegrationInsert = DatabaseCalendarIntegrationInsert;

// Update types
export type UserUpdate = DatabaseUserUpdate;
export type SessionUpdate = DatabaseSessionUpdate;
export type PaymentUpdate = DatabasePaymentUpdate;
export type ReflectionUpdate = DatabaseReflectionUpdate;
export type ResourceUpdate = DatabaseResourceUpdate;
export type CoachNoteUpdate = DatabaseCoachNoteUpdate;
export type FileUpdate = DatabaseFileUpdate;
export type NotificationUpdate = DatabaseNotificationUpdate;
export type CalendarIntegrationUpdate = DatabaseCalendarIntegrationUpdate;

// Client-specific interfaces that extend database types
export interface Client extends User {
  role: 'client';
}

export interface Coach extends User {
  role: 'coach';
}

export interface Admin extends User {
  role: 'admin';
}
