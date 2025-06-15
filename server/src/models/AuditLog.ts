import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  // Core identification
  id: string;
  timestamp: Date;
  
  // User and session information
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  
  // Request information
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  
  // Action details
  action: string; // e.g., 'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
  resource: string; // e.g., 'user', 'session', 'reflection', 'note'
  resourceId?: string;
  
  // HIPAA-specific fields
  phiAccessed: boolean; // Protected Health Information accessed
  phiType?: string; // Type of PHI accessed (e.g., 'session_notes', 'reflection', 'user_profile')
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  
  // Security context
  authMethod?: string; // e.g., 'password', 'oauth', 'session'
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Event details
  eventType: 'user_action' | 'system_event' | 'security_event' | 'data_access' | 'admin_action';
  eventCategory: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_admin' | 'security_incident';
  
  // Request/Response details
  httpMethod?: string;
  endpoint?: string;
  statusCode?: number;
  responseTime?: number; // in milliseconds
  
  // Data changes (for audit trail)
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  
  // Additional context
  description: string;
  metadata?: Record<string, any>;
  
  // Compliance and retention
  retentionDate: Date; // When this log can be deleted
  complianceFlags?: string[]; // e.g., ['HIPAA', 'GDPR', 'SOX']
  
  // Security flags
  suspicious: boolean;
  flaggedReason?: string;
  investigationStatus?: 'none' | 'pending' | 'in_progress' | 'resolved' | 'escalated';
  
  // Geolocation (for security analysis)
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  
  // System information
  serverInstance?: string;
  applicationVersion?: string;
  
  // Correlation for related events
  correlationId?: string;
  parentEventId?: string;
  
  // Tamper-proof logging enhancements
  integrityHash?: string; // SHA-256 hash of critical fields
  previousLogHash?: string; // Hash of previous log entry (for hash chain)
  digitalSignature?: string; // Digital signature for non-repudiation
  sequenceNumber?: number; // Sequential number for ordering verification
  
  // Advanced analytics
  anomalyScore?: number; // ML-generated anomaly score (0-100)
  riskScore?: number; // Calculated risk score (0-100)
  behavioralPattern?: string; // User behavioral pattern identifier
  threatIndicators?: string[]; // List of threat indicators detected
  
  // Investigation and response
  investigationNotes?: string;
  responseActions?: string[];
  escalationLevel?: number; // 0-5 escalation level
  reviewedBy?: string; // Admin who reviewed this log
  reviewedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // User and session information
  userId: String,
  userEmail: String,
  userRole: String,
  sessionId: String,
  
  // Request information
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  requestId: String,
  
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'EXPORT', 'IMPORT', 'BACKUP', 'RESTORE',
      'ADMIN_ACCESS', 'PERMISSION_CHANGE',
      'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'SESSION_START', 'SESSION_END',
      'DATA_EXPORT', 'DATA_DELETE',
      'SYSTEM_CONFIG', 'SECURITY_EVENT'
    ]
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: String,
  
  // HIPAA-specific fields
  phiAccessed: {
    type: Boolean,
    default: false
  },
  phiType: {
    type: String,
    enum: [
      'session_notes', 'reflection', 'user_profile',
      'coaching_session', 'assessment', 'goal',
      'medical_history', 'contact_info', 'payment_info'
    ]
  },
  dataClassification: {
    type: String,
    required: true,
    enum: ['public', 'internal', 'confidential', 'restricted']
  },
  
  // Security context
  authMethod: {
    type: String,
    enum: ['password', 'oauth', 'session', 'api_key', 'token']
  },
  riskLevel: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  
  // Event details
  eventType: {
    type: String,
    required: true,
    enum: ['user_action', 'system_event', 'security_event', 'data_access', 'admin_action']
  },
  eventCategory: {
    type: String,
    required: true,
    enum: ['authentication', 'authorization', 'data_access', 'data_modification', 'system_admin', 'security_incident']
  },
  
  // Request/Response details
  httpMethod: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
  },
  endpoint: String,
  statusCode: Number,
  responseTime: Number,
  
  // Data changes
  oldValues: Schema.Types.Mixed,
  newValues: Schema.Types.Mixed,
  changedFields: [String],
  
  // Additional context
  description: {
    type: String,
    required: true
  },
  metadata: Schema.Types.Mixed,
  
  // Compliance and retention
  retentionDate: {
    type: Date,
    required: true
  },
  complianceFlags: [String],
  
  // Security flags
  suspicious: {
    type: Boolean,
    default: false
  },
  flaggedReason: String,
  investigationStatus: {
    type: String,
    enum: ['none', 'pending', 'in_progress', 'resolved', 'escalated'],
    default: 'none'
  },
  
  // Geolocation
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: [Number] // [longitude, latitude]
  },
  
  // System information
  serverInstance: String,
  applicationVersion: String,
  
  // Correlation
  correlationId: String,
  parentEventId: String,
  
  // Tamper-proof logging enhancements
  integrityHash: String,
  previousLogHash: String,
  digitalSignature: String,
  sequenceNumber: Number,
  
  // Advanced analytics
  anomalyScore: {
    type: Number,
    min: 0,
    max: 100
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  behavioralPattern: String,
  threatIndicators: [String],
  
  // Investigation and response
  investigationNotes: String,
  responseActions: [String],
  escalationLevel: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewedBy: String,
  reviewedAt: Date
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Compound indexes for common queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ phiAccessed: 1, timestamp: -1 });
AuditLogSchema.index({ eventType: 1, eventCategory: 1, timestamp: -1 });
AuditLogSchema.index({ riskLevel: 1, suspicious: 1, timestamp: -1 });
AuditLogSchema.index({ correlationId: 1, timestamp: 1 });

// Optimize retrieval of latest logs by sequenceNumber
AuditLogSchema.index({ sequenceNumber: -1 });

// Text index for searching descriptions and metadata
AuditLogSchema.index({
  description: 'text',
  'metadata.searchableText': 'text'
});

// TTL index for automatic cleanup based on retention date
AuditLogSchema.index({ retentionDate: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to set retention date if not provided
AuditLogSchema.pre('save', function(next) {
  if (!this.retentionDate) {
    // Default retention: 7 years for HIPAA compliance
    const retentionYears = this.phiAccessed ? 7 : 3;
    this.retentionDate = new Date(Date.now() + (retentionYears * 365 * 24 * 60 * 60 * 1000));
  }
  next();
});

// Define interface for static methods
interface IAuditLogModel extends mongoose.Model<IAuditLog> {
  findByUser(userId: string, limit?: number): Promise<IAuditLog[]>;
  findPHIAccess(startDate?: Date, endDate?: Date): Promise<IAuditLog[]>;
  findSuspiciousActivity(): Promise<IAuditLog[]>;
  findByRiskLevel(riskLevel: string): Promise<IAuditLog[]>;
}

// Static methods for common queries
AuditLogSchema.statics.findByUser = function(userId: string, limit = 100) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

AuditLogSchema.statics.findPHIAccess = function(startDate?: Date, endDate?: Date) {
  const query: any = { phiAccessed: true };
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  return this.find(query).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findSuspiciousActivity = function() {
  return this.find({ suspicious: true })
    .sort({ timestamp: -1 });
};

AuditLogSchema.statics.findByRiskLevel = function(riskLevel: string) {
  return this.find({ riskLevel })
    .sort({ timestamp: -1 });
};

export const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', AuditLogSchema); 