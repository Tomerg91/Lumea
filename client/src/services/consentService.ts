import { createFetchConfig } from './api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface ConsentRequest {
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
  complianceFlags?: string[];
}

export interface ConsentResponse {
  id: string;
  consentType: string;
  purpose: string;
  status: 'granted' | 'denied' | 'withdrawn' | 'expired';
  legalBasis: string;
  category: string;
  isRequired: boolean;
  dataProcessed: string[];
  grantedAt: string;
  expiresAt?: string;
  retentionPeriod: number;
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
  complianceFlags: string[];
  daysUntilExpiration?: number | null;
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

export interface DataExportRequest {
  format?: 'json' | 'xml' | 'csv';
  includeHistory?: boolean;
  encryptData?: boolean;
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
  effectiveDate: string;
  expirationDate?: string;
  isActive: boolean;
}

class ConsentService {
  private baseUrl = `${API_BASE_URL}/consent`;

  /**
   * Grant consent
   */
  async grantConsent(consentRequest: ConsentRequest): Promise<ConsentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/grant`, createFetchConfig({
        method: 'POST',
        body: JSON.stringify(consentRequest)
      }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to grant consent' 
        }));
        throw new Error(errorData.message || 'Failed to grant consent');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error granting consent:', error);
      throw error;
    }
  }

  /**
   * Withdraw specific consent
   */
  async withdrawConsent(consentType: string, reason?: string): Promise<ConsentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/withdraw`, createFetchConfig({
        method: 'POST',
        body: JSON.stringify({ consentType, reason })
      }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to withdraw consent' 
        }));
        throw new Error(errorData.message || 'Failed to withdraw consent');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error withdrawing consent:', error);
      throw error;
    }
  }

  /**
   * Get user's current consents
   */
  async getUserConsents(): Promise<ConsentResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/my-consents`, createFetchConfig());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to get user consents' 
        }));
        throw new Error(errorData.message || 'Failed to get user consents');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error getting user consents:', error);
      throw error;
    }
  }

  /**
   * Get consent history
   */
  async getConsentHistory(consentType?: string): Promise<ConsentResponse[]> {
    try {
      const url = new URL(`${this.baseUrl}/history`);
      if (consentType) {
        url.searchParams.append('consentType', consentType);
      }

      const response = await fetch(url.toString(), createFetchConfig());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to get consent history' 
        }));
        throw new Error(errorData.message || 'Failed to get consent history');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error getting consent history:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific consent
   */
  async hasConsent(consentType: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/check/${consentType}`, createFetchConfig());

      if (!response.ok) {
        console.error('Error checking consent:', await response.text());
        return false;
      }

      const data = await response.json();
      return data.data.hasConsent;
    } catch (error: any) {
      console.error('Error checking consent:', error);
      return false;
    }
  }

  /**
   * Renew existing consent
   */
  async renewConsent(
    consentType: string,
    evidenceOfConsent: any,
    retentionPeriod?: number
  ): Promise<ConsentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/renew`, createFetchConfig({
        method: 'POST',
        body: JSON.stringify({
          consentType,
          evidenceOfConsent,
          retentionPeriod
        })
      }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to renew consent' 
        }));
        throw new Error(errorData.message || 'Failed to renew consent');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error renewing consent:', error);
      throw error;
    }
  }

  /**
   * Validate consent requirements for an action
   */
  async validateConsentForAction(
    actionType: string,
    requiredConsents: string[]
  ): Promise<{ isValid: boolean; missingConsents: string[]; actionType: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, createFetchConfig({
        method: 'POST',
        body: JSON.stringify({
          actionType,
          requiredConsents
        })
      }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to validate consent' 
        }));
        throw new Error(errorData.message || 'Failed to validate consent');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error validating consent for action:', error);
      throw error;
    }
  }

  /**
   * Withdraw all consents (Right to be forgotten)
   */
  async withdrawAllConsents(reason?: string): Promise<{ withdrawnCount: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/withdraw-all`, createFetchConfig({
        method: 'POST',
        body: JSON.stringify({
          reason: reason || 'User requested withdrawal of all consents'
        })
      }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to withdraw all consents' 
        }));
        throw new Error(errorData.message || 'Failed to withdraw all consents');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error withdrawing all consents:', error);
      throw error;
    }
  }

  /**
   * Export user data (GDPR Data Portability)
   */
  async exportUserData(format: 'json' | 'xml' | 'csv' = 'json', includeHistory: boolean = true): Promise<void> {
    try {
      const url = new URL(`${this.baseUrl}/export`);
      url.searchParams.append('format', format);
      url.searchParams.append('includeHistory', includeHistory.toString());

      const response = await fetch(url.toString(), createFetchConfig());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to export user data' 
        }));
        throw new Error(errorData.message || 'Failed to export user data');
      }

      // Create download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `consent-data-${timestamp}.${format}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // Admin methods (require admin role)

  /**
   * Get consent metrics (Admin only)
   */
  async getConsentMetrics(): Promise<ConsentMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/metrics`, createFetchConfig());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to get consent metrics' 
        }));
        throw new Error(errorData.message || 'Failed to get consent metrics');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error getting consent metrics:', error);
      throw error;
    }
  }

  /**
   * Get expiring consents (Admin only)
   */
  async getExpiringConsents(days: number = 30): Promise<ConsentResponse[]> {
    try {
      const url = new URL(`${this.baseUrl}/admin/expiring`);
      url.searchParams.append('days', days.toString());

      const response = await fetch(url.toString(), createFetchConfig());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to get expiring consents' 
        }));
        throw new Error(errorData.message || 'Failed to get expiring consents');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error getting expiring consents:', error);
      throw error;
    }
  }

  /**
   * Process expiring consents (Admin only)
   */
  async processExpiringConsents(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/admin/process-expiring`, createFetchConfig({
        method: 'POST'
      }));
    } catch (error: any) {
      console.error('Error processing expiring consents:', error);
      throw error;
    }
  }

  /**
   * Get user consent by ID (Admin only)
   */
  async getUserConsentById(userId: string): Promise<ConsentResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/user/${userId}`, createFetchConfig());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to get user consent' 
        }));
        throw new Error(errorData.message || 'Failed to get user consent');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error getting user consent by ID:', error);
      throw error;
    }
  }

  /**
   * Test consent system
   */
  async testConsentSystem(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, createFetchConfig());

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: 'Failed to test consent system' 
        }));
        throw new Error(errorData.message || 'Failed to test consent system');
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error testing consent system:', error);
      throw error;
    }
  }

  // Utility methods

  /**
   * Generate common consent types with default configurations
   */
  getConsentTypes(): ConsentPolicy[] {
    return [
      {
        consentType: 'cookies',
        name: 'Cookie Consent',
        description: 'Consent for using cookies to enhance user experience',
        purpose: 'Website functionality and user experience improvement',
        category: 'functional',
        legalBasis: 'consent',
        isRequired: false,
        defaultRetentionPeriod: 365,
        dataProcessed: ['browsing_behavior', 'preferences', 'session_data'],
        renewalRequired: true,
        renewalPeriod: 365,
        complianceFlags: ['GDPR', 'CCPA'],
        template: {
          title: 'Cookie Consent',
          description: 'We use cookies to improve your experience on our website.',
          checkboxText: 'I agree to the use of cookies for website functionality'
        },
        version: '1.0',
        effectiveDate: new Date().toISOString(),
        isActive: true
      },
      {
        consentType: 'analytics',
        name: 'Analytics Consent',
        description: 'Consent for collecting analytics data',
        purpose: 'Website analytics and performance monitoring',
        category: 'analytics',
        legalBasis: 'consent',
        isRequired: false,
        defaultRetentionPeriod: 730,
        dataProcessed: ['page_views', 'user_interactions', 'performance_metrics'],
        renewalRequired: true,
        renewalPeriod: 365,
        complianceFlags: ['GDPR'],
        template: {
          title: 'Analytics Consent',
          description: 'Help us improve our website by allowing us to collect anonymous usage data.',
          checkboxText: 'I agree to analytics data collection'
        },
        version: '1.0',
        effectiveDate: new Date().toISOString(),
        isActive: true
      },
      {
        consentType: 'marketing',
        name: 'Marketing Consent',
        description: 'Consent for marketing communications',
        purpose: 'Sending promotional emails and marketing materials',
        category: 'marketing',
        legalBasis: 'consent',
        isRequired: false,
        defaultRetentionPeriod: 1095,
        dataProcessed: ['email_address', 'preferences', 'interaction_history'],
        renewalRequired: true,
        renewalPeriod: 365,
        complianceFlags: ['GDPR', 'CCPA'],
        template: {
          title: 'Marketing Communications',
          description: 'Receive updates about our services and special offers.',
          checkboxText: 'I agree to receive marketing communications'
        },
        version: '1.0',
        effectiveDate: new Date().toISOString(),
        isActive: true
      },
      {
        consentType: 'hipaa_authorization',
        name: 'HIPAA Authorization',
        description: 'Authorization for use and disclosure of protected health information',
        purpose: 'Treatment, payment, and healthcare operations',
        category: 'hipaa_treatment',
        legalBasis: 'consent',
        isRequired: true,
        defaultRetentionPeriod: 2555, // ~7 years
        dataProcessed: ['medical_records', 'treatment_plans', 'health_data'],
        renewalRequired: false,
        complianceFlags: ['HIPAA'],
        template: {
          title: 'HIPAA Authorization',
          description: 'Authorization for the use and disclosure of your protected health information for treatment, payment, and healthcare operations.',
          warningText: 'This authorization is required to provide healthcare services.',
          checkboxText: 'I authorize the use and disclosure of my protected health information'
        },
        version: '1.0',
        effectiveDate: new Date().toISOString(),
        isActive: true
      },
      {
        consentType: 'data_processing',
        name: 'Data Processing Consent',
        description: 'General consent for processing personal data',
        purpose: 'Core platform functionality and service delivery',
        category: 'essential',
        legalBasis: 'consent',
        isRequired: true,
        defaultRetentionPeriod: 2555,
        dataProcessed: ['personal_information', 'account_data', 'usage_data'],
        renewalRequired: false,
        complianceFlags: ['GDPR'],
        template: {
          title: 'Data Processing',
          description: 'Consent for processing your personal data to provide our services.',
          warningText: 'This consent is required to use our platform.',
          checkboxText: 'I consent to the processing of my personal data'
        },
        version: '1.0',
        effectiveDate: new Date().toISOString(),
        isActive: true
      }
    ];
  }

  /**
   * Check if user is subject to GDPR
   */
  isGDPRSubject(): boolean {
    // This would typically check user location or IP
    // For now, assume all users are subject to GDPR for compliance
    return true;
  }

  /**
   * Check if user is subject to HIPAA
   */
  isHIPAASubject(): boolean {
    // Check if user has healthcare-related data
    // This would be determined by the application context
    return true; // Assume yes for healthcare coaching platform
  }

  /**
   * Get required consents for user based on regulations
   */
  getRequiredConsents(): string[] {
    const required: string[] = [];
    
    if (this.isGDPRSubject()) {
      required.push('data_processing');
    }
    
    if (this.isHIPAASubject()) {
      required.push('hipaa_authorization');
    }
    
    return required;
  }

  /**
   * Get optional consents that can enhance user experience
   */
  getOptionalConsents(): string[] {
    return ['cookies', 'analytics', 'marketing'];
  }

  /**
   * Create evidence of consent object
   */
  createEvidenceOfConsent(consentString: string, checkboxes: Record<string, boolean>): any {
    return {
      consentString,
      checkboxes,
      timestamp: new Date().toISOString()
    };
  }
}

export const consentService = new ConsentService(); 