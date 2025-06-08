import mongoose, { Document, Schema } from 'mongoose';

export interface IConsent extends Document {
  userId: mongoose.Types.ObjectId;
  consentType: string;
  purpose: string;
  status: 'granted' | 'denied' | 'withdrawn' | 'expired';
  version: string;
  grantedAt: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;
  lastUpdated: Date;
  ipAddress: string;
  userAgent: string;
  legalBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task';
  category: 'essential' | 'functional' | 'analytics' | 'marketing' | 'hipaa_treatment' | 'hipaa_payment' | 'hipaa_operations';
  isRequired: boolean;
  dataProcessed: string[];
  retentionPeriod: number; // in days
  thirdPartySharing: {
    enabled: boolean;
    parties: string[];
    purpose: string;
  };
  automatedDecisionMaking: {
    enabled: boolean;
    logic: string;
    significance: string;
  };
  consentMethod: 'opt_in' | 'opt_out' | 'explicit' | 'implicit';
  evidenceOfConsent: {
    consentString: string;
    checkboxes: Record<string, boolean>;
    signature?: string;
    timestamp: Date;
  };
  minorConsent?: {
    isMinor: boolean;
    parentalConsent: boolean;
    guardianInfo?: {
      name: string;
      email: string;
      relationship: string;
    };
  };
  complianceFlags: string[];
  auditTrail: {
    action: 'granted' | 'updated' | 'withdrawn' | 'expired' | 'renewed';
    timestamp: Date;
    userId?: mongoose.Types.ObjectId;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }[];
  
  // Instance methods
  withdraw(reason?: string, ipAddress?: string, userAgent?: string): Promise<this>;
  isValid(): boolean;
  isExpired(): boolean;
  getDaysUntilExpiration(): number | null;
  addAuditEntry(action: string, userId?: mongoose.Types.ObjectId, reason?: string, metadata?: Record<string, any>): Promise<this>;
}

const consentSchema = new Schema<IConsent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  consentType: {
    type: String,
    required: true,
    enum: [
      'cookies',
      'analytics',
      'marketing',
      'data_processing',
      'communication',
      'third_party_sharing',
      'location_tracking',
      'biometric_data',
      'medical_data',
      'research_participation',
      'automated_decision_making',
      'profiling',
      'hipaa_authorization'
    ]
  },
  purpose: {
    type: String,
    required: true,
    maxlength: 500
  },
  status: {
    type: String,
    required: true,
    enum: ['granted', 'denied', 'withdrawn', 'expired'],
    default: 'denied'
  },
  version: {
    type: String,
    required: true,
    default: '1.0'
  },
  grantedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  withdrawnAt: {
    type: Date,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  legalBasis: {
    type: String,
    required: true,
    enum: ['consent', 'legitimate_interest', 'contract', 'legal_obligation', 'vital_interests', 'public_task'],
    default: 'consent'
  },
  category: {
    type: String,
    required: true,
    enum: ['essential', 'functional', 'analytics', 'marketing', 'hipaa_treatment', 'hipaa_payment', 'hipaa_operations'],
    default: 'functional'
  },
  isRequired: {
    type: Boolean,
    required: true,
    default: false
  },
  dataProcessed: [{
    type: String,
    required: true
  }],
  retentionPeriod: {
    type: Number,
    required: true,
    default: 365 // days
  },
  thirdPartySharing: {
    enabled: {
      type: Boolean,
      default: false
    },
    parties: [String],
    purpose: String
  },
  automatedDecisionMaking: {
    enabled: {
      type: Boolean,
      default: false
    },
    logic: String,
    significance: String
  },
  consentMethod: {
    type: String,
    required: true,
    enum: ['opt_in', 'opt_out', 'explicit', 'implicit'],
    default: 'opt_in'
  },
  evidenceOfConsent: {
    consentString: {
      type: String,
      required: true
    },
    checkboxes: {
      type: Schema.Types.Mixed,
      default: {}
    },
    signature: String,
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  minorConsent: {
    isMinor: {
      type: Boolean,
      default: false
    },
    parentalConsent: {
      type: Boolean,
      default: false
    },
    guardianInfo: {
      name: String,
      email: String,
      relationship: String
    }
  },
  complianceFlags: [{
    type: String,
    enum: ['GDPR', 'HIPAA', 'CCPA', 'COPPA', 'PIPEDA']
  }],
  auditTrail: [{
    action: {
      type: String,
      required: true,
      enum: ['granted', 'updated', 'withdrawn', 'expired', 'renewed']
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    ipAddress: String,
    userAgent: String,
    metadata: Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  collection: 'consents'
});

// Indexes for performance
consentSchema.index({ userId: 1, consentType: 1 });
consentSchema.index({ status: 1 });
consentSchema.index({ expiresAt: 1 });
consentSchema.index({ createdAt: 1 });
consentSchema.index({ 'complianceFlags': 1 });

// TTL index for expired consents (auto-cleanup after retention period)
consentSchema.index({ 
  expiresAt: 1 
}, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { expiresAt: { $exists: true } }
});

// Pre-save middleware
consentSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  
  // Auto-set expiration date based on retention period
  if (!this.expiresAt && this.retentionPeriod) {
    this.expiresAt = new Date(Date.now() + this.retentionPeriod * 24 * 60 * 60 * 1000);
  }
  
  // Auto-set compliance flags based on consent type and category
  if (!this.complianceFlags || this.complianceFlags.length === 0) {
    this.complianceFlags = [];
    
    if (this.category.startsWith('hipaa_')) {
      this.complianceFlags.push('HIPAA');
    }
    
    // All consents should comply with GDPR for EU users
    this.complianceFlags.push('GDPR');
  }
  
  next();
});

