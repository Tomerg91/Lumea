export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  SHARE = 'share',
  EXPORT = 'export'
}

export enum NoteAccessLevel {
  PRIVATE = 'private',
  COACH_ONLY = 'coach_only',
  SHARED = 'shared',
  CLIENT_VISIBLE = 'client_visible'
}

export interface ICoachNote {
  id: string;
  sessionId: string;
  coachId: string;
  clientId: string;
  title: string;
  content: string;
  type: 'session' | 'general' | 'observation' | 'goal' | 'action_item';
  accessLevel: NoteAccessLevel;
  tags?: string[];
  attachments?: string[];
  isEncrypted: boolean;
  version: number;
  auditTrail?: {
    action: AuditAction;
    timestamp: Date;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    changes?: Record<string, any>;
  }[];
  sharedWith?: string[];
  expiresAt?: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CoachNote implements ICoachNote {
  id: string;
  sessionId: string;
  coachId: string;
  clientId: string;
  title: string;
  content: string;
  type: 'session' | 'general' | 'observation' | 'goal' | 'action_item';
  accessLevel: NoteAccessLevel;
  tags?: string[];
  attachments?: string[];
  isEncrypted: boolean;
  version: number;
  auditTrail?: {
    action: AuditAction;
    timestamp: Date;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    changes?: Record<string, any>;
  }[];
  sharedWith?: string[];
  expiresAt?: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<ICoachNote> & {
    id: string;
    sessionId: string;
    coachId: string;
    clientId: string;
    title: string;
    content: string;
    type: 'session' | 'general' | 'observation' | 'goal' | 'action_item';
    accessLevel: NoteAccessLevel;
  }) {
    this.id = data.id;
    this.sessionId = data.sessionId;
    this.coachId = data.coachId;
    this.clientId = data.clientId;
    this.title = data.title;
    this.content = data.content;
    this.type = data.type;
    this.accessLevel = data.accessLevel;
    this.tags = data.tags;
    this.attachments = data.attachments;
    this.isEncrypted = data.isEncrypted ?? false;
    this.version = data.version ?? 1;
    this.auditTrail = data.auditTrail ?? [];
    this.sharedWith = data.sharedWith;
    this.expiresAt = data.expiresAt;
    this.isArchived = data.isArchived ?? false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  addAuditEntry(action: AuditAction, userId: string, ipAddress?: string, userAgent?: string, changes?: Record<string, any>) {
    if (!this.auditTrail) {
      this.auditTrail = [];
    }
    this.auditTrail.push({
      action,
      timestamp: new Date(),
      userId,
      ipAddress,
      userAgent,
      changes
    });
  }
} 