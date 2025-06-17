export enum NoteAccessLevel {
  PRIVATE = 'private',
  SUPERVISOR = 'supervisor',
  TEAM = 'team',
  ORGANIZATION = 'organization'
}

export enum AuditAction {
  CREATED = 'created',
  VIEWED = 'viewed',
  UPDATED = 'updated',
  DELETED = 'deleted',
  SHARED = 'shared',
  UNSHARED = 'unshared',
  EXPORTED = 'exported',
  ARCHIVED = 'archived',
  RESTORED = 'restored',
  BULK_UPDATED = 'bulk_updated',
  CATEGORY_ASSIGNED = 'category_assigned',
  PRIVACY_CHANGED = 'privacy_changed'
}

export interface AuditEntry {
  action: AuditAction;
  userId: string;
  userRole: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export interface NotePrivacySettings {
  accessLevel: NoteAccessLevel;
  allowExport: boolean;
  allowSharing: boolean;
  retentionPeriodDays?: number;
  autoDeleteAfterDays?: number;
  requireReasonForAccess: boolean;
  sensitiveContent: boolean;
  supervisionRequired: boolean;
}

export interface CoachNote {
  _id: string;
  sessionId: string;
  coachId: string;
  textContent: string;
  title?: string;
  audioFileId?: string;
  tags?: string[];
  isEncrypted: boolean;
  
  // Privacy and access control
  privacySettings: NotePrivacySettings;
  accessLevel: NoteAccessLevel;
  sharedWith: string[];
  
  // Archive status
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  
  // Organization
  categoryId?: string;
  folderId?: string;
  
  // Audit trail
  auditTrail: AuditEntry[];
  lastAccessedAt?: string;
  accessCount: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  encryptionVersion?: string;
  
  // Backward compatibility
  client?: string;
  visibility?: 'private' | 'private_to_coach' | 'shared' | 'public';
}

export interface CreateCoachNoteRequest {
  sessionId: string;
  textContent: string;
  title?: string;
  audioFileId?: string;
  tags?: string[];
  isEncrypted?: boolean;
  privacySettings?: NotePrivacySettings;
  sharedWith?: string[];
}

export interface UpdateCoachNoteRequest {
  textContent?: string;
  title?: string;
  audioFileId?: string;
  tags?: string[];
  isEncrypted?: boolean;
  privacySettings?: NotePrivacySettings;
  sharedWith?: string[];
  isArchived?: boolean;
  archiveReason?: string;
  categoryId?: string;
}

export interface CoachNoteFilters {
  sessionId?: string;
  clientId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface CoachNotesResponse {
  notes: CoachNote[];
  total: number;
  page: number;
  limit: number;
}

// New organization and categorization interfaces
export interface NoteCategory {
  _id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  parentCategoryId?: string;
  coachId: string;
  isSystem: boolean; // System categories vs custom categories
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFolder {
  _id: string;
  name: string;
  description?: string;
  parentFolderId?: string;
  coachId: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteTemplate {
  _id: string;
  name: string;
  description?: string;
  content: string;
  categoryId?: string;
  tags: string[];
  coachId: string;
  isSystem: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCollection {
  _id: string;
  name: string;
  description?: string;
  coachId: string;
  noteIds: string[];
  color?: string;
  icon?: string;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteLinkage {
  _id: string;
  sourceNoteId: string;
  targetNoteId: string;
  linkType: 'reference' | 'followup' | 'related' | 'supersedes' | 'custom';
  description?: string;
  createdBy: string;
  createdAt: string;
}

export interface NoteOrganizationAnalytics {
  totalNotes: number;
  categorizedNotes: number;
  folderizedNotes: number;
  linkedNotes: number;
  templatedNotes: number;
  taggedNotes: number;
  categoryUsage: Array<{
    categoryId: string;
    categoryName: string;
    noteCount: number;
    percentage: number;
  }>;
  folderUsage: Array<{
    folderId: string;
    folderName: string;
    noteCount: number;
    percentage: number;
  }>;
  templateUsage: Array<{
    templateId: string;
    templateName: string;
    usageCount: number;
  }>;
  organizationScore: number; // 0-100 based on how well organized notes are
}

// Enhanced CoachNote interface with organization fields
export interface EnhancedCoachNote extends CoachNote {
  categoryId?: string;
  folderId?: string;
  templateId?: string;
  collectionIds?: string[];
  linkedNoteIds?: string[];
  organizationScore?: number;
}

// Filters for organization features
export interface NoteOrganizationFilters extends CoachNoteFilters {
  categoryId?: string;
  folderId?: string;
  templateId?: string;
  collectionId?: string;
  linkType?: string;
  organizationStatus?: 'organized' | 'unorganized' | 'all';
}

// Bulk operations interfaces
export interface BulkOperation {
  id?: string;
  type: 'delete' | 'archive' | 'restore' | 'privacy_change' | 'category_assign' | 'tag_add' | 'tag_remove' | 'export';
  noteIds: string[];
  userId: string;
  timestamp: string;
  details?: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  errorMessage?: string;
}

export interface BulkPrivacyChangeRequest {
  accessLevel: NoteAccessLevel;
  privacySettings?: Partial<NotePrivacySettings>;
  reason?: string;
}

export interface BulkCategoryAssignRequest {
  categoryId: string;
  reason?: string;
}

export interface BulkArchiveRequest {
  reason?: string;
}

export type NoteViewMode = 'list' | 'editor' | 'viewer' | 'organization' | 'analytics'; 