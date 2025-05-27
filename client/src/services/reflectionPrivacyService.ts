import { EnhancedSearchResult } from './reflectionSearchService';
import { ReflectionInsight, ClientProgressMetrics, CoachingRecommendation } from './reflectionAnalyticsService';

// Privacy and access control interfaces
export interface PrivacySettings {
  clientId: string;
  coachCanView: boolean;
  coachCanAnalyze: boolean;
  dataRetentionDays: number;
  anonymizeData: boolean;
  shareWithResearch: boolean;
  exportPermissions: {
    allowExport: boolean;
    formats: ('json' | 'csv' | 'pdf')[];
    includePersonalInfo: boolean;
  };
  accessRestrictions: {
    timeBasedAccess: boolean;
    ipWhitelist: string[];
    requireTwoFactor: boolean;
  };
  updatedAt: string;
  consentVersion: string;
}

export interface DataAccessLog {
  id: string;
  userId: string;
  userRole: 'client' | 'coach' | 'admin';
  action: 'view' | 'export' | 'analyze' | 'modify' | 'delete';
  resourceType: 'reflection' | 'analytics' | 'client_data' | 'report';
  resourceId: string;
  clientId: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  denialReason?: string;
  dataModified?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface ConsentRecord {
  clientId: string;
  consentType: 'data_collection' | 'data_processing' | 'data_sharing' | 'analytics' | 'export';
  granted: boolean;
  timestamp: string;
  consentVersion: string;
  ipAddress: string;
  consentSource: 'app' | 'email' | 'verbal' | 'implied';
  expiresAt?: string;
  withdrawnAt?: string;
  withdrawalReason?: string;
}

export interface AnonymizationRule {
  field: string;
  method: 'hash' | 'mask' | 'remove' | 'generalize' | 'noise';
  strength: 'light' | 'medium' | 'strong';
  preserveAnalytics: boolean;
}

export interface DataSubjectRequest {
  id: string;
  clientId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restrict_processing' | 'object';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  submittedAt: string;
  processedAt?: string;
  completedAt?: string;
  requestDetails: string;
  responseData?: any;
  rejectionReason?: string;
  handledBy?: string;
  expiresAt: string;
}

class ReflectionPrivacyService {
  private privacySettings: Map<string, PrivacySettings> = new Map();
  private accessLogs: DataAccessLog[] = [];
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private anonymizationRules: AnonymizationRule[] = [
    {
      field: 'email',
      method: 'hash',
      strength: 'strong',
      preserveAnalytics: true,
    },
    {
      field: 'name',
      method: 'mask',
      strength: 'medium',
      preserveAnalytics: false,
    },
    {
      field: 'reflection_content',
      method: 'generalize',
      strength: 'light',
      preserveAnalytics: true,
    },
  ];

  // Initialize default privacy settings for a client
  async initializeClientPrivacy(clientId: string): Promise<PrivacySettings> {
    const defaultSettings: PrivacySettings = {
      clientId,
      coachCanView: true,
      coachCanAnalyze: true,
      dataRetentionDays: 365 * 2, // 2 years default
      anonymizeData: false,
      shareWithResearch: false,
      exportPermissions: {
        allowExport: true,
        formats: ['json', 'pdf'],
        includePersonalInfo: true,
      },
      accessRestrictions: {
        timeBasedAccess: false,
        ipWhitelist: [],
        requireTwoFactor: false,
      },
      updatedAt: new Date().toISOString(),
      consentVersion: '1.0',
    };

    this.privacySettings.set(clientId, defaultSettings);
    await this.logDataAccess({
      userId: 'system',
      userRole: 'admin',
      action: 'modify',
      resourceType: 'client_data',
      resourceId: clientId,
      clientId,
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'System',
      dataModified: [{
        field: 'privacy_settings',
        oldValue: null,
        newValue: defaultSettings,
      }],
    });

    return defaultSettings;
  }

