import mongoose, { Document, Schema } from 'mongoose';

export interface IDataRetentionPolicy extends Document {
  // Policy identification
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  
  // Target data specification
  dataType: string; // e.g., 'user', 'session', 'reflection', 'auditlog'
  modelName: string; // Mongoose model name
  category: 'personal_data' | 'medical_data' | 'financial_data' | 'system_data' | 'audit_data';
  
  // Retention configuration
  retentionPeriod: {
    value: number;
    unit: 'days' | 'months' | 'years';
    fromField: string; // Field to calculate retention from (e.g., 'createdAt', 'lastAccessed')
  };
  
  // HIPAA and compliance settings
  complianceRequirements: {
    hipaaMinimum: number; // Minimum retention in days for HIPAA
    gdprMaximum?: number; // Maximum retention in days for GDPR
    legalBasisRequired: boolean;
    auditTrailRetention: number; // How long to keep deletion audit trail
  };
  
  // Deletion configuration
  deletionMethod: 'soft_delete' | 'hard_delete' | 'anonymize' | 'archive';
  secureWipe: boolean; // Use cryptographic secure deletion
  backupRetention: number; // Days to keep in backup before permanent deletion
  
  // Legal hold settings
  legalHoldSupport: boolean;
  legalHoldField?: string; // Field to check for legal holds
  
  // Scheduling and automation
  autoExecute: boolean;
  schedulePattern: string; // Cron pattern for automated execution
  batchSize: number; // Number of records to process per batch
  
  // Filtering and conditions
  filters: {
    includeConditions: Record<string, any>; // MongoDB query for inclusion
    excludeConditions: Record<string, any>; // MongoDB query for exclusion
    customLogic?: string; // Custom filtering logic
  };
  
  // Notifications and reporting
  notifications: {
    onDeletion: boolean;
    beforeDeletion: number; // Days before deletion to notify
    recipients: string[]; // Email addresses for notifications
    includeDetails: boolean;
  };
  
  // Audit and tracking
  executionHistory: {
    executedAt: Date;
    recordsProcessed: number;
    recordsDeleted: number;
    recordsSkipped: number;
    errorCount: number;
    executionTime: number; // milliseconds
    status: 'success' | 'partial' | 'failed';
    certificateId?: string; // Reference to deletion certificate
    notes?: string;
  }[];
  
  // Metadata
  createdBy: string;
  updatedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  
  // Configuration metadata
  priority: number; // Execution priority (1-10)
  dependsOn: string[]; // Other policy IDs that must execute first
  tags: string[];
  
  // Instance methods
  calculateRetentionDate(fromDate: Date): Date;
  isEligibleForDeletion(record: any): boolean;
  generateDeletionPreview(): Promise<any>;
  execute(dryRun?: boolean): Promise<any>;
}

const dataRetentionPolicySchema = new Schema<IDataRetentionPolicy>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  version: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Target data specification
  dataType: {
    type: String,
    required: true,
    enum: [
      'user', 'session', 'reflection', 'coach_note', 'audit_log',
      'notification', 'feedback', 'file', 'session_history',
      'consent', 'encryption_key', 'password_reset_token',
      'invite_token', 'session_timing', 'coach_availability'
    ],
    index: true
  },
  modelName: {
    type: String,
    required: true,
    enum: [
      'User', 'Session', 'Reflection', 'CoachNote', 'AuditLog',
      'Notification', 'SessionFeedback', 'File', 'SessionHistory',
      'Consent', 'EncryptionKey', 'PasswordResetToken',
      'InviteToken', 'SessionTiming', 'CoachAvailability'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: ['personal_data', 'medical_data', 'financial_data', 'system_data', 'audit_data'],
    index: true
  },
  
  // Retention configuration
  retentionPeriod: {
    value: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      required: true,
      enum: ['days', 'months', 'years'],
      default: 'days'
    },
    fromField: {
      type: String,
      required: true,
      default: 'createdAt'
    }
  },
  
  // HIPAA and compliance settings
  complianceRequirements: {
    hipaaMinimum: {
      type: Number,
      required: true,
      default: 2555 // 7 years in days
    },
    gdprMaximum: {
      type: Number
    },
    legalBasisRequired: {
      type: Boolean,
      default: false
    },
    auditTrailRetention: {
      type: Number,
      default: 3650 // 10 years for audit trail
    }
  },
  
  // Deletion configuration
  deletionMethod: {
    type: String,
    required: true,
    enum: ['soft_delete', 'hard_delete', 'anonymize', 'archive'],
    default: 'hard_delete'
  },
  secureWipe: {
    type: Boolean,
    default: true
  },
  backupRetention: {
    type: Number,
    default: 30 // Keep in backup for 30 days
  },
  
  // Legal hold settings
  legalHoldSupport: {
    type: Boolean,
    default: true
  },
  legalHoldField: {
    type: String,
    default: 'legalHold'
  },
  
  // Scheduling and automation
  autoExecute: {
    type: Boolean,
    default: true
  },
  schedulePattern: {
    type: String,
    default: '0 2 * * 0' // Weekly on Sunday at 2 AM
  },
  batchSize: {
    type: Number,
    default: 1000,
    min: 1,
    max: 10000
  },
  
  // Filtering and conditions
  filters: {
    includeConditions: {
      type: Schema.Types.Mixed,
      default: {}
    },
    excludeConditions: {
      type: Schema.Types.Mixed,
      default: {}
    },
    customLogic: String
  },
  
  // Notifications and reporting
  notifications: {
    onDeletion: {
      type: Boolean,
      default: true
    },
    beforeDeletion: {
      type: Number,
      default: 7 // 7 days notice
    },
    recipients: [String],
    includeDetails: {
      type: Boolean,
      default: false
    }
  },
  
  // Audit and tracking
  executionHistory: [{
    executedAt: {
      type: Date,
      required: true
    },
    recordsProcessed: {
      type: Number,
      required: true,
      default: 0
    },
    recordsDeleted: {
      type: Number,
      required: true,
      default: 0
    },
    recordsSkipped: {
      type: Number,
      required: true,
      default: 0
    },
    errorCount: {
      type: Number,
      required: true,
      default: 0
    },
    executionTime: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'partial', 'failed']
    },
    certificateId: String,
    notes: String
  }],
  
  // Metadata
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    required: true
  },
  approvedBy: String,
  approvedAt: Date,
  lastExecutedAt: {
    type: Date,
    index: true
  },
  nextExecutionAt: {
    type: Date,
    index: true
  },
  
  // Configuration metadata
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10,
    index: true
  },
  dependsOn: [String],
  tags: [String]
}, {
  timestamps: true,
  collection: 'data_retention_policies'
});

