import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import { EncryptionService } from '../services/encryptionService.js';

// Privacy and access control enums
export enum NoteAccessLevel {
  PRIVATE = 'private',                    // Only the coach who created it
  SUPERVISOR = 'supervisor',              // Coach + designated supervisors
  TEAM = 'team',                         // Coach + team members
  ORGANIZATION = 'organization'           // All coaches in organization
}

export enum AuditAction {
  CREATED = 'created',
  VIEWED = 'viewed',
  UPDATED = 'updated',
  DELETED = 'deleted',
  SHARED = 'shared',
  UNSHARED = 'unshared',
  EXPORTED = 'exported'
}

// Audit trail interface
export interface IAuditEntry {
  action: AuditAction;
  userId: string;
  userRole: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

// Privacy settings interface
export interface INotePrivacySettings {
  accessLevel: NoteAccessLevel;
  allowExport: boolean;
  allowSharing: boolean;
  retentionPeriodDays?: number;
  autoDeleteAfterDays?: number;
  requireReasonForAccess: boolean;
  sensitiveContent: boolean;
  supervisionRequired: boolean;
}

export interface ICoachNote extends Document {
  _id: string;
  sessionId: mongoose.Types.ObjectId;
  coachId: mongoose.Types.ObjectId;
  textContent: string;
  title?: string;
  audioFileId?: mongoose.Types.ObjectId;
  tags?: string[];
  isEncrypted: boolean;
  searchableContent?: string;
  encryptionIV?: string; // IV for encrypted content
  
  // Privacy and access control
  privacySettings: INotePrivacySettings;
  accessLevel: NoteAccessLevel;
  sharedWith: string[]; // Array of user IDs who have explicit access
  
  // Audit trail
  auditTrail: IAuditEntry[];
  lastAccessedAt?: Date;
  accessCount: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  encryptionVersion?: string;
  
  // Backward compatibility fields
  coach?: mongoose.Types.ObjectId;
  client?: mongoose.Types.ObjectId;
  content?: string;
  visibility?: 'private' | 'private_to_coach' | 'shared' | 'public';
  
