// Export Prisma client and types
import { PrismaClient } from '@prisma/client';
import type { 
  User as PrismaUser,
  Session as PrismaSession,
  Payment as PrismaPayment,
  Reflection as PrismaReflection,
  Resource as PrismaResource,
  ResourceUser as PrismaResourceUser,
  PerformanceMetric as PrismaPerformanceMetric,
  CalendarIntegration as PrismaCalendarIntegration,
  CalendarEvent as PrismaCalendarEvent,
  CalendarSyncLog as PrismaCalendarSyncLog,
  PasswordResetToken as PrismaPasswordResetToken,
  MilestoneCategory as PrismaMilestoneCategory,
  Milestone as PrismaMilestone,
  MilestoneProgress as PrismaMilestoneProgress,
  CoachingSession as PrismaCoachingSession,
  CoachNote as PrismaCoachNote,
  AuditLog as PrismaAuditLog,
  SessionTiming as PrismaSessionTiming,
  File as PrismaFile,
  Tag as PrismaTag,
  Role as PrismaRole,
  UserRole as PrismaUserRole,
  CoachAvailability as PrismaCoachAvailability,
  SessionFeedback as PrismaSessionFeedback,
  SessionTemplate as PrismaSessionTemplate,
  TemplateSession as PrismaTemplateSession,
  FeedbackTemplate as PrismaFeedbackTemplate,
  FeedbackAnalytics as PrismaFeedbackAnalytics,
  ReflectionTemplate as PrismaReflectionTemplate,
  Notification as PrismaNotification,
  NotificationPreferences as PrismaNotificationPreferences,
  DeletionCertificate as PrismaDeletionCertificate,
  DataRetentionPolicy as PrismaDataRetentionPolicy,
  Consent as PrismaConsent,
  SessionHistory as PrismaSessionHistory,
  EncryptionKey as PrismaEncryptionKey,
  InviteToken as PrismaInviteToken,
} from '@prisma/client';

// Initialize Prisma client
export const prisma = new PrismaClient();

// Export Prisma types as model interfaces
export type IUser = PrismaUser;
export type ISession = PrismaSession;
export type IPayment = PrismaPayment;
export type IReflection = PrismaReflection;
export type IResource = PrismaResource;
export type IResourceUser = PrismaResourceUser;
export type IPerformanceMetric = PrismaPerformanceMetric;
export type ICalendarIntegration = PrismaCalendarIntegration;
export type ICalendarEvent = PrismaCalendarEvent;
export type ICalendarSyncLog = PrismaCalendarSyncLog;
export type IPasswordResetToken = PrismaPasswordResetToken;
export type IMilestoneCategory = PrismaMilestoneCategory;
export type IMilestone = PrismaMilestone;
export type IMilestoneProgress = PrismaMilestoneProgress;
export type ICoachingSession = PrismaCoachingSession;
export type ICoachNote = PrismaCoachNote;
export type IAuditLog = PrismaAuditLog;
export type ISessionTiming = PrismaSessionTiming;
export type IFile = PrismaFile;
export type ITag = PrismaTag;
export type IRole = PrismaRole;
export type IUserRole = PrismaUserRole;
export type ICoachAvailability = PrismaCoachAvailability;
export type ISessionFeedback = PrismaSessionFeedback;
export type ISessionTemplate = PrismaSessionTemplate;
export type ITemplateSession = PrismaTemplateSession;
export type IFeedbackTemplate = PrismaFeedbackTemplate;
export type IFeedbackAnalytics = PrismaFeedbackAnalytics;
export type IReflectionTemplate = PrismaReflectionTemplate;
export type INotification = PrismaNotification;
export type INotificationPreferences = PrismaNotificationPreferences;
export type IDeletionCertificate = PrismaDeletionCertificate;
export type IDataRetentionPolicy = PrismaDataRetentionPolicy;
export type IConsent = PrismaConsent;
export type ISessionHistory = PrismaSessionHistory;
export type IEncryptionKey = PrismaEncryptionKey;
export type IInviteToken = PrismaInviteToken;

// Export the Prisma models - these will be used as the "model classes" throughout the codebase
export const User = prisma.user;
export const Session = prisma.session;
export const Payment = prisma.payment;
export const Reflection = prisma.reflection;
export const Resource = prisma.resource;
export const ResourceUser = prisma.resourceUser;
export const PerformanceMetric = prisma.performanceMetric;
export const CalendarIntegration = prisma.calendarIntegration;
export const CalendarEvent = prisma.calendarEvent;
export const CalendarSyncLog = prisma.calendarSyncLog;
export const PasswordResetToken = prisma.passwordResetToken;
export const MilestoneCategory = prisma.milestoneCategory;
export const Milestone = prisma.milestone;
export const MilestoneProgress = prisma.milestoneProgress;
export const CoachingSession = prisma.coachingSession;
export const CoachNote = prisma.coachNote;
export const AuditLog = prisma.auditLog;
export const SessionTiming = prisma.sessionTiming;
export const File = prisma.file;
export const Tag = prisma.tag;
export const Role = prisma.role;
export const UserRole = prisma.userRole;
export const CoachAvailability = prisma.coachAvailability;
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
export const InviteToken = prisma.inviteToken;

// Legacy exports for compatibility with existing imports
export const NotificationTemplates = {
  create: (data: any) => prisma.notification.create({ data }),
  findMany: (args?: any) => prisma.notification.findMany(args),
  findFirst: (args?: any) => prisma.notification.findFirst(args),
  findUnique: (args: any) => prisma.notification.findUnique(args),
  update: (args: any) => prisma.notification.update(args),
  delete: (args: any) => prisma.notification.delete(args),
};

export const NotificationChannel = {
  EMAIL: 'email',
  SMS: 'sms', 
  PUSH: 'push',
  IN_APP: 'in_app',
};

export const ReflectionTemplates = {
  getAvailableTemplates: () => prisma.reflectionTemplate.findMany({ where: { isActive: true } }),
  create: (data: any) => prisma.reflectionTemplate.create({ data }),
  findMany: (args?: any) => prisma.reflectionTemplate.findMany(args),
  findFirst: (args?: any) => prisma.reflectionTemplate.findFirst(args),
  findUnique: (args: any) => prisma.reflectionTemplate.findUnique(args),
  update: (args: any) => prisma.reflectionTemplate.update(args),
  delete: (args: any) => prisma.reflectionTemplate.delete(args),
};

// Export additional types that might be needed
export type { Prisma } from '@prisma/client';

// Export the prisma client as default
export default prisma; 