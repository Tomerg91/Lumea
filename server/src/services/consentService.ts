import mongoose from 'mongoose';
import { Consent, IConsent } from '../models/Consent';
import { auditService } from './auditService';
import { encryptionService } from './encryptionService';
import { User } from '../models/User';

export interface ConsentRequest {
  userId: string;
  consentType: string;
  purpose: string;
  legalBasis?: string;
  category?: string;
  isRequired?: boolean;
  dataProcessed: string[];
  retentionPeriod?: number;
  thirdPartySharing?: {
    enabled: boolean;
    parties: string[];
    purpose: string;
  };
  automatedDecisionMaking?: {
    enabled: boolean;
    logic: string;
    significance: string;
  };
  consentMethod?: string;
  evidenceOfConsent: {
    consentString: string;
    checkboxes: Record<string, boolean>;
    signature?: string;
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
  ipAddress: string;
  userAgent: string;
  complianceFlags?: string[];
}

export interface ConsentWithdrawalRequest {
  userId: string;
  consentType: string;
  reason?: string;
  ipAddress: string;
  userAgent: string;
}

export interface ConsentMetrics {
  totalConsents: number;
  grantedConsents: number;
  withdrawnConsents: number;
  expiredConsents: number;
  consentsByType: Record<string, number>;
  consentsByCategory: Record<string, number>;
  averageRetentionPeriod: number;
  complianceBreakdown: Record<string, number>;
  expiringConsents: number;
  minorConsents: number;
}

export interface DataPortabilityRequest {
  userId: string;
  format: 'json' | 'xml' | 'csv';
  includeHistory: boolean;
  encryptData: boolean;
}

export interface ConsentPolicy {
  consentType: string;
  name: string;
  description: string;
  purpose: string;
  category: string;
  legalBasis: string;
  isRequired: boolean;
  defaultRetentionPeriod: number;
  dataProcessed: string[];
  renewalRequired: boolean;
  renewalPeriod?: number;
  minAge?: number;
  parentalConsentRequired?: boolean;
  complianceFlags: string[];
  template: {
    title: string;
    description: string;
    warningText?: string;
    checkboxText: string;
  };
  version: string;
  effectiveDate: Date;
  expirationDate?: Date;
  isActive: boolean;
}

class ConsentService {
  private readonly encryptionEnabled: boolean;

  constructor() {
    this.encryptionEnabled = process.env.CONSENT_ENCRYPTION_ENABLED === 'true';
  }