  // Update client privacy settings
  async updatePrivacySettings(
    clientId: string,
    updates: Partial<PrivacySettings>,
    requestedBy: string,
    userRole: 'client' | 'coach' | 'admin',
    ipAddress: string,
    userAgent: string
  ): Promise<PrivacySettings> {
    const currentSettings = this.privacySettings.get(clientId);
    if (!currentSettings) {
      throw new Error('Privacy settings not found for client');
    }

    // Validate permissions for update
    if (userRole === 'coach' && requestedBy !== clientId) {
      // Coaches can only view settings, not modify them
      throw new Error('Insufficient permissions to modify privacy settings');
    }

    const oldSettings = { ...currentSettings };
    const newSettings: PrivacySettings = {
      ...currentSettings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.privacySettings.set(clientId, newSettings);

    // Log the access and modification
    await this.logDataAccess({
      userId: requestedBy,
      userRole,
      action: 'modify',
      resourceType: 'client_data',
      resourceId: clientId,
      clientId,
      success: true,
      ipAddress,
      userAgent,
      dataModified: Object.keys(updates).map(field => ({
        field,
        oldValue: (oldSettings as any)[field],
        newValue: (newSettings as any)[field],
      })),
    });

    return newSettings;
  }

  // Check if user can access specific reflection data
  async canAccessReflection(
    reflectionId: string,
    clientId: string,
    userId: string,
    userRole: 'client' | 'coach' | 'admin',
    action: 'view' | 'export' | 'analyze',
    ipAddress: string,
    userAgent: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const settings = this.privacySettings.get(clientId);
    if (!settings) {
      await this.logDataAccess({
        userId,
        userRole,
        action,
        resourceType: 'reflection',
        resourceId: reflectionId,
        clientId,
        success: false,
        denialReason: 'Privacy settings not found',
        ipAddress,
        userAgent,
      });
      return { allowed: false, reason: 'Privacy settings not found' };
    }

    // Always allow clients to access their own data
    if (userRole === 'client' && userId === clientId) {
      await this.logDataAccess({
        userId,
        userRole,
        action,
        resourceType: 'reflection',
        resourceId: reflectionId,
        clientId,
        success: true,
        ipAddress,
        userAgent,
      });
      return { allowed: true };
    }

    // Check coach permissions
    if (userRole === 'coach') {
      if (action === 'view' && !settings.coachCanView) {
        await this.logDataAccess({
          userId,
          userRole,
          action,
          resourceType: 'reflection',
          resourceId: reflectionId,
          clientId,
          success: false,
          denialReason: 'Coach viewing disabled by client',
          ipAddress,
          userAgent,
        });
        return { allowed: false, reason: 'Coach viewing disabled by client' };
      }

      if (action === 'analyze' && !settings.coachCanAnalyze) {
        await this.logDataAccess({
          userId,
          userRole,
          action,
          resourceType: 'reflection',
          resourceId: reflectionId,
          clientId,
          success: false,
          denialReason: 'Coach analysis disabled by client',
          ipAddress,
          userAgent,
        });
        return { allowed: false, reason: 'Coach analysis disabled by client' };
      }

      if (action === 'export' && !settings.exportPermissions.allowExport) {
        await this.logDataAccess({
          userId,
          userRole,
          action,
          resourceType: 'reflection',
          resourceId: reflectionId,
          clientId,
          success: false,
          denialReason: 'Export disabled by client',
          ipAddress,
          userAgent,
        });
        return { allowed: false, reason: 'Export disabled by client' };
      }
    }

    // Check IP restrictions
    if (settings.accessRestrictions.ipWhitelist.length > 0 && 
        !settings.accessRestrictions.ipWhitelist.includes(ipAddress)) {
      await this.logDataAccess({
        userId,
        userRole,
        action,
        resourceType: 'reflection',
        resourceId: reflectionId,
        clientId,
        success: false,
        denialReason: 'IP address not whitelisted',
        ipAddress,
        userAgent,
      });
      return { allowed: false, reason: 'IP address not whitelisted' };
    }

    // Check time-based access (simplified - would need more complex logic)
    if (settings.accessRestrictions.timeBasedAccess) {
      const currentHour = new Date().getHours();
      if (currentHour < 8 || currentHour > 18) { // Example: 8 AM - 6 PM
        await this.logDataAccess({
          userId,
          userRole,
          action,
          resourceType: 'reflection',
          resourceId: reflectionId,
          clientId,
          success: false,
          denialReason: 'Access outside permitted hours',
          ipAddress,
          userAgent,
        });
        return { allowed: false, reason: 'Access outside permitted hours' };
      }
    }

    await this.logDataAccess({
      userId,
      userRole,
      action,
      resourceType: 'reflection',
      resourceId: reflectionId,
      clientId,
      success: true,
      ipAddress,
      userAgent,
    });

    return { allowed: true };
  }

  // Anonymize reflection data based on privacy settings
  async anonymizeReflectionData(
    reflections: EnhancedSearchResult[],
    clientId: string,
    requestedBy: string,
    purpose: 'analytics' | 'research' | 'export'
  ): Promise<EnhancedSearchResult[]> {
    const settings = this.privacySettings.get(clientId);
    if (!settings || !settings.anonymizeData) {
      return reflections;
    }

    return reflections.map(reflection => {
      const anonymized = { ...reflection };

      // Apply anonymization rules
      this.anonymizationRules.forEach(rule => {
        if (rule.field === 'email' && anonymized.client?.email) {
          anonymized.client.email = this.applyAnonymization(anonymized.client.email, rule);
        }
        
        if (rule.field === 'name' && anonymized.client?.name) {
          anonymized.client.name = this.applyAnonymization(anonymized.client.name, rule);
        }

        if (rule.field === 'reflection_content') {
          anonymized.preview = anonymized.preview.map(preview => ({
            ...preview,
            value: typeof preview.value === 'string' 
              ? this.applyAnonymization(preview.value, rule)
              : preview.value,
            followUpAnswer: preview.followUpAnswer 
              ? this.applyAnonymization(preview.followUpAnswer, rule)
              : preview.followUpAnswer,
          }));
        }
      });

      return anonymized;
    });
  }

  // Apply specific anonymization method
  private applyAnonymization(value: string, rule: AnonymizationRule): string {
    switch (rule.method) {
      case 'hash':
        return this.hashValue(value, rule.strength);
      case 'mask':
        return this.maskValue(value, rule.strength);
      case 'remove':
        return '[REMOVED]';
      case 'generalize':
        return this.generalizeValue(value, rule.strength);
      case 'noise':
        return this.addNoise(value, rule.strength);
      default:
        return value;
    }
  }

  private hashValue(value: string, strength: string): string {
    // Simple hash implementation - in production, use crypto.subtle
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const hashStr = Math.abs(hash).toString(16);
    return strength === 'strong' ? `***${hashStr.slice(-3)}` : `${hashStr.slice(0, 4)}***`;
  }

  private maskValue(value: string, strength: string): string {
    if (value.length <= 2) return '***';
    
    switch (strength) {
      case 'light':
        return value.charAt(0) + '*'.repeat(value.length - 2) + value.charAt(value.length - 1);
      case 'medium':
        return value.substring(0, 2) + '*'.repeat(Math.max(1, value.length - 2));
      case 'strong':
        return '*'.repeat(value.length);
      default:
        return value;
    }
  }

  private generalizeValue(value: string, strength: string): string {
    // Simplified generalization - replace specific terms with categories
    const generalizations: Record<string, string> = {
      'specific_goal': '[GOAL]',
      'specific_challenge': '[CHALLENGE]',
      'personal_name': '[PERSON]',
      'specific_date': '[DATE]',
      'specific_location': '[LOCATION]',
    };

    let generalized = value;
    Object.entries(generalizations).forEach(([pattern, replacement]) => {
      // This would be more sophisticated in production
      if (strength === 'strong' && generalized.length > 50) {
        generalized = generalized.substring(0, 50) + '... [CONTENT GENERALIZED]';
      }
    });

    return generalized;
  }

  private addNoise(value: string, strength: string): string {
    // Add character-level noise while preserving meaning
    const noiseLevel = strength === 'strong' ? 0.1 : strength === 'medium' ? 0.05 : 0.02;
    const chars = value.split('');
    
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < noiseLevel && chars[i] !== ' ') {
        // Replace with similar character
        const char = chars[i].toLowerCase();
        const replacements: Record<string, string> = {
          'a': 'e', 'e': 'a', 'i': 'e', 'o': 'u', 'u': 'o',
          's': 'z', 'z': 's', 'c': 'k', 'k': 'c'
        };
        chars[i] = replacements[char] || char;
      }
    }
    
    return chars.join('');
  }

  // Record consent
  async recordConsent(
    clientId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    ipAddress: string,
    consentSource: ConsentRecord['consentSource'] = 'app',
    consentVersion: string = '1.0',
    expiresAt?: string
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      clientId,
      consentType,
      granted,
      timestamp: new Date().toISOString(),
      consentVersion,
      ipAddress,
      consentSource,
      expiresAt,
    };

    if (!this.consentRecords.has(clientId)) {
      this.consentRecords.set(clientId, []);
    }
    
    this.consentRecords.get(clientId)!.push(consent);

    await this.logDataAccess({
      userId: clientId,
      userRole: 'client',
      action: 'modify',
      resourceType: 'client_data',
      resourceId: `consent-${consentType}`,
      clientId,
      success: true,
      ipAddress,
      userAgent: 'Consent Management',
      dataModified: [{
        field: 'consent',
        oldValue: null,
        newValue: consent,
      }],
    });

    return consent;
  }

  // Withdraw consent
  async withdrawConsent(
    clientId: string,
    consentType: ConsentRecord['consentType'],
    reason: string,
    ipAddress: string
  ): Promise<ConsentRecord> {
    const consents = this.consentRecords.get(clientId) || [];
    const latestConsent = consents
      .filter(c => c.consentType === consentType && c.granted && !c.withdrawnAt)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!latestConsent) {
      throw new Error('No active consent found to withdraw');
    }

    latestConsent.withdrawnAt = new Date().toISOString();
    latestConsent.withdrawalReason = reason;

    await this.logDataAccess({
      userId: clientId,
      userRole: 'client',
      action: 'modify',
      resourceType: 'client_data',
      resourceId: `consent-${consentType}`,
      clientId,
      success: true,
      ipAddress,
      userAgent: 'Consent Management',
      dataModified: [{
        field: 'consent_withdrawal',
        oldValue: null,
        newValue: { withdrawnAt: latestConsent.withdrawnAt, reason },
      }],
    });

    return latestConsent;
  }

  // Process data subject rights request (GDPR)
  async submitDataSubjectRequest(
    clientId: string,
    requestType: DataSubjectRequest['requestType'],
    requestDetails: string,
    submittedBy: string
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: `dsr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      clientId,
      requestType,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      requestDetails,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days to process
    };

    await this.logDataAccess({
      userId: submittedBy,
      userRole: 'client',
      action: 'modify',
      resourceType: 'client_data',
      resourceId: request.id,
      clientId,
      success: true,
      ipAddress: '0.0.0.0', // Would be actual IP
      userAgent: 'DSR System',
      dataModified: [{
        field: 'data_subject_request',
        oldValue: null,
        newValue: request,
      }],
    });

    return request;
  }

  // Get access logs for audit
  async getAccessLogs(
    clientId?: string,
    dateFrom?: string,
    dateTo?: string,
    action?: string,
    limit: number = 100
  ): Promise<DataAccessLog[]> {
    let logs = this.accessLogs;

    if (clientId) {
      logs = logs.filter(log => log.clientId === clientId);
    }

    if (dateFrom) {
      logs = logs.filter(log => log.timestamp >= dateFrom);
    }

    if (dateTo) {
      logs = logs.filter(log => log.timestamp <= dateTo);
    }

    if (action) {
      logs = logs.filter(log => log.action === action);
    }

    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Data retention cleanup
  async cleanupExpiredData(): Promise<{
    deletedReflections: number;
    anonymizedClients: number;
    cleanedLogs: number;
  }> {
    const deletedReflections = 0;
    let anonymizedClients = 0;
    let cleanedLogs = 0;

    // Clean up based on retention settings
    for (const [clientId, settings] of this.privacySettings) {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - settings.dataRetentionDays);
      
      // This would integrate with actual data storage
      // For now, just count what would be cleaned
      anonymizedClients++;
    }

    // Clean old access logs (keep for 1 year max)
    const logRetentionDate = new Date();
    logRetentionDate.setFullYear(logRetentionDate.getFullYear() - 1);
    
    const initialLogCount = this.accessLogs.length;
    this.accessLogs = this.accessLogs.filter(log => 
      new Date(log.timestamp) > logRetentionDate
    );
    cleanedLogs = initialLogCount - this.accessLogs.length;

    return {
      deletedReflections,
      anonymizedClients,
      cleanedLogs,
    };
  }

  // Export client data (GDPR portability)
  async exportClientData(
    clientId: string,
    format: 'json' | 'csv' | 'pdf' = 'json',
    includeAnalytics: boolean = false
  ): Promise<Blob> {
    const settings = this.privacySettings.get(clientId);
    if (!settings?.exportPermissions.allowExport) {
      throw new Error('Export not permitted for this client');
    }

    if (!settings.exportPermissions.formats.includes(format)) {
      throw new Error(`Export format ${format} not permitted`);
    }

    // Collect all client data
    const exportData = {
      client: {
        id: clientId,
        privacySettings: settings,
        consents: this.consentRecords.get(clientId) || [],
        accessLogs: this.accessLogs.filter(log => log.clientId === clientId),
      },
      reflections: [], // Would fetch from actual storage
      analytics: includeAnalytics ? {} : undefined,
      exportedAt: new Date().toISOString(),
      format,
    };

    // Remove personal info if not permitted
    if (!settings.exportPermissions.includePersonalInfo) {
      // Anonymize the export data
      // Implementation would depend on specific requirements
    }

    if (format === 'json') {
      return new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvContent = this.convertToCSV(exportData);
      return new Blob([csvContent], {
        type: 'text/csv',
      });
    } else if (format === 'pdf') {
      // This would require a PDF library in production
      const textContent = JSON.stringify(exportData, null, 2);
      return new Blob([textContent], {
        type: 'application/pdf',
      });
    }

    throw new Error('Unsupported export format');
  }

  // Helper method to log data access
  private async logDataAccess(logData: Omit<DataAccessLog, 'id' | 'timestamp'>): Promise<void> {
    const log: DataAccessLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...logData,
    };

    this.accessLogs.push(log);

    // In production, this would also send to external audit system
    console.log('Data access logged:', log);
  }

  // Helper method to convert data to CSV
  private convertToCSV(data: any): string {
    // Simplified CSV conversion - would be more robust in production
    const flatten = (obj: any, prefix = ''): any => {
      const flattened: any = {};
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          Object.assign(flattened, flatten(obj[key], `${prefix}${key}.`));
        } else {
          flattened[`${prefix}${key}`] = obj[key];
        }
      }
      return flattened;
    };

    const flattened = flatten(data);
    const headers = Object.keys(flattened);
    const values = Object.values(flattened);

    return [
      headers.join(','),
      values.map(value => `"${value}"`).join(',')
    ].join('\n');
  }

  // Get privacy settings for a client
  getPrivacySettings(clientId: string): PrivacySettings | null {
    return this.privacySettings.get(clientId) || null;
  }

  // Get all client consent records
  getConsentRecords(clientId: string): ConsentRecord[] {
    return this.consentRecords.get(clientId) || [];
  }
}

// Export singleton instance
export const reflectionPrivacyService = new ReflectionPrivacyService(); 