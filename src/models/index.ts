import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client instance
const prisma = new PrismaClient();

// Export the Prisma client instance
export default prisma;

// Export the Prisma client class
export { PrismaClient };

// Export model classes/types for backwards compatibility
export const User = prisma.user;
export const Session = prisma.session;
export const CoachNote = prisma.coachNote;
export const AuditLog = prisma.auditLog;
export const Reflection = prisma.reflection;
export const File = prisma.file;
export const Tag = prisma.tag;
export const Role = prisma.role;
export const CoachingSession = prisma.coachingSession;
export const SessionFeedback = prisma.sessionFeedback;
export const SessionTemplate = prisma.sessionTemplate;
export const TemplateSession = prisma.templateSession;
export const FeedbackTemplate = prisma.feedbackTemplate;
export const FeedbackAnalytics = prisma.feedbackAnalytics;
export const ReflectionTemplate = prisma.reflectionTemplate;
export const Notification = prisma.notification;
export const NotificationPreferences = prisma.notificationPreferences;
export const DeletionCertificate = prisma.deletionCertificate;
export const DataRetentionPolicy = prisma.dataRetentionPolicy;
export const Consent = prisma.consent;
export const SessionHistory = prisma.sessionHistory;
export const EncryptionKey = prisma.encryptionKey;
export const PasswordResetToken = prisma.passwordResetToken;
export const InviteToken = prisma.inviteToken;
export const SessionTiming = prisma.sessionTiming;
export const CoachAvailability = prisma.coachAvailability;

// Export Payment and other missing models
export const Payment = prisma.payment;
export const CalendarIntegration = prisma.calendarIntegration;
export const CalendarEvent = prisma.calendarEvent;
export const Resource = prisma.resource;
export const ResourceUser = prisma.resourceUser;
export const PerformanceMetric = prisma.performanceMetric;
export const MilestoneCategory = prisma.milestoneCategory;
export const Milestone = prisma.milestone;
export const MilestoneProgress = prisma.milestoneProgress;
export const UserRole = prisma.userRole;

// Export the interface types from the individual files
export * from './User';
export * from './Session';
export * from './CoachNote';
export * from './AuditLog';
export * from './Reflection';
export * from './File';
export * from './Tag';
export * from './Role';
export * from './CoachingSession';
export * from './SessionFeedback';
export * from './SessionTemplate';
export * from './TemplateSession';
export * from './FeedbackTemplate';
export * from './FeedbackAnalytics';
export * from './ReflectionTemplate';
export * from './Notification';
export * from './NotificationPreferences';
export * from './DeletionCertificate';
export * from './DataRetentionPolicy';
export * from './Consent';
export * from './SessionHistory';
export * from './EncryptionKey';
export * from './PasswordResetToken';
export * from './InviteToken';
export * from './SessionTiming';
export * from './CoachAvailability'; 