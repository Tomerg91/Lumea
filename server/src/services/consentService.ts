import { auditService } from './auditService';
import { encryptionService } from './encryptionService';
import { User } from '../models/User';

export interface IConsent { // Placeholder interface
  _id: string;
  userId: string;
  consentType: string;
  status: string;
  grantedAt: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;
  evidenceOfConsent?: any;
  auditTrail: any[];
  complianceFlags: string[];
  purpose: string;
  legalBasis?: string;
  category?: string;
  dataProcessed: string[];
  retentionPeriod?: number;
  getDaysUntilExpiration?: () => number;
  withdraw?: (reason: string, ipAddress: string, userAgent: string) => Promise<void>;
  addAuditEntry?: (action: string, userId?: string, reason?: string, metadata?: Record<string, any>) => Promise<void>;
}

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
    console.warn('grantConsent is a placeholder. Implement with Supabase.');
    // Simulate a granted consent
    const newConsent: IConsent = {
      _id: 'mock_consent_id',
      userId: request.userId,
      consentType: request.consentType,
      status: 'granted',
      grantedAt: new Date(),
      auditTrail: [],
      complianceFlags: request.complianceFlags || [],
      purpose: request.purpose,
      dataProcessed: request.dataProcessed,
    };
    await auditService.logEvent({
      userId: request.userId,
      action: 'consent_granted',
      resource: 'consent',
      resourceId: newConsent._id.toString(),
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
    return newConsent;
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(request: ConsentWithdrawalRequest): Promise<IConsent | null> {
    console.warn('withdrawConsent is a placeholder. Implement with Supabase.');
    // Simulate a withdrawn consent
    const withdrawnConsent: IConsent = {
      _id: 'mock_consent_id',
      userId: request.userId,
      consentType: request.consentType,
      status: 'withdrawn',
      grantedAt: new Date(),
      withdrawnAt: new Date(),
      auditTrail: [],
      complianceFlags: [],
      purpose: 'mock',
      dataProcessed: [],
    };
    await auditService.logEvent({
      userId: request.userId,
      action: 'consent_withdrawn',
      resource: 'consent',
      resourceId: withdrawnConsent._id.toString(),
      details: {
        consentType: request.consentType,
        reason: request.reason
      },
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      compliance: {
        dataClassification: 'confidential',
        retentionCategory: 'consent_records',
        flags: withdrawnConsent.complianceFlags
      }
    });
    return withdrawnConsent;
  }

  /**
   * Get user's active consents
   */
  async getUserConsents(userId: string): Promise<IConsent[]> {
    console.warn('getUserConsents is a placeholder. Implement with Supabase.');
    return [];
  }

  /**
   * Get consent history for a user
   */
  async getConsentHistory(userId: string, consentType?: string): Promise<IConsent[]> {
    console.warn('getConsentHistory is a placeholder. Implement with Supabase.');
    return [];
  }

  /**
   * Check if user has specific consent
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean> {
    console.warn('hasConsent is a placeholder. Implement with Supabase.');
    return false;
  }

  /**
   * Get expiring consents
   */
  async getExpiringConsents(daysUntilExpiration: number = 30): Promise<IConsent[]> {
    console.warn('getExpiringConsents is a placeholder. Implement with Supabase.');
    return [];
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
    console.warn('renewConsent is a placeholder. Implement with Supabase.');
    // Simulate a renewed consent
    const renewedConsent: IConsent = {
      _id: 'mock_consent_id',
      userId: userId,
      consentType: consentType,
      status: 'granted',
      grantedAt: new Date(),
      auditTrail: [],
      complianceFlags: [],
      purpose: 'mock',
      dataProcessed: [],
    };
    await auditService.logEvent({
      userId,
      action: 'consent_renewed',
      resource: 'consent',
      resourceId: renewedConsent._id.toString(),
      details: {
        consentType,
        retentionPeriod
      },
      ipAddress,
      userAgent,
      compliance: {
        dataClassification: 'confidential',
        retentionCategory: 'consent_records',
        flags: renewedConsent.complianceFlags
      }
    });
    return renewedConsent;
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
    console.warn('withdrawAllConsents is a placeholder. Implement with Supabase.');
    // Simulate withdrawal
    await auditService.logEvent({
      userId,
      action: 'consent_bulk_withdrawal',
      resource: 'consent',
      details: {
        reason,
        withdrawnCount: 0 // Placeholder
      },
      ipAddress,
      userAgent,
      compliance: {
        dataClassification: 'confidential',
        retentionCategory: 'consent_records',
        flags: ['GDPR', 'RIGHT_TO_BE_FORGOTTEN']
      }
    });
    return 0;
  }

  /**
   * Get consent metrics for dashboard
   */
  async getConsentMetrics(): Promise<ConsentMetrics> {
    console.warn('getConsentMetrics is a placeholder. Implement with Supabase.');
    return {
      totalConsents: 0,
      grantedConsents: 0,
      withdrawnConsents: 0,
      expiredConsents: 0,
      consentsByType: {},
      consentsByCategory: {},
      averageRetentionPeriod: 0,
      complianceBreakdown: {},
      expiringConsents: 0,
      minorConsents: 0,
    };
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