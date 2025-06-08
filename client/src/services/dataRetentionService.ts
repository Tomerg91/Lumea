// Data Retention Service - Frontend API Interface
import { API_BASE_URL } from '../lib/api';

// Type definitions for data retention system
export interface DataRetentionPolicy {
  _id: string;
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  dataType: string;
  modelName: string;
  category: 'personal_data' | 'medical_data' | 'financial_data' | 'system_data' | 'audit_data';
  retentionPeriod: {
    value: number;
    unit: 'days' | 'months' | 'years';
    fromField: string;
  };
  deletionMethod: 'soft_delete' | 'hard_delete' | 'anonymize' | 'archive';
  secureWipe: boolean;
  batchSize: number;
  filters: {
    includeConditions: Record<string, any>;
    excludeConditions: Record<string, any>;
  };
  complianceRequirements: {
    hipaaMinimum?: number;
    gdprMaximum?: number;
    legalBasisRequired: boolean;
    auditTrailRetention: number;
  };
  autoExecute: boolean;
  schedulePattern?: string;
  nextExecutionAt?: Date;
  lastExecutedAt?: Date;
  notificationSettings: {
    beforeExecution: boolean;
    afterExecution: boolean;
    onFailure: boolean;
    recipients: string[];
  };
  legalHoldSupport: boolean;
  legalHoldField?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  executionHistory: ExecutionHistoryEntry[];
}

export interface ExecutionHistoryEntry {
  executedAt: Date;
  recordsProcessed: number;
  recordsDeleted: number;
  recordsSkipped: number;
  errorCount: number;
  executionTime: number;
  status: 'success' | 'partial' | 'failed';
  certificateId?: string;
  notes?: string;
}

export interface DeletionCertificate {
  _id: string;
  certificateId: string;
  certificateNumber: string;
  policyId: string;
  dataType: string;
  modelName: string;
  executedAt: Date;
  executedBy: string;
  executionMethod: 'automated' | 'manual' | 'emergency';
  recordsProcessed: number;
  recordsDeleted: number;
  recordsSkipped: number;
  recordsFailed: number;
  deletionMethod: string;
  secureWipeUsed: boolean;
  cryptographicHash: string;
  digitalSignature: string;
  legalBasis: string;
  complianceFramework: string[];
  retentionPeriodMet: boolean;
  affectedTables: string[];
  backupStatus: string;
  backupRetentionUntil: Date;
  verificationHash: string;
  status: 'completed' | 'partial' | 'failed' | 'verified' | 'disputed';
}

export interface PolicyPreview {
  policyId: string;
  policyName: string;
  dataType: string;
  estimatedRecords: number;
  oldestRecord?: Date;
  newestRecord?: Date;
  sampledRecords: any[];
  risks: string[];
  recommendations: string[];
}

export interface DeletionResult {
  success: boolean;
  recordsProcessed: number;
  recordsDeleted: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: string[];
  certificateId?: string;
  executionTime: number;
}

export interface RetentionReport {
  summary: {
    totalPolicies: number;
    activePolicies: number;
    executionsLast30Days: number;
    totalRecordsDeleted: number;
    complianceStatus: 'compliant' | 'at_risk' | 'non_compliant';
  };
  policyStatus: Array<{
    policyId: string;
    name: string;
    lastExecution?: Date;
    nextExecution?: Date;
    status: 'healthy' | 'overdue' | 'failed';
    recordsPendingDeletion: number;
  }>;
  recentExecutions: Array<{
    policyId: string;
    executedAt: Date;
    status: string;
    recordsDeleted: number;
    certificateId: string;
  }>;
  complianceMetrics: {
    hipaaCompliant: boolean;
    gdprCompliant: boolean;
    dataMinimizationScore: number;
    retentionRisk: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  activePolicies: number;
  overduePolicies: number;
  failedExecutions: number;
  totalPendingDeletions: number;
  lastChecked: Date;
}

export interface LegalHoldRequest {
  dataType: string;
  recordIds: string[];
  reason: string;
  expiresAt?: Date;
}

export interface LegalHoldResult {
  success: boolean;
  affectedRecords: number;
  errors: string[];
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  retentionPeriod: { value: number; unit: string };
  deletionMethod: string;
  secureWipe: boolean;
  complianceRequirements: Record<string, any>;
}

// Simple API client for data retention service
class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
      throw new Error(error.message || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

const apiClient = new ApiClient();

export class DataRetentionService {
  private baseUrl = '/data-retention';

  // Policy Management
  async getPolicies(params?: {
    active?: boolean;
    dataType?: string;
    category?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<{
    success: boolean;
    data: DataRetentionPolicy[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${this.baseUrl}/policies${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return await apiClient.get(url);
  }

  async getPolicy(policyId: string, includeExecutionHistory = false): Promise<{
    success: boolean;
    data: DataRetentionPolicy;
  }> {
    const url = `${this.baseUrl}/policies/${policyId}?includeExecutionHistory=${includeExecutionHistory}`;
    return await apiClient.get(url);
  }

  async createPolicy(policy: Partial<DataRetentionPolicy>): Promise<{
    success: boolean;
    message: string;
    data: DataRetentionPolicy;
  }> {
    return await apiClient.post(`${this.baseUrl}/policies`, policy);
  }

  async updatePolicy(policyId: string, updates: Partial<DataRetentionPolicy>): Promise<{
    success: boolean;
    message: string;
    data: DataRetentionPolicy;
  }> {
    return await apiClient.put(`${this.baseUrl}/policies/${policyId}`, updates);
  }

  async deletePolicy(policyId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return await apiClient.delete(`${this.baseUrl}/policies/${policyId}`);
  }

  // Policy Execution
  async previewPolicyExecution(policyId: string): Promise<{
    success: boolean;
    data: PolicyPreview;
  }> {
    return await apiClient.get(`${this.baseUrl}/policies/${policyId}/preview`);
  }

  async executePolicy(
    policyId: string,
    options: { dryRun?: boolean; executionMethod?: 'manual' | 'emergency' } = {}
  ): Promise<{
    success: boolean;
    message: string;
    data: DeletionResult;
  }> {
    return await apiClient.post(`${this.baseUrl}/policies/${policyId}/execute`, options);
  }

  async executeScheduledPolicies(): Promise<{
    success: boolean;
    message: string;
    data: {
      totalPolicies: number;
      successfulExecutions: number;
      results: Array<{ policyId: string; result: DeletionResult }>;
    };
  }> {
    return await apiClient.post(`${this.baseUrl}/execute-scheduled`);
  }

  async getPolicyExecutionHistory(policyId: string, limit = 50): Promise<{
    success: boolean;
    data: ExecutionHistoryEntry[];
  }> {
    return await apiClient.get(`${this.baseUrl}/policies/${policyId}/history?limit=${limit}`);
  }

  // Reporting
  async generateRetentionReport(): Promise<{
    success: boolean;
    data: RetentionReport;
    generatedAt: Date;
  }> {
    return await apiClient.get(`${this.baseUrl}/report`);
  }

  async getSystemHealth(): Promise<{
    success: boolean;
    data: SystemHealth;
  }> {
    return await apiClient.get(`${this.baseUrl}/health`);
  }

  // Deletion Certificates
  async getDeletionCertificates(params?: {
    policyId?: string;
    dataType?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<{
    success: boolean;
    data: DeletionCertificate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${this.baseUrl}/certificates${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return await apiClient.get(url);
  }

  async getDeletionCertificate(certificateId: string): Promise<{
    success: boolean;
    data: DeletionCertificate;
  }> {
    return await apiClient.get(`${this.baseUrl}/certificates/${certificateId}`);
  }

  async downloadCertificate(certificateId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/certificates/${certificateId}/download`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to download certificate');
    }
    
    return response.blob();
  }

  async verifyCertificate(certificateId: string): Promise<{
    success: boolean;
    data: {
      certificateId: string;
      certificateNumber: string;
      isValid: boolean;
      verifiedAt: Date;
      status: string;
    };
  }> {
    return await apiClient.post(`${this.baseUrl}/certificates/${certificateId}/verify`);
  }

  // Legal Hold Management
  async setLegalHold(request: LegalHoldRequest): Promise<{
    success: boolean;
    message: string;
    data: LegalHoldResult;
  }> {
    return await apiClient.post(`${this.baseUrl}/legal-hold`, request);
  }

  async removeLegalHold(request: {
    dataType: string;
    recordIds: string[];
    reason: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { affectedRecords: number };
  }> {
    return await apiClient.delete(`${this.baseUrl}/legal-hold`, request);
  }

  // Templates
  async getTemplates(): Promise<{
    success: boolean;
    data: PolicyTemplate[];
  }> {
    return await apiClient.get(`${this.baseUrl}/templates`);
  }

  async applyTemplate(
    templateId: string,
    config: {
      dataType: string;
      modelName: string;
      name?: string;
      overrides?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data: DataRetentionPolicy;
  }> {
    return await apiClient.post(`${this.baseUrl}/templates/${templateId}/apply`, config);
  }

  // Utility Methods
  async exportRetentionData(params?: {
    dataType?: string;
    fromDate?: string;
    toDate?: string;
    format?: 'json' | 'csv';
  }): Promise<Blob> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/export?${searchParams.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to export retention data');
    }
    
    return response.blob();
  }

  // Real-time monitoring
  async getLiveMetrics(): Promise<{
    success: boolean;
    data: {
      activeExecutions: number;
      queuedPolicies: number;
      systemLoad: number;
      lastUpdate: Date;
      alerts: Array<{
        level: 'info' | 'warning' | 'error';
        message: string;
        timestamp: Date;
      }>;
    };
  }> {
    return await apiClient.get(`${this.baseUrl}/metrics/live`);
  }

  // Helper method to calculate retention date
  calculateRetentionDate(period: { value: number; unit: 'days' | 'months' | 'years' }, fromDate: Date = new Date()): Date {
    const date = new Date(fromDate);
    
    switch (period.unit) {
      case 'days':
        date.setDate(date.getDate() - period.value);
        break;
      case 'months':
        date.setMonth(date.getMonth() - period.value);
        break;
      case 'years':
        date.setFullYear(date.getFullYear() - period.value);
        break;
    }
    
    return date;
  }

  // Helper method to format compliance status
  formatComplianceStatus(status: 'compliant' | 'at_risk' | 'non_compliant'): {
    text: string;
    color: string;
    icon: string;
  } {
    switch (status) {
      case 'compliant':
        return { text: 'Compliant', color: 'green', icon: '✅' };
      case 'at_risk':
        return { text: 'At Risk', color: 'yellow', icon: '⚠️' };
      case 'non_compliant':
        return { text: 'Non-Compliant', color: 'red', icon: '❌' };
      default:
        return { text: 'Unknown', color: 'gray', icon: '❓' };
    }
  }

  // Helper method to format execution status
  formatExecutionStatus(status: 'success' | 'partial' | 'failed'): {
    text: string;
    color: string;
    icon: string;
  } {
    switch (status) {
      case 'success':
        return { text: 'Success', color: 'green', icon: '✅' };
      case 'partial':
        return { text: 'Partial', color: 'yellow', icon: '⚠️' };
      case 'failed':
        return { text: 'Failed', color: 'red', icon: '❌' };
      default:
        return { text: 'Unknown', color: 'gray', icon: '❓' };
    }
  }
}

// Export singleton instance
export const dataRetentionService = new DataRetentionService(); 