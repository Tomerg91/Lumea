import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IDeletionCertificate extends Document {
  // Certificate identification
  certificateId: string;
  certificateNumber: string; // Human-readable certificate number
  
  // Deletion details
  policyId: string; // Reference to DataRetentionPolicy
  dataType: string;
  modelName: string;
  
  // Execution information
  executedAt: Date;
  executedBy: string; // User or system that executed the deletion
  executionMethod: 'automated' | 'manual' | 'emergency';
  
  // Deletion statistics
  recordsProcessed: number;
  recordsDeleted: number;
  recordsSkipped: number;
  recordsFailed: number;
  
  // Security and compliance
  deletionMethod: 'soft_delete' | 'hard_delete' | 'anonymize' | 'archive';
  secureWipeUsed: boolean;
  cryptographicHash: string; // Hash of all deleted record IDs
  digitalSignature: string; // Digital signature for non-repudiation
  
  // Legal and compliance context
  legalBasis: string;
  complianceFramework: string[]; // ['HIPAA', 'GDPR', etc.]
  retentionPeriodMet: boolean;
  
  // Audit trail
  affectedTables: string[];
  backupStatus: 'retained' | 'deleted' | 'encrypted';
  backupLocation?: string;
  backupRetentionUntil?: Date;
  
  // Verification
  verificationHash: string; // Hash for integrity verification
  witnessedBy?: string; // Optional witness for high-sensitivity deletions
  approvedBy?: string; // Approver for manual deletions
  
  // Metadata
  notes?: string;
  relatedCertificates: string[]; // Related deletion certificates
  
  // Status tracking
  status: 'completed' | 'partial' | 'failed' | 'verified' | 'disputed';
  verifiedAt?: Date;
  verifiedBy?: string;
  
  // Instance methods
  generateCertificateNumber(): string;
  calculateHash(records: any[]): string;
  verify(): Promise<boolean>;
  generateReport(): Promise<string>;
}

const deletionCertificateSchema = new Schema<IDeletionCertificate>({
  certificateId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  certificateNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Deletion details
  policyId: {
    type: String,
    required: true,
    index: true
  },
  dataType: {
    type: String,
    required: true,
    index: true
  },
  modelName: {
    type: String,
    required: true
  },
  
  // Execution information
  executedAt: {
    type: Date,
    required: true,
    index: true
  },
  executedBy: {
    type: String,
    required: true
  },
  executionMethod: {
    type: String,
    required: true,
    enum: ['automated', 'manual', 'emergency'],
    index: true
  },
  
  // Deletion statistics
  recordsProcessed: {
    type: Number,
    required: true,
    min: 0
  },
  recordsDeleted: {
    type: Number,
    required: true,
    min: 0
  },
  recordsSkipped: {
    type: Number,
    required: true,
    min: 0
  },
  recordsFailed: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Security and compliance
  deletionMethod: {
    type: String,
    required: true,
    enum: ['soft_delete', 'hard_delete', 'anonymize', 'archive']
  },
  secureWipeUsed: {
    type: Boolean,
    required: true
  },
  cryptographicHash: {
    type: String,
    required: true
  },
  digitalSignature: {
    type: String,
    required: true
  },
  
  // Legal and compliance context
  legalBasis: {
    type: String,
    required: true
  },
  complianceFramework: [{
    type: String,
    enum: ['HIPAA', 'GDPR', 'CCPA', 'SOX', 'PCI-DSS', 'PIPEDA']
  }],
  retentionPeriodMet: {
    type: Boolean,
    required: true
  },
  
  // Audit trail
  affectedTables: [String],
  backupStatus: {
    type: String,
    required: true,
    enum: ['retained', 'deleted', 'encrypted'],
    default: 'retained'
  },
  backupLocation: String,
  backupRetentionUntil: Date,
  
  // Verification
  verificationHash: {
    type: String,
    required: true
  },
  witnessedBy: String,
  approvedBy: String,
  
  // Metadata
  notes: {
    type: String,
    maxlength: 1000
  },
  relatedCertificates: [String],
  
  // Status tracking
  status: {
    type: String,
    required: true,
    enum: ['completed', 'partial', 'failed', 'verified', 'disputed'],
    default: 'completed',
    index: true
  },
  verifiedAt: Date,
  verifiedBy: String
}, {
  timestamps: true,
  collection: 'deletion_certificates'
});

// Indexes for performance and queries
deletionCertificateSchema.index({ executedAt: -1 });
deletionCertificateSchema.index({ policyId: 1, executedAt: -1 });
deletionCertificateSchema.index({ dataType: 1, executedAt: -1 });
deletionCertificateSchema.index({ status: 1, executedAt: -1 });
deletionCertificateSchema.index({ complianceFramework: 1 });

// Pre-save middleware
deletionCertificateSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.certificateId) {
      this.certificateId = this.generateUniqueId();
    }
    if (!this.certificateNumber) {
      this.certificateNumber = this.generateCertificateNumber();
    }
  }
  next();
});