  /**
   * Grant consent for a user
   */
  async grantConsent(request: ConsentRequest): Promise<IConsent> {
    try {
      // Validate user exists
      const user = await User.findById(request.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check for existing active consent
      const existingConsent = await Consent.findOne({
        userId: request.userId,
        consentType: request.consentType,
        status: 'granted',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      if (existingConsent) {
        throw new Error('Active consent already exists for this type');
      }

      // Encrypt sensitive data if enabled
      let evidenceOfConsent = request.evidenceOfConsent;
      if (this.encryptionEnabled) {
        evidenceOfConsent = {
          ...request.evidenceOfConsent,
          consentString: await encryptionService.encryptField(request.evidenceOfConsent.consentString)
        };
      }

      // Create consent record
      const consent = new Consent({
        ...request,
        userId: new mongoose.Types.ObjectId(request.userId),
        evidenceOfConsent,
        auditTrail: [{
          action: 'granted',
          timestamp: new Date(),
          userId: new mongoose.Types.ObjectId(request.userId),
          ipAddress: request.ipAddress,
          userAgent: request.userAgent
        }]
      });

      await consent.save();

      // Log audit event
      await auditService.logEvent({
        userId: request.userId,
        action: 'consent_granted',
        resource: 'consent',
        resourceId: consent._id.toString(),
        details: {
          consentType: request.consentType,
          purpose: request.purpose,
          category: request.category,
          legalBasis: request.legalBasis
        },
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        compliance: {
          dataClassification: 'confidential',
          retentionCategory: 'consent_records',
          flags: request.complianceFlags || []
        }
      });

      return consent;
    } catch (error) {
      console.error('Error granting consent:', error);
      throw error;
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(request: ConsentWithdrawalRequest): Promise<IConsent | null> {
    try {
      const consent = await Consent.withdrawConsent(
        new mongoose.Types.ObjectId(request.userId),
        request.consentType,
        request.reason,
        request.ipAddress,
        request.userAgent
      );

      if (consent) {
        // Log audit event
        await auditService.logEvent({
          userId: request.userId,
          action: 'consent_withdrawn',
          resource: 'consent',
          resourceId: consent._id.toString(),
          details: {
            consentType: request.consentType,
            reason: request.reason
          },
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          compliance: {
            dataClassification: 'confidential',
            retentionCategory: 'consent_records',
            flags: consent.complianceFlags
          }
        });
      }

      return consent;
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      throw error;
    }
  }

  /**
   * Get user's active consents
   */
  async getUserConsents(userId: string): Promise<IConsent[]> {
    try {
      const consents = await Consent.getActiveConsents(new mongoose.Types.ObjectId(userId));
      
      // Decrypt sensitive data if needed
      if (this.encryptionEnabled) {
        for (const consent of consents) {
          if (consent.evidenceOfConsent?.consentString) {
            try {
              consent.evidenceOfConsent.consentString = await encryptionService.decryptField(
                consent.evidenceOfConsent.consentString
              );
            } catch (error) {
              console.error('Error decrypting consent string:', error);
              // Keep encrypted value if decryption fails
            }
          }
        }
      }

      return consents;
    } catch (error) {
      console.error('Error getting user consents:', error);
      throw error;
    }
  }

  /**
   * Get consent history for a user
   */
  async getConsentHistory(userId: string, consentType?: string): Promise<IConsent[]> {
    try {
      return await Consent.getConsentHistory(new mongoose.Types.ObjectId(userId), consentType);
    } catch (error) {
      console.error('Error getting consent history:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific consent
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean> {
    try {
      const consent = await Consent.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        consentType,
        status: 'granted',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      return !!consent;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false;
    }
  }

  /**
   * Get expiring consents
   */
  async getExpiringConsents(daysUntilExpiration: number = 30): Promise<IConsent[]> {
    try {
      return await Consent.getExpiringConsents(daysUntilExpiration);
    } catch (error) {
      console.error('Error getting expiring consents:', error);
      throw error;
    }
  }

  /**
   * Renew consent
   */
  async renewConsent(
    userId: string,
    consentType: string,
    evidenceOfConsent: any,
    ipAddress: string,
    userAgent: string,
    retentionPeriod?: number
  ): Promise<IConsent | null> {
    try {
      // Encrypt sensitive data if enabled
      if (this.encryptionEnabled && evidenceOfConsent.consentString) {
        evidenceOfConsent.consentString = await encryptionService.encryptField(evidenceOfConsent.consentString);
      }

      const consent = await Consent.renewConsent(
        new mongoose.Types.ObjectId(userId),
        consentType,
        evidenceOfConsent,
        ipAddress,
        userAgent,
        retentionPeriod
      );

      if (consent) {
        // Log audit event
        await auditService.logEvent({
          userId,
          action: 'consent_renewed',
          resource: 'consent',
          resourceId: consent._id.toString(),
          details: {
            consentType,
            retentionPeriod
          },
          ipAddress,
          userAgent,
          compliance: {
            dataClassification: 'confidential',
            retentionCategory: 'consent_records',
            flags: consent.complianceFlags
          }
        });
      }

      return consent;
    } catch (error) {
      console.error('Error renewing consent:', error);
      throw error;
    }
  }

  /**
   * Bulk withdraw consents for user (for right to be forgotten)
   */
  async withdrawAllConsents(
    userId: string,
    reason: string,
    ipAddress: string,
    userAgent: string
  ): Promise<number> {
    try {
      const activeConsents = await Consent.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'granted'
      });

      let withdrawnCount = 0;
      for (const consent of activeConsents) {
        await consent.withdraw(reason, ipAddress, userAgent);
        withdrawnCount++;
      }

      // Log audit event
      await auditService.logEvent({
        userId,
        action: 'consent_bulk_withdrawal',
        resource: 'consent',
        details: {
          reason,
          withdrawnCount
        },
        ipAddress,
        userAgent,
        compliance: {
          dataClassification: 'confidential',
          retentionCategory: 'consent_records',
          flags: ['GDPR', 'RIGHT_TO_BE_FORGOTTEN']
        }
      });

      return withdrawnCount;
    } catch (error) {
      console.error('Error withdrawing all consents:', error);
      throw error;
    }
  }

  /**
   * Get consent metrics for dashboard
   */
  async getConsentMetrics(): Promise<ConsentMetrics> {
    try {
      const [totalCount, statusCounts, typeCounts, categoryCounts, avgRetention, complianceCounts, expiringCount, minorCount] = await Promise.all([
        // Total consents
        Consent.countDocuments(),
        
        // Status breakdown
        Consent.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        
        // Type breakdown
        Consent.aggregate([
          { $group: { _id: '$consentType', count: { $sum: 1 } } }
        ]),
        
        // Category breakdown
        Consent.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        
        // Average retention period
        Consent.aggregate([
          { $group: { _id: null, avgRetention: { $avg: '$retentionPeriod' } } }
        ]),
        
        // Compliance flags breakdown
        Consent.aggregate([
          { $unwind: '$complianceFlags' },
          { $group: { _id: '$complianceFlags', count: { $sum: 1 } } }
        ]),
        
        // Expiring consents (next 30 days)
        Consent.countDocuments({
          status: 'granted',
          expiresAt: {
            $exists: true,
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            $gt: new Date()
          }
        }),
        
        // Minor consents
        Consent.countDocuments({
          'minorConsent.isMinor': true
        })
      ]);

      const statusMap = statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      const typeMap = typeCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      const categoryMap = categoryCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      const complianceMap = complianceCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalConsents: totalCount,
        grantedConsents: statusMap.granted || 0,
        withdrawnConsents: statusMap.withdrawn || 0,
        expiredConsents: statusMap.expired || 0,
        consentsByType: typeMap,
        consentsByCategory: categoryMap,
        averageRetentionPeriod: avgRetention[0]?.avgRetention || 365,
        complianceBreakdown: complianceMap,
        expiringConsents: expiringCount,
        minorConsents: minorCount
      };
    } catch (error) {
      console.error('Error getting consent metrics:', error);
      throw error;
    }
  }

  /**
   * Export user data for portability (GDPR)
   */
  async exportUserData(request: DataPortabilityRequest): Promise<any> {
    try {
      const consents = await Consent.find({
        userId: new mongoose.Types.ObjectId(request.userId)
      }).sort({ createdAt: -1 });

      let exportData: any = {
        userId: request.userId,
        exportDate: new Date().toISOString(),
        consents: []
      };

      for (const consent of consents) {
        // eslint-disable-next-line prefer-const
        let consentData: any = {
          id: consent._id,
          consentType: consent.consentType,
          purpose: consent.purpose,
          status: consent.status,
          grantedAt: consent.grantedAt,
          withdrawnAt: consent.withdrawnAt,
          expiresAt: consent.expiresAt,
          legalBasis: consent.legalBasis,
          category: consent.category,
          dataProcessed: consent.dataProcessed,
          complianceFlags: consent.complianceFlags
        };

        if (request.includeHistory) {
          consentData.auditTrail = consent.auditTrail;
        }

        // Decrypt data if needed for export
        if (this.encryptionEnabled && consent.evidenceOfConsent?.consentString) {
          try {
            consentData.evidenceOfConsent = {
              ...consent.evidenceOfConsent,
              consentString: await encryptionService.decryptField(consent.evidenceOfConsent.consentString)
            };
          } catch (error) {
            console.error('Error decrypting consent for export:', error);
            consentData.evidenceOfConsent = consent.evidenceOfConsent;
          }
        } else {
          consentData.evidenceOfConsent = consent.evidenceOfConsent;
        }

        exportData.consents.push(consentData);
      }

      // Encrypt export if requested
      if (request.encryptData) {
        exportData = await encryptionService.encryptData(JSON.stringify(exportData));
      }

      // Log audit event
      await auditService.logEvent({
        userId: request.userId,
        action: 'data_export',
        resource: 'consent',
        details: {
          format: request.format,
          includeHistory: request.includeHistory,
          encryptData: request.encryptData,
          recordCount: consents.length
        },
        compliance: {
          dataClassification: 'confidential',
          retentionCategory: 'data_export',
          flags: ['GDPR', 'DATA_PORTABILITY']
        }
      });

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Process expiring consents
   */
  async processExpiringConsents(): Promise<void> {
    try {
      const expiringConsents = await this.getExpiringConsents(7); // 7 days notice
      
      for (const consent of expiringConsents) {
        // Add audit entry for expiring consent
        await consent.addAuditEntry(
          'expiring_soon',
          undefined,
          `Consent expires on ${consent.expiresAt?.toISOString()}`,
          { daysUntilExpiration: consent.getDaysUntilExpiration() }
        );

        // Log audit event
        await auditService.logEvent({
          userId: consent.userId.toString(),
          action: 'consent_expiring_notice',
          resource: 'consent',
          resourceId: consent._id.toString(),
          details: {
            consentType: consent.consentType,
            expiresAt: consent.expiresAt,
            daysUntilExpiration: consent.getDaysUntilExpiration()
          },
          compliance: {
            dataClassification: 'confidential',
            retentionCategory: 'consent_records',
            flags: consent.complianceFlags
          }
        });
      }

      // Mark actually expired consents
      const expiredConsents = await Consent.find({
        status: 'granted',
        expiresAt: { $lte: new Date() }
      });

      for (const consent of expiredConsents) {
        consent.status = 'expired';
        consent.auditTrail.push({
          action: 'expired',
          timestamp: new Date(),
          reason: 'Automatic expiration based on retention period'
        });
        await consent.save();

        // Log audit event
        await auditService.logEvent({
          userId: consent.userId.toString(),
          action: 'consent_expired',
          resource: 'consent',
          resourceId: consent._id.toString(),
          details: {
            consentType: consent.consentType,
            expiredAt: new Date()
          },
          compliance: {
            dataClassification: 'confidential',
            retentionCategory: 'consent_records',
            flags: consent.complianceFlags
          }
        });
      }
    } catch (error) {
      console.error('Error processing expiring consents:', error);
      throw error;
    }
  }

  /**
   * Validate consent requirements for an action
   */
  async validateConsentForAction(
    userId: string,
    actionType: string,
    requiredConsents: string[]
  ): Promise<{ isValid: boolean; missingConsents: string[] }> {
    try {
      const userConsents = await this.getUserConsents(userId);
      const grantedConsentTypes = userConsents.map(c => c.consentType);
      
      const missingConsents = requiredConsents.filter(
        required => !grantedConsentTypes.includes(required)
      );

      return {
        isValid: missingConsents.length === 0,
        missingConsents
      };
    } catch (error) {
      console.error('Error validating consent for action:', error);
      return {
        isValid: false,
        missingConsents: requiredConsents
      };
    }
  }
}

export const consentService = new ConsentService(); 