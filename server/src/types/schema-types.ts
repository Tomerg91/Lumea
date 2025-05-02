import { z } from 'zod';
import {
  insertUserLinkSchema,
  insertSessionSchema,
  insertReflectionSchema,
  insertPaymentSchema,
  insertResourceSchema,
  insertResourceAccessSchema,
} from '@shared/schema';

// Export type helpers for schema validation results
export type ValidatedUserLink = z.infer<typeof insertUserLinkSchema>;
export type ValidatedSession = z.infer<typeof insertSessionSchema>;
export type ValidatedReflection = z.infer<typeof insertReflectionSchema>;
export type ValidatedPayment = z.infer<typeof insertPaymentSchema>;
export type ValidatedResource = z.infer<typeof insertResourceSchema>;
export type ValidatedResourceAccess = z.infer<typeof insertResourceAccessSchema>;

// Extended types for server use that include additional properties
export interface ExtendedSession extends ValidatedSession {
  id?: number;
  createdAt?: Date;
  // For reminders
  coachReflectionReminderSent?: boolean;
  clientReflectionReminderSent?: boolean;
  // For audio notes
  audioNotes?: string;
  // For date handling
  dateTime?: Date;
}

export interface ExtendedReflection extends ValidatedReflection {
  id?: number;
  createdAt?: Date;
  // For sharing with coach
  sharedWithCoach?: boolean;
  // For audio entries
  audioEntry?: string;
}

export interface ExtendedResource extends ValidatedResource {
  id?: number;
  createdAt?: Date;
  // For display settings
  visibleToClients?: boolean;
  featured?: boolean;
  // For categorization and filtering
  category?: string;
  difficulty?: string;
  languageCode?: string;
  durationMinutes?: number;
}