// Instance methods
deletionCertificateSchema.methods.generateUniqueId = function(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `cert_${timestamp}_${random}`;
};

deletionCertificateSchema.methods.generateCertificateNumber = function(): string {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const day = new Date().getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `DEL-${year}${month}${day}-${random}`;
};

deletionCertificateSchema.methods.calculateHash = function(records: any[]): string {
  const recordIds = records.map(r => r._id || r.id).sort();
  const hashInput = recordIds.join(',') + this.executedAt.toISOString();
  return crypto.createHash('sha256').update(hashInput).digest('hex');
};

deletionCertificateSchema.methods.verify = async function(): Promise<boolean> {
  try {
    // Verify the integrity of the certificate
    
    const expectedHash = crypto.createHash('sha256')
      .update(`${this.certificateId}${this.executedAt.toISOString()}${this.recordsDeleted}`)
      .digest('hex');
    
    return this.verificationHash === expectedHash;
  } catch (error) {
    return false;
  }
};

deletionCertificateSchema.methods.generateReport = async function(): Promise<string> {
  const report = `
CERTIFICATE OF DATA DELETION
Certificate Number: ${this.certificateNumber}
Certificate ID: ${this.certificateId}

DELETION DETAILS:
- Data Type: ${this.dataType}
- Model: ${this.modelName}
- Execution Date: ${this.executedAt.toISOString()}
- Executed By: ${this.executedBy}
- Execution Method: ${this.executionMethod}

STATISTICS:
- Records Processed: ${this.recordsProcessed}
- Records Deleted: ${this.recordsDeleted}
- Records Skipped: ${this.recordsSkipped}
- Records Failed: ${this.recordsFailed}

SECURITY:
- Deletion Method: ${this.deletionMethod}
- Secure Wipe: ${this.secureWipeUsed ? 'Yes' : 'No'}
- Cryptographic Hash: ${this.cryptographicHash}
- Digital Signature: ${this.digitalSignature}

COMPLIANCE:
- Legal Basis: ${this.legalBasis}
- Compliance Frameworks: ${this.complianceFramework.join(', ')}
- Retention Period Met: ${this.retentionPeriodMet ? 'Yes' : 'No'}
- Affected Tables: ${this.affectedTables.join(', ')}

BACKUP:
- Backup Status: ${this.backupStatus}
${this.backupLocation ? `- Backup Location: ${this.backupLocation}` : ''}
${this.backupRetentionUntil ? `- Backup Retention Until: ${this.backupRetentionUntil.toISOString()}` : ''}

VERIFICATION:
- Verification Hash: ${this.verificationHash}
- Status: ${this.status}
${this.witnessedBy ? `- Witnessed By: ${this.witnessedBy}` : ''}
${this.approvedBy ? `- Approved By: ${this.approvedBy}` : ''}
${this.verifiedAt ? `- Verified At: ${this.verifiedAt.toISOString()}` : ''}
${this.verifiedBy ? `- Verified By: ${this.verifiedBy}` : ''}

${this.notes ? `NOTES: ${this.notes}` : ''}

This certificate serves as proof that the specified data has been securely deleted
in accordance with applicable data protection regulations and company policies.

Generated on: ${new Date().toISOString()}
  `.trim();
  
  return report;
};

// Static methods
deletionCertificateSchema.statics.findByPolicy = function(policyId: string) {
  return this.find({ policyId }).sort({ executedAt: -1 });
};

deletionCertificateSchema.statics.findByDataType = function(dataType: string) {
  return this.find({ dataType }).sort({ executedAt: -1 });
};

deletionCertificateSchema.statics.getComplianceSummary = function(timeframe: { start: Date; end: Date }) {
  return this.aggregate([
    {
      $match: {
        executedAt: {
          $gte: timeframe.start,
          $lte: timeframe.end
        }
      }
    },
    {
      $group: {
        _id: {
          dataType: '$dataType',
          status: '$status'
        },
        count: { $sum: 1 },
        totalRecordsDeleted: { $sum: '$recordsDeleted' },
        totalRecordsProcessed: { $sum: '$recordsProcessed' }
      }
    },
    {
      $group: {
        _id: '$_id.dataType',
        deletions: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalRecordsDeleted: '$totalRecordsDeleted',
            totalRecordsProcessed: '$totalRecordsProcessed'
          }
        },
        totalDeletions: { $sum: '$count' }
      }
    }
  ]);
};

deletionCertificateSchema.statics.findExpiredCertificates = function(retentionYears: number = 10) {
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() - retentionYears);
  
  return this.find({
    executedAt: { $lt: expirationDate }
  });
};

const DeletionCertificate = mongoose.model<IDeletionCertificate>('DeletionCertificate', deletionCertificateSchema);

export default DeletionCertificate;