  // Methods
  encryptText(text: string): string;
  decryptText(): string;
  addAuditEntry(action: AuditAction, userId: string, userRole: string, details?: Record<string, any>, ipAddress?: string, userAgent?: string): void;
  checkAccess(userId: string, userRole: string): boolean;
  updateAccessTracking(userId: string): void;
  toSafeObject(): any;
}

// Audit entry schema
const auditEntrySchema = new Schema({
  action: {
    type: String,
    enum: Object.values(AuditAction),
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  details: Schema.Types.Mixed
}, { _id: false });

// Privacy settings schema
const privacySettingsSchema = new Schema({
  accessLevel: {
    type: String,
    enum: Object.values(NoteAccessLevel),
    default: NoteAccessLevel.PRIVATE
  },
  allowExport: {
    type: Boolean,
    default: false
  },
  allowSharing: {
    type: Boolean,
    default: false
  },
  retentionPeriodDays: Number,
  autoDeleteAfterDays: Number,
  requireReasonForAccess: {
    type: Boolean,
    default: false
  },
  sensitiveContent: {
    type: Boolean,
    default: false
  },
  supervisionRequired: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const coachNoteSchema = new Schema<ICoachNote>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    textContent: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    audioFileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
    },
    tags: [{
      type: String,
      trim: true
    }],
    isEncrypted: {
      type: Boolean,
      default: true,
    },
    searchableContent: {
      type: String,
      trim: true,
    },
    encryptionIV: {
      type: String,
      required: function() { return this.isEncrypted; }
    },
    
    // Privacy and access control
    privacySettings: {
      type: privacySettingsSchema,
      required: true,
      default: () => ({
        accessLevel: NoteAccessLevel.PRIVATE,
        allowExport: false,
        allowSharing: false,
        requireReasonForAccess: false,
        sensitiveContent: false,
        supervisionRequired: false
      })
    },
    accessLevel: {
      type: String,
      enum: Object.values(NoteAccessLevel),
      default: NoteAccessLevel.PRIVATE,
      required: true,
    },
    sharedWith: [{
      type: String,
      trim: true
    }],
    
    // Audit trail
    auditTrail: [auditEntrySchema],
    lastAccessedAt: {
      type: Date,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    
    // Metadata
    encryptionVersion: {
      type: String,
      default: '1.0'
    },
    
    // Backward compatibility fields
    coach: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    content: {
      type: String,
      trim: true,
    },
    visibility: {
      type: String,
      enum: ['private', 'private_to_coach', 'shared', 'public'],
      default: 'private',
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries and security
coachNoteSchema.index({ coachId: 1 });
coachNoteSchema.index({ coach: 1 });
coachNoteSchema.index({ client: 1 });
coachNoteSchema.index({ accessLevel: 1 });
coachNoteSchema.index({ 'auditTrail.action': 1 });
coachNoteSchema.index({ 'auditTrail.userId': 1 });
coachNoteSchema.index({ lastAccessedAt: 1 });

// Full-text search indexes
coachNoteSchema.index({ 
  title: 'text', 
  tags: 'text',
  searchableContent: 'text'
}, {
  weights: {
    title: 10,        // Highest weight for titles
    tags: 5,          // Medium weight for tags
    searchableContent: 1  // Normal weight for content
  },
  name: 'full_text_search'
});

// Additional indexes for filtering and sorting
coachNoteSchema.index({ tags: 1 });
coachNoteSchema.index({ createdAt: -1 });
coachNoteSchema.index({ updatedAt: -1 });
coachNoteSchema.index({ coachId: 1, createdAt: -1 });
coachNoteSchema.index({ accessLevel: 1, createdAt: -1 });

// Pre-save middleware to encrypt text content and add audit entry
coachNoteSchema.pre('save', function (next) {
  // Generate searchable content before encryption
  if (this.isModified('textContent') && this.textContent) {
    // Create searchable content by extracting key terms and sanitizing
    const cleanContent = this.textContent
      .replace(/[^\w\s]/g, ' ')  // Remove special characters
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim()
      .toLowerCase();
    
    // Extract meaningful keywords (remove common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    const keywords = cleanContent
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 50)  // Limit to first 50 meaningful words
      .join(' ');
    
    this.searchableContent = keywords;
  }

  // Handle encryption
  if (this.isModified('textContent') && this.isEncrypted) {
    try {
      const { encrypted, iv } = EncryptionService.encrypt(this.textContent);
      this.textContent = encrypted;
      this.encryptionIV = iv;
    } catch (error) {
      console.error('Error encrypting coach note text:', error);
      next(error as Error);
      return;
    }
  }
  
  // Sync accessLevel with privacy settings
  if (this.privacySettings && this.privacySettings.accessLevel) {
    this.accessLevel = this.privacySettings.accessLevel;
  }
  
  next();
});

// Method to decrypt text content
coachNoteSchema.methods.decryptText = function (): string {
  if (!this.isEncrypted) {
    return this.textContent;
  }

  if (!this.encryptionIV) {
    console.error('Missing encryption IV for encrypted note');
    return 'Error: Missing encryption IV';
  }

  try {
    return EncryptionService.decrypt(this.textContent, this.encryptionIV);
  } catch (error) {
    console.error('Error decrypting coach note text:', error);
    return 'Error decrypting content';
  }
};

// Method to encrypt text content
coachNoteSchema.methods.encryptText = function (text: string): string {
  if (!this.isEncrypted) {
    return text;
  }

  try {
    const { encrypted, iv } = EncryptionService.encrypt(text);
    this.encryptionIV = iv;
    return encrypted;
  } catch (error) {
    console.error('Error encrypting text:', error);
    return text;
  }
};

// Method to add audit trail entry
coachNoteSchema.methods.addAuditEntry = function (
  action: AuditAction,
  userId: string,
  userRole: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): void {
  const auditEntry: IAuditEntry = {
    action,
    userId,
    userRole,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    details
  };
  
  this.auditTrail.push(auditEntry);
  
  // Keep only last 100 audit entries to prevent bloat
  if (this.auditTrail.length > 100) {
    this.auditTrail = this.auditTrail.slice(-100);
  }
};

// Method to check access permissions
coachNoteSchema.methods.checkAccess = function (userId: string, userRole: string): boolean {
  // Owner always has access
  if (this.coachId.toString() === userId) {
    return true;
  }
  
  // Check explicit sharing
  if (this.sharedWith.includes(userId)) {
    return true;
  }
  
  // Check access level permissions
  switch (this.accessLevel) {
    case NoteAccessLevel.PRIVATE:
      return false;
    
    case NoteAccessLevel.SUPERVISOR:
      return userRole === 'supervisor' || userRole === 'admin';
    
    case NoteAccessLevel.TEAM:
      return userRole === 'coach' || userRole === 'supervisor' || userRole === 'admin';
    
    case NoteAccessLevel.ORGANIZATION:
      return ['coach', 'supervisor', 'admin'].includes(userRole);
    
    default:
      return false;
  }
};

// Method to update access tracking
coachNoteSchema.methods.updateAccessTracking = function (userId: string): void {
  this.lastAccessedAt = new Date();
  this.accessCount = (this.accessCount || 0) + 1;
};

// Method to return safe object (without sensitive data)
coachNoteSchema.methods.toSafeObject = function (): any {
  const obj = this.toObject();
  
  // Remove sensitive audit trail details for non-owners
  if (obj.auditTrail) {
    obj.auditTrail = obj.auditTrail.map((entry: any) => ({
      action: entry.action,
      timestamp: entry.timestamp,
      userRole: entry.userRole
      // Remove userId, ipAddress, userAgent, details for privacy
    }));
  }
  
  return obj;
};

export const CoachNote = mongoose.model<ICoachNote>('CoachNote', coachNoteSchema);
