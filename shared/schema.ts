import { pgTable, text, serial, integer, boolean, timestamp, real } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// User model - both coaches and clients
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['coach', 'client'] }).notNull(),
  profilePicture: text('profile_picture'),
  phone: text('phone'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define schema with explicit types
export const insertUserSchema = createInsertSchema(users)
  .extend({
    id: z.number().optional(),
    createdAt: z.date().optional(),
  })
  .omit({ id: true, createdAt: true });

// UserLink model - connects coaches to clients
export const userLinks = pgTable('user_links', {
  id: serial('id').primaryKey(),
  coachId: integer('coach_id').notNull(),
  clientId: integer('client_id').notNull(),
  notes: text('notes'),
  status: text('status', { enum: ['active', 'inactive'] })
    .default('active')
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define schema with explicit types
export const insertUserLinkSchema = createInsertSchema(userLinks)
  .extend({
    id: z.number().optional(),
    createdAt: z.date().optional(),
  })
  .omit({ id: true, createdAt: true });

// Session model - coaching sessions
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  coachId: integer('coach_id').notNull(),
  clientId: integer('client_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: text('status', { enum: ['scheduled', 'cancelled', 'completed'] })
    .default('scheduled')
    .notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define schema with explicit types
export const insertSessionSchema = createInsertSchema(sessions)
  .extend({
    id: z.number().optional(),
    createdAt: z.date().optional(),
  })
  .omit({ id: true, createdAt: true });

// Reflection model - client reflections
export const reflections = pgTable('reflections', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull(),
  sessionId: integer('session_id'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  mood: text('mood', { enum: ['positive', 'neutral', 'negative', 'mixed'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define schema with explicit types
export const insertReflectionSchema = createInsertSchema(reflections)
  .extend({
    id: z.number().optional(),
    createdAt: z.date().optional(),
  })
  .omit({ id: true, createdAt: true });

// Payment model - client payments to coaches
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  coachId: integer('coach_id').notNull(),
  clientId: integer('client_id').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').default('USD').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'failed', 'refunded'] })
    .default('pending')
    .notNull(),
  paymentDate: timestamp('payment_date').defaultNow().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define schema with explicit types
export const insertPaymentSchema = createInsertSchema(payments)
  .extend({
    id: z.number().optional(),
    createdAt: z.date().optional(),
  })
  .omit({ id: true, createdAt: true });

// Resource model - Coaching resources (documents, videos, etc.)
export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  coachId: integer('coach_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { enum: ['document', 'video', 'audio', 'link', 'other'] }).notNull(),
  url: text('url').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define schema with explicit types
export const insertResourceSchema = createInsertSchema(resources)
  .extend({
    id: z.number().optional(),
    createdAt: z.date().optional(),
  })
  .omit({ id: true, createdAt: true });

// ResourceAccess model - Tracks which clients have access to which resources
export const resourceAccess = pgTable('resource_access', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull(),
  clientId: integer('client_id').notNull(),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define schema with explicit types
export const insertResourceAccessSchema = createInsertSchema(resourceAccess)
  .extend({
    id: z.number().optional(),
    createdAt: z.date().optional(),
  })
  .omit({ id: true, createdAt: true });

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserLink = typeof userLinks.$inferSelect;
export type InsertUserLink = z.infer<typeof insertUserLinkSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Reflection = typeof reflections.$inferSelect;
export type InsertReflection = z.infer<typeof insertReflectionSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export type ResourceAccess = typeof resourceAccess.$inferSelect;
export type InsertResourceAccess = z.infer<typeof insertResourceAccessSchema>;
