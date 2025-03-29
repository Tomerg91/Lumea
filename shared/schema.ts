import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model - both coaches and clients
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["coach", "client"] }).notNull(),
  profilePicture: text("profile_picture"),
  phone: text("phone"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// UserLink model - connects coaches to clients
export const userLinks = pgTable("user_links", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  status: text("status", { enum: ["active", "pending", "inactive"] }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserLinkSchema = createInsertSchema(userLinks).omit({
  id: true,
  createdAt: true,
});

// Session model
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  dateTime: timestamp("date_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  status: text("status", { enum: ["scheduled", "completed", "cancelled", "rescheduled"] }).notNull().default("scheduled"),
  textNotes: text("text_notes"),
  audioNotes: text("audio_notes"),
  clientReflectionReminderSent: boolean("client_reflection_reminder_sent").notNull().default(false),
  coachReflectionReminderSent: boolean("coach_reflection_reminder_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

// Reflection model
export const reflections = pgTable("reflections", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => sessions.id),
  title: text("title").notNull(),
  textEntry: text("text_entry").notNull(),
  audioEntry: text("audio_entry"),
  sharedWithCoach: boolean("shared_with_coach").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReflectionSchema = createInsertSchema(reflections).omit({
  id: true,
  createdAt: true,
});

// Payment model
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  coachId: integer("coach_id").notNull().references(() => users.id),
  amount: real("amount").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status", { enum: ["pending", "paid", "overdue"] }).notNull().default("pending"),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  sessionsCovered: integer("sessions_covered").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Resource model
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  type: text("type", { enum: ["pdf", "audio", "video", "image", "text", "other"] }).notNull(),
  category: text("category", { 
    enum: ["mindfulness", "exercises", "assessments", "readings", "worksheets", "general"] 
  }).notNull().default("general"),
  tags: text("tags").array(),
  difficulty: text("difficulty", { enum: ["beginner", "intermediate", "advanced"] }).default("beginner"),
  languageCode: text("language_code").default("he"),
  durationMinutes: integer("duration_minutes"),
  visibleToClients: boolean("visible_to_clients").notNull().default(true),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
});

// Resource Access model
export const resourceAccess = pgTable("resource_access", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id").notNull().references(() => resources.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResourceAccessSchema = createInsertSchema(resourceAccess).omit({
  id: true,
  createdAt: true,
});

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
