export interface IAuditLog {
  id: string;
  userId: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'security' | 'system';
  outcome: 'success' | 'failure' | 'warning';
  metadata?: {
    location?: string;
    deviceInfo?: string;
    referrer?: string;
    sessionDuration?: number;
    dataSize?: number;
    errorCode?: string;
    errorMessage?: string;
  };
  tags?: string[];
  isArchived: boolean;
  retentionDate?: Date;
  complianceFlags?: {
    gdpr?: boolean;
    hipaa?: boolean;
    sox?: boolean;
    pci?: boolean;
  };
  createdAt: Date;
}

export class AuditLog implements IAuditLog {
  id: string;
  userId: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'security' | 'system';
  outcome: 'success' | 'failure' | 'warning';
  metadata?: {
    location?: string;
    deviceInfo?: string;
    referrer?: string;
    sessionDuration?: number;
    dataSize?: number;
    errorCode?: string;
    errorMessage?: string;
  };
  tags?: string[];
  isArchived: boolean;
  retentionDate?: Date;
  complianceFlags?: {
    gdpr?: boolean;
    hipaa?: boolean;
    sox?: boolean;
    pci?: boolean;
  };
  createdAt: Date;

  constructor(data: Partial<IAuditLog> & {
    id: string;
    userId: string;
    action: string;
    resource: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'security' | 'system';
    outcome: 'success' | 'failure' | 'warning';
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.action = data.action;
    this.resource = data.resource;
    this.resourceId = data.resourceId;
    this.details = data.details;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.timestamp = data.timestamp || new Date();
    this.severity = data.severity;
    this.category = data.category;
    this.outcome = data.outcome;
    this.metadata = data.metadata;
    this.tags = data.tags;
    this.isArchived = data.isArchived ?? false;
    this.retentionDate = data.retentionDate;
    this.complianceFlags = data.complianceFlags;
    this.createdAt = data.createdAt || new Date();
  }

  static create(
    userId: string,
    action: string,
    resource: string,
    options: {
      sessionId?: string;
      resourceId?: string;
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'security' | 'system';
      outcome?: 'success' | 'failure' | 'warning';
      metadata?: Record<string, any>;
      tags?: string[];
    } = {}
  ): AuditLog {
    return new AuditLog({
      id: Math.random().toString(36).substr(2, 9),
      userId,
      action,
      resource,
      severity: options.severity || 'low',
      category: options.category || 'data_access',
      outcome: options.outcome || 'success',
      ...options
    });
  }
} 