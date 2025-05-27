import { z } from 'zod';

// Common validation patterns
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s\-()]+$/;
const urlPattern = /^https?:\/\/.+/;

// Common field validators
export const commonValidators = {
  objectId: z.string().regex(objectIdPattern, 'Invalid ObjectId format'),
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  phone: z.string().regex(phonePattern, 'Invalid phone number format').optional(),
  url: z.string().url('Invalid URL format').optional(),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  timezone: z.string().max(50).optional(),
  language: z.enum(['en', 'he'], { errorMap: () => ({ message: 'Language must be either "en" or "he"' }) }),
  dateTime: z.string().datetime('Invalid datetime format'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().min(0, 'Must be non-negative'),
};

// User validation schemas
export const userSchemas = {
  register: z.object({
    firstName: commonValidators.name,
    lastName: commonValidators.name,
    email: commonValidators.email,
    password: commonValidators.password,
    role: z.enum(['client', 'coach', 'admin']).default('client'),
    phone: commonValidators.phone,
    timezone: commonValidators.timezone,
    language: commonValidators.language.default('en'),
  }),

  login: z.object({
    email: commonValidators.email,
    password: z.string().min(1, 'Password is required'),
  }),

  updateProfile: z.object({
    firstName: commonValidators.name.optional(),
    lastName: commonValidators.name.optional(),
    phone: commonValidators.phone,
    timezone: commonValidators.timezone,
    language: commonValidators.language.optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonValidators.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  resetPassword: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: commonValidators.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  forgotPassword: z.object({
    email: commonValidators.email,
  }),
};

// Session validation schemas
export const sessionSchemas = {
  create: z.object({
    coachId: commonValidators.objectId,
    clientId: commonValidators.objectId,
    dateTime: commonValidators.dateTime,
    duration: z.number().min(15, 'Session must be at least 15 minutes').max(480, 'Session cannot exceed 8 hours'),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).default('scheduled'),
    paymentStatus: z.enum(['pending', 'paid', 'overdue']).default('pending'),
    isRecurring: z.boolean().default(false),
    recurrenceRule: z.string().optional(),
    recurrenceEndDate: commonValidators.dateTime.optional(),
    notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
  }),

  update: z.object({
    dateTime: commonValidators.dateTime.optional(),
    duration: z.number().min(15).max(480).optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
    paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
    isRecurring: z.boolean().optional(),
    recurrenceRule: z.string().optional(),
    recurrenceEndDate: commonValidators.dateTime.optional(),
    notes: z.string().max(2000).optional(),
  }),

  query: z.object({
    clientId: commonValidators.objectId.optional(),
    coachId: commonValidators.objectId.optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
    startDate: commonValidators.dateTime.optional(),
    endDate: commonValidators.dateTime.optional(),
    limit: z.coerce.number().min(1).max(100).default(10),
    page: z.coerce.number().min(1).default(1),
    sortBy: z.enum(['dateTime', 'createdAt', 'status']).default('dateTime'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),

  params: z.object({
    id: commonValidators.objectId,
  }),
};

// Coach Note validation schemas
export const coachNoteSchemas = {
  privacySettings: z.object({
    accessLevel: z.enum(['private', 'supervisor', 'team', 'organization']).default('private'),
    allowExport: z.boolean().default(false),
    allowSharing: z.boolean().default(false),
    retentionPeriodDays: z.number().min(1).max(3650).optional(), // Max 10 years
    autoDeleteAfterDays: z.number().min(1).max(3650).optional(),
    requireReasonForAccess: z.boolean().default(false),
    sensitiveContent: z.boolean().default(false),
    supervisionRequired: z.boolean().default(false),
  }),

  create: z.object({
    sessionId: commonValidators.objectId,
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').optional(),
    textContent: z.string().min(1, 'Content is required').max(10000, 'Content cannot exceed 10000 characters'),
    audioFileId: commonValidators.objectId.optional(),
    tags: z.array(z.string().min(1).max(50)).max(20, 'Cannot have more than 20 tags').optional(),
    isEncrypted: z.boolean().default(true),
    privacySettings: z.lazy(() => coachNoteSchemas.privacySettings).optional(),
    sharedWith: z.array(commonValidators.objectId).max(50, 'Cannot share with more than 50 users').optional(),
  }),

  update: z.object({
    title: z.string().min(1).max(200).optional(),
    textContent: z.string().min(1).max(10000).optional(),
    audioFileId: commonValidators.objectId.optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
    isEncrypted: z.boolean().optional(),
    privacySettings: z.lazy(() => coachNoteSchemas.privacySettings).optional(),
    sharedWith: z.array(commonValidators.objectId).max(50).optional(),
  }),

  query: z.object({
    sessionId: commonValidators.objectId.optional(),
    clientId: commonValidators.objectId.optional(),
    tags: z.string().optional(), // Comma-separated tags
    search: z.string().max(100).optional(),
    accessLevel: z.enum(['private', 'supervisor', 'team', 'organization']).optional(),
    startDate: commonValidators.dateTime.optional(),
    endDate: commonValidators.dateTime.optional(),
    limit: z.coerce.number().min(1).max(100).default(10),
    page: z.coerce.number().min(1).default(1),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  share: z.object({
    userIds: z.array(commonValidators.objectId).min(1, 'At least one user must be specified').max(50),
    reason: z.string().min(1, 'Reason for sharing is required').max(500),
  }),

  params: z.object({
    id: commonValidators.objectId,
  }),
};

// Reflection validation schemas
export const reflectionSchemas = {
  answer: z.object({
    questionId: z.string().min(1, 'Question ID is required'),
    value: z.union([
      z.string().max(5000, 'Answer cannot exceed 5000 characters'),
      z.number(),
      z.boolean()
    ]),
    followUpAnswer: z.string().max(2000, 'Follow-up answer cannot exceed 2000 characters').optional(),
  }),

  create: z.object({
    sessionId: commonValidators.objectId,
    textContent: z.string().min(1, 'Content is required').max(10000, 'Content cannot exceed 10000 characters'),
    audioFileId: commonValidators.objectId.optional(),
    answers: z.array(z.lazy(() => reflectionSchemas.answer)).optional(),
    status: z.enum(['draft', 'submitted']).default('draft'),
    estimatedCompletionMinutes: commonValidators.positiveNumber.optional(),
    actualCompletionMinutes: commonValidators.nonNegativeNumber.optional(),
  }),

  update: z.object({
    textContent: z.string().min(1).max(10000).optional(),
    audioFileId: commonValidators.objectId.optional(),
    answers: z.array(z.lazy(() => reflectionSchemas.answer)).optional(),
    status: z.enum(['draft', 'submitted']).optional(),
    estimatedCompletionMinutes: commonValidators.positiveNumber.optional(),
    actualCompletionMinutes: commonValidators.nonNegativeNumber.optional(),
  }),

  query: z.object({
    sessionId: commonValidators.objectId.optional(),
    status: z.enum(['draft', 'submitted']).optional(),
    startDate: commonValidators.dateTime.optional(),
    endDate: commonValidators.dateTime.optional(),
    limit: z.coerce.number().min(1).max(100).default(10),
    page: z.coerce.number().min(1).default(1),
    sortBy: z.enum(['createdAt', 'updatedAt', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  params: z.object({
    id: commonValidators.objectId,
  }),
};

// File/Audio validation schemas
export const fileSchemas = {
  presignedUpload: z.object({
    mimeType: z.string().refine(
      (type) => type.startsWith('audio/') || type.startsWith('image/') || type.startsWith('video/'),
      'MIME type must be audio, image, or video format'
    ),
    fileSize: z.number().min(1, 'File size must be greater than 0').max(100 * 1024 * 1024, 'File size cannot exceed 100MB'),
    context: z.enum(['profile', 'resource', 'audio_note', 'reflection']).optional(),
  }),

  create: z.object({
    s3Key: z.string().min(1, 'S3 key is required'),
    filename: z.string().min(1, 'Filename is required').max(255),
    mimeType: z.string().min(1, 'MIME type is required'),
    size: commonValidators.positiveNumber,
    duration: commonValidators.nonNegativeNumber.optional(),
    context: z.enum(['profile', 'resource', 'audio_note', 'reflection']).optional(),
  }),

  params: z.object({
    id: commonValidators.objectId,
  }),
};

// Tag validation schemas
export const tagSchemas = {
  create: z.object({
    name: z.string().min(1, 'Tag name is required').max(50, 'Tag name cannot exceed 50 characters'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
    description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(50).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    description: z.string().max(200).optional(),
  }),

  query: z.object({
    search: z.string().max(100).optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
    page: z.coerce.number().min(1).default(1),
    sortBy: z.enum(['name', 'createdAt', 'usageCount']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),

  params: z.object({
    id: commonValidators.objectId,
  }),
};

// Admin validation schemas
export const adminSchemas = {
  createUser: z.object({
    firstName: commonValidators.name,
    lastName: commonValidators.name,
    email: commonValidators.email,
    role: z.enum(['client', 'coach', 'admin']),
    phone: commonValidators.phone,
    timezone: commonValidators.timezone,
    language: commonValidators.language.default('en'),
    sendInvite: z.boolean().default(true),
  }),

  updateUser: z.object({
    firstName: commonValidators.name.optional(),
    lastName: commonValidators.name.optional(),
    email: commonValidators.email.optional(),
    role: z.enum(['client', 'coach', 'admin']).optional(),
    phone: commonValidators.phone,
    timezone: commonValidators.timezone,
    language: commonValidators.language.optional(),
    isActive: z.boolean().optional(),
  }),

  userQuery: z.object({
    role: z.enum(['client', 'coach', 'admin']).optional(),
    isActive: z.boolean().optional(),
    search: z.string().max(100).optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    page: z.coerce.number().min(1).default(1),
    sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt', 'role']).default('firstName'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
};

// Additional validation for audit trail access
export const auditTrail = z.object({
  params: z.object({
    id: commonValidators.objectId
  })
});

// Search and discovery validation schemas
export const search = {
  // Search coach notes with full-text search and filtering
  coachNotes: z.object({
    query: z.object({
      query: z.string().optional(),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
      accessLevel: z.union([
        z.enum(['private', 'supervisor', 'team', 'organization']),
        z.array(z.enum(['private', 'supervisor', 'team', 'organization']))
      ]).optional(),
      dateStart: z.string().datetime().optional(),
      dateEnd: z.string().datetime().optional(),
      coachId: commonValidators.objectId.optional(),
      sessionId: commonValidators.objectId.optional(),
      page: z.string().regex(/^\d+$/).transform(Number).optional(),
      limit: z.string().regex(/^\d+$/).transform(Number).optional(),
      sortBy: z.enum(['relevance', 'date', 'title', 'lastAccess']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional()
    })
  }),

  // Get search suggestions
  suggestions: z.object({
    query: z.object({
      query: z.string().min(1, 'Query is required').max(100, 'Query too long'),
      limit: z.string().regex(/^\d+$/).transform(Number).optional()
    })
  }),

  // Get popular tags
  popularTags: z.object({
    query: z.object({
      limit: z.string().regex(/^\d+$/).transform(Number).optional()
    })
  })
};

// Export all schemas grouped by domain
export const validationSchemas = {
  user: userSchemas,
  session: sessionSchemas,
  coachNote: coachNoteSchemas,
  reflection: reflectionSchemas,
  file: fileSchemas,
  tag: tagSchemas,
  admin: adminSchemas,
  common: commonValidators,
  auditTrail: auditTrail,
  search: search,
}; 