// Indexes for performance
dataRetentionPolicySchema.index({ dataType: 1, isActive: 1 });
dataRetentionPolicySchema.index({ category: 1, isActive: 1 });
dataRetentionPolicySchema.index({ nextExecutionAt: 1, autoExecute: 1 });
dataRetentionPolicySchema.index({ priority: 1, isActive: 1 });

// Instance methods
dataRetentionPolicySchema.methods.calculateRetentionDate = function(fromDate: Date = new Date()): Date {
  const retentionDate = new Date(fromDate);
  
  switch (this.retentionPeriod.unit) {
    case 'days':
      retentionDate.setDate(retentionDate.getDate() + this.retentionPeriod.value);
      break;
    case 'months':
      retentionDate.setMonth(retentionDate.getMonth() + this.retentionPeriod.value);
      break;
    case 'years':
      retentionDate.setFullYear(retentionDate.getFullYear() + this.retentionPeriod.value);
      break;
  }
  
  return retentionDate;
};

dataRetentionPolicySchema.methods.isEligibleForDeletion = function(record: any): boolean {
  // Check legal hold
  if (this.legalHoldSupport && this.legalHoldField && record[this.legalHoldField]) {
    return false;
  }
  
  // Check retention period
  const fromDate = record[this.retentionPeriod.fromField];
  if (!fromDate) return false;
  
  const retentionDate = this.calculateRetentionDate(fromDate);
  const now = new Date();
  
  if (retentionDate > now) {
    return false;
  }
  
  // Apply include/exclude conditions
  if (Object.keys(this.filters.includeConditions).length > 0) {
    // Check if record matches include conditions
    const includeMatch = this.matchesConditions(record, this.filters.includeConditions);
    if (!includeMatch) return false;
  }
  
  if (Object.keys(this.filters.excludeConditions).length > 0) {
    // Check if record matches exclude conditions
    const excludeMatch = this.matchesConditions(record, this.filters.excludeConditions);
    if (excludeMatch) return false;
  }
  
  return true;
};

dataRetentionPolicySchema.methods.matchesConditions = function(record: any, conditions: Record<string, any>): boolean {
  // Simple condition matching - can be extended for complex queries
  for (const [field, value] of Object.entries(conditions)) {
    if (record[field] !== value) {
      return false;
    }
  }
  return true;
};

// Static methods
dataRetentionPolicySchema.statics.findPoliciesForExecution = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    autoExecute: true,
    $or: [
      { nextExecutionAt: { $lte: now } },
      { nextExecutionAt: { $exists: false } }
    ]
  }).sort({ priority: -1 });
};

dataRetentionPolicySchema.statics.findByDataType = function(dataType: string) {
  return this.find({ dataType, isActive: true }).sort({ priority: -1 });
};

dataRetentionPolicySchema.statics.getExecutionSummary = function(days: number = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  return this.aggregate([
    { $unwind: '$executionHistory' },
    { $match: { 'executionHistory.executedAt': { $gte: fromDate } } },
    {
      $group: {
        _id: null,
        totalExecutions: { $sum: 1 },
        totalProcessed: { $sum: '$executionHistory.recordsProcessed' },
        totalDeleted: { $sum: '$executionHistory.recordsDeleted' },
        successRate: {
          $avg: {
            $cond: [
              { $eq: ['$executionHistory.status', 'success'] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
dataRetentionPolicySchema.pre('save', function(next) {
  // Validate HIPAA compliance
  const retentionDays = this.calculateRetentionDays();
  
  if (this.category === 'medical_data' && retentionDays < this.complianceRequirements.hipaaMinimum) {
    return next(new Error(`Medical data retention period must be at least ${this.complianceRequirements.hipaaMinimum} days for HIPAA compliance`));
  }
  
  // Set next execution date if auto-execute is enabled
  if (this.autoExecute && !this.nextExecutionAt) {
    this.setNextExecutionDate();
  }
  
  next();
});

dataRetentionPolicySchema.methods.calculateRetentionDays = function(): number {
  let days = this.retentionPeriod.value;
  
  switch (this.retentionPeriod.unit) {
    case 'months':
      days *= 30;
      break;
    case 'years':
      days *= 365;
      break;
  }
  
  return days;
};

dataRetentionPolicySchema.methods.setNextExecutionDate = function() {
  // This would integrate with a cron library to calculate next execution
  // For now, set to next day
  const nextExecution = new Date();
  nextExecution.setDate(nextExecution.getDate() + 1);
  this.nextExecutionAt = nextExecution;
};

const DataRetentionPolicy = mongoose.model<IDataRetentionPolicy>('DataRetentionPolicy', dataRetentionPolicySchema);

export default DataRetentionPolicy;