// Static methods
consentSchema.statics.getActiveConsents = function(userId: mongoose.Types.ObjectId) {
  return this.find({
    userId,
    status: 'granted',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

consentSchema.statics.getConsentHistory = function(userId: mongoose.Types.ObjectId, consentType?: string) {
  const query: any = { userId };
  if (consentType) {
    query.consentType = consentType;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

consentSchema.statics.getExpiringConsents = function(daysUntilExpiration: number = 30) {
  const thresholdDate = new Date(Date.now() + daysUntilExpiration * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'granted',
    expiresAt: {
      $exists: true,
      $lte: thresholdDate,
      $gt: new Date()
    }
  });
};

consentSchema.statics.getConsentStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: {
          consentType: '$consentType',
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.consentType',
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

consentSchema.statics.withdrawConsent = function(
  userId: mongoose.Types.ObjectId, 
  consentType: string, 
  reason?: string,
  ipAddress?: string,
  userAgent?: string
) {
  return this.findOneAndUpdate(
    { 
      userId, 
      consentType, 
      status: 'granted' 
    },
    {
      $set: {
        status: 'withdrawn',
        withdrawnAt: new Date(),
        lastUpdated: new Date()
      },
      $push: {
        auditTrail: {
          action: 'withdrawn',
          timestamp: new Date(),
          userId,
          reason,
          ipAddress,
          userAgent
        }
      }
    },
    { new: true }
  );
};

consentSchema.statics.renewConsent = function(
  userId: mongoose.Types.ObjectId,
  consentType: string,
  evidenceOfConsent: any,
  ipAddress: string,
  userAgent: string,
  retentionPeriod: number = 365
) {
  return this.findOneAndUpdate(
    { 
      userId, 
      consentType, 
      status: { $in: ['granted', 'expired'] } 
    },
    {
      $set: {
        status: 'granted',
        grantedAt: new Date(),
        lastUpdated: new Date(),
        evidenceOfConsent,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + retentionPeriod * 24 * 60 * 60 * 1000)
      },
      $push: {
        auditTrail: {
          action: 'renewed',
          timestamp: new Date(),
          userId,
          ipAddress,
          userAgent
        }
      }
    },
    { new: true }
  );
};

// Instance methods
consentSchema.methods.withdraw = function(reason?: string, ipAddress?: string, userAgent?: string) {
  this.status = 'withdrawn';
  this.withdrawnAt = new Date();
  this.lastUpdated = new Date();
  
  this.auditTrail.push({
    action: 'withdrawn',
    timestamp: new Date(),
    reason,
    ipAddress,
    userAgent
  });
  
  return this.save();
};

consentSchema.methods.isValid = function() {
  if (this.status !== 'granted') return false;
  if (this.expiresAt && this.expiresAt <= new Date()) return false;
  return true;
};

consentSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt <= new Date();
};

consentSchema.methods.getDaysUntilExpiration = function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const timeDiff = this.expiresAt.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

consentSchema.methods.addAuditEntry = function(
  action: string, 
  userId?: mongoose.Types.ObjectId, 
  reason?: string,
  metadata?: Record<string, any>
) {
  this.auditTrail.push({
    action,
    timestamp: new Date(),
    userId,
    reason,
    metadata
  });
  
  return this.save();
};

export const Consent = mongoose.model<IConsent>('Consent', consentSchema); 