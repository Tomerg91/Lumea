import mongoose, { Document, Schema } from 'mongoose';

export interface IEncryptionKeyMetadata extends Document {
  keyId: string;
  version: number;
  purpose: 'data' | 'backup' | 'transit';
  algorithm: string;
  createdAt: Date;
  expiresAt?: Date;
  rotatedAt?: Date;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  rotationReason?: string;
  approvedBy?: string;
  auditTrail: {
    action: 'created' | 'rotated' | 'deactivated' | 'expired';
    timestamp: Date;
    userId?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }[];
}

const encryptionKeyMetadataSchema = new Schema<IEncryptionKeyMetadata>({
  keyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  version: {
    type: Number,
    required: true,
    default: 1
  },
  purpose: {
    type: String,
    required: true,
    enum: ['data', 'backup', 'transit'],
    index: true
  },
  algorithm: {
    type: String,
    required: true,
    default: 'aes-256-gcm'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  rotatedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date
  },
  rotationReason: {
    type: String
  },
  approvedBy: {
    type: String
  },
  auditTrail: [{
    action: {
      type: String,
      required: true,
      enum: ['created', 'rotated', 'deactivated', 'expired']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: String
    },
    reason: {
      type: String
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  }]
}, {
  timestamps: true,
  collection: 'encryption_keys'
});

// Indexes for performance
encryptionKeyMetadataSchema.index({ purpose: 1, isActive: 1 });
encryptionKeyMetadataSchema.index({ createdAt: 1 });
encryptionKeyMetadataSchema.index({ expiresAt: 1 });
encryptionKeyMetadataSchema.index({ 'auditTrail.timestamp': 1 });

// Static methods
encryptionKeyMetadataSchema.statics.findActiveKeysByPurpose = function(purpose: string) {
  return this.find({ purpose, isActive: true }).sort({ createdAt: -1 });
};

encryptionKeyMetadataSchema.statics.findExpiredKeys = function() {
  return this.find({
    expiresAt: { $lte: new Date() },
    isActive: true
  });
};

encryptionKeyMetadataSchema.statics.getKeyUsageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$purpose',
        totalKeys: { $sum: 1 },
        activeKeys: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalUsage: { $sum: '$usageCount' },
        avgUsage: { $avg: '$usageCount' }
      }
    }
  ]);
};

encryptionKeyMetadataSchema.statics.findKeysNearingExpiration = function(days: number = 7) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  
  return this.find({
    expiresAt: { $lte: expirationDate, $gt: new Date() },
    isActive: true
  });
};

// Instance methods
encryptionKeyMetadataSchema.methods.addAuditEntry = function(
  action: string,
  userId?: string,
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

encryptionKeyMetadataSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

encryptionKeyMetadataSchema.methods.deactivate = function(reason?: string, userId?: string) {
  this.isActive = false;
  this.rotatedAt = new Date();
  this.rotationReason = reason;
  
  return this.addAuditEntry('deactivated', userId, reason);
};

encryptionKeyMetadataSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt <= new Date();
};

encryptionKeyMetadataSchema.methods.daysUntilExpiration = function() {
  if (!this.expiresAt) return null;
  
  const now = new Date();
  const diffTime = this.expiresAt.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Pre-save middleware
encryptionKeyMetadataSchema.pre('save', function(next) {
  if (this.isNew) {
    this.auditTrail.push({
      action: 'created',
      timestamp: new Date(),
      reason: 'Initial key creation'
    });
  }
  next();
});

// TTL index for automatic cleanup of very old inactive keys
encryptionKeyMetadataSchema.index(
  { rotatedAt: 1 },
  {
    expireAfterSeconds: 2555 * 24 * 60 * 60, // 7 years in seconds (HIPAA retention)
    partialFilterExpression: { isActive: false }
  }
);

export const EncryptionKeyMetadata = mongoose.model<IEncryptionKeyMetadata>(
  'EncryptionKeyMetadata',
  encryptionKeyMetadataSchema
); 