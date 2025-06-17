// Main types export file
// This file exports all type definitions used throughout the application

// Database types (from shared source of truth)
import type {
  Database,
  UserRole,
  SessionStatus,
  PaymentStatus,
  NotificationStatus,
  NotificationChannel,
  CalendarProvider,
  TypedSupabaseClient,
  // Database table types
  User,
  Session,
  Payment,
  Reflection,
  Resource,
  CoachNote,
  File,
  Notification,
  CalendarIntegration,
  // Insert types
  UserInsert,
  SessionInsert,
  PaymentInsert,
  ReflectionInsert,
  ResourceInsert,
  CoachNoteInsert,
  FileInsert,
  NotificationInsert,
  CalendarIntegrationInsert,
  // Update types
  UserUpdate,
  SessionUpdate,
  PaymentUpdate,
  ReflectionUpdate,
  ResourceUpdate,
  CoachNoteUpdate,
  FileUpdate,
  NotificationUpdate,
  CalendarIntegrationUpdate,
  // Utility types
  Tables,
  Row,
  Insert,
  Update
} from '../../../shared/types/database';

// Re-export all imported types
export type {
  Database,
  UserRole,
  SessionStatus,
  PaymentStatus,
  NotificationStatus,
  NotificationChannel,
  CalendarProvider,
  TypedSupabaseClient,
  // Database table types
  User,
  Session,
  Payment,
  Reflection,
  Resource,
  CoachNote,
  File,
  Notification,
  CalendarIntegration,
  // Insert types
  UserInsert,
  SessionInsert,
  PaymentInsert,
  ReflectionInsert,
  ResourceInsert,
  CoachNoteInsert,
  FileInsert,
  NotificationInsert,
  CalendarIntegrationInsert,
  // Update types
  UserUpdate,
  SessionUpdate,
  PaymentUpdate,
  ReflectionUpdate,
  ResourceUpdate,
  CoachNoteUpdate,
  FileUpdate,
  NotificationUpdate,
  CalendarIntegrationUpdate,
  // Utility types
  Tables,
  Row,
  Insert,
  Update
};

// Application-specific types
export * from './analytics';
export type { SessionTemplate } from './sessionTemplate';

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
