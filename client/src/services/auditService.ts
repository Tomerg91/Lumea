import { AuditAction, AuditEntry, BulkOperation } from '../types/coachNote';
import { createFetchConfig } from './api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface CreateAuditEntryRequest {
  action: AuditAction;
  noteId?: string;
  userId: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

interface CreateBulkOperationRequest {
  type: BulkOperation['type'];
  noteIds: string[];
  userId: string;
  details?: Record<string, any>;
}

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  resource?: string;
  eventType?: string;
  eventCategory?: string;
  riskLevel?: string;
  phiAccessed?: boolean;
  suspicious?: boolean;
  investigationStatus?: string;
  searchText?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogResponse {
  success: boolean;
  data: {
    logs: any[];
    total: number;
    page: number;
    totalPages: number;
  };
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
}

export interface AuditStatisticsResponse {
  success: boolean;
  data: {
    totalLogs: number;
    phiAccessCount: number;
    suspiciousActivityCount: number;
    riskLevelBreakdown: Record<string, number>;
    eventTypeBreakdown: Record<string, number>;
    topUsers: Array<{ userId: string; userEmail: string; count: number }>;
    topResources: Array<{ resource: string; count: number }>;
    recentActivity: any[];
    complianceMetrics: {
      hipaaCompliantLogs: number;
      retentionCompliance: number;
      dataClassificationBreakdown: Record<string, number>;
    };
  };
}

class AuditService {
  private baseUrl = '/api/audit';

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || 'Request failed');
    }

    return response.json();
  }

  // Create audit entry for individual actions
  async createAuditEntry(request: CreateAuditEntryRequest): Promise<AuditEntry> {
    const auditEntry: AuditEntry = {
      action: request.action,
      userId: request.userId,
      userRole: request.userRole,
      timestamp: new Date().toISOString(),
      ipAddress: request.ipAddress,
      userAgent: request.userAgent || navigator.userAgent,
      details: request.details
    };

    return this.makeRequest('/api/audit/entries', {
      method: 'POST',
      body: JSON.stringify(auditEntry),
    });
  }

  // Create bulk operation tracking
  async createBulkOperation(request: CreateBulkOperationRequest): Promise<BulkOperation> {
    const bulkOperation: Omit<BulkOperation, 'status' | 'progress'> = {
      type: request.type,
      noteIds: request.noteIds,
      userId: request.userId,
      timestamp: new Date().toISOString(),
      details: request.details
    };

    return this.makeRequest('/api/audit/bulk-operations', {
      method: 'POST',
      body: JSON.stringify({
        ...bulkOperation,
        status: 'pending',
        progress: 0
      }),
    });
  }

  // Update bulk operation status
  async updateBulkOperation(
    operationId: string, 
    updates: Partial<Pick<BulkOperation, 'status' | 'progress' | 'errorMessage'>>
  ): Promise<BulkOperation> {
    return this.makeRequest(`/api/audit/bulk-operations/${operationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Get audit trail for a specific note
  async getNoteAuditTrail(noteId: string): Promise<AuditEntry[]> {
    return this.makeRequest(`/api/audit/notes/${noteId}/trail`);
  }

  // Get bulk operations for a user
  async getUserBulkOperations(userId: string, limit = 50): Promise<BulkOperation[]> {
    return this.makeRequest(`/api/audit/bulk-operations?userId=${userId}&limit=${limit}`);
  }

  // Get recent audit activity
  async getRecentActivity(limit = 100): Promise<AuditEntry[]> {
    return this.makeRequest(`/api/audit/recent?limit=${limit}`);
  }

  // Track note view
  async trackNoteView(noteId: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) return;

    await this.createAuditEntry({
      action: AuditAction.VIEWED,
      noteId,
      userId: user.id,
      userRole: user.role,
      details: {
        viewedAt: new Date().toISOString()
      }
    });
  }

  // Track note export
  async trackNoteExport(noteIds: string[], format: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) return;

    await this.createAuditEntry({
      action: AuditAction.EXPORTED,
      userId: user.id,
      userRole: user.role,
      details: {
        noteIds,
        format,
        exportedAt: new Date().toISOString(),
        noteCount: noteIds.length
      }
    });
  }

  // Track bulk operations with audit trail
  async trackBulkOperation(
    type: BulkOperation['type'],
    noteIds: string[],
    details?: Record<string, any>
  ): Promise<string> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const operation = await this.createBulkOperation({
      type,
      noteIds,
      userId: user.id,
      details
    });

    // Create individual audit entries for each note
    const auditPromises = noteIds.map(noteId =>
      this.createAuditEntry({
        action: AuditAction.BULK_UPDATED,
        noteId,
        userId: user.id,
        userRole: user.role,
        details: {
          bulkOperationType: type,
          bulkOperationId: operation.id,
          ...details
        }
      })
    );

    await Promise.all(auditPromises);
    return operation.id || '';
  }

  // Helper to get current user (this would be replaced with actual auth service)
  private getCurrentUser() {
    // This is a placeholder - replace with actual user service
    try {
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  // Log bulk operation completion
  async completeBulkOperation(operationId: string, successCount: number, failureCount: number): Promise<void> {
    await this.updateBulkOperation(operationId, {
      status: failureCount > 0 ? 'completed' : 'completed',
      progress: 100,
      errorMessage: failureCount > 0 ? `${failureCount} operations failed` : undefined
    });
  }

  // Log bulk operation failure
  async failBulkOperation(operationId: string, error: string): Promise<void> {
    await this.updateBulkOperation(operationId, {
      status: 'failed',
      errorMessage: error
    });
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(`${this.baseUrl}/logs?${params.toString()}`);
  }

  /**
   * Get audit statistics for dashboard
   */
  async getStatistics(startDate?: string, endDate?: string): Promise<AuditStatisticsResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return this.makeRequest(`${this.baseUrl}/statistics?${params.toString()}`);
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserLogs(userId: string, limit = 100): Promise<{ success: boolean; data: any[] }> {
    return this.makeRequest(`${this.baseUrl}/user/${userId}?limit=${limit}`);
  }

  /**
   * Get PHI access logs
   */
  async getPHIAccessLogs(startDate?: string, endDate?: string, limit = 100): Promise<{ success: boolean; data: any[] }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('limit', limit.toString());

    return this.makeRequest(`${this.baseUrl}/phi-access?${params.toString()}`);
  }

  /**
   * Get suspicious activity logs
   */
  async getSuspiciousActivity(limit = 100): Promise<{ success: boolean; data: any[] }> {
    return this.makeRequest(`${this.baseUrl}/suspicious?limit=${limit}`);
  }

  /**
   * Mark audit log as suspicious
   */
  async markSuspicious(auditLogId: string, flaggedReason: string, investigationStatus = 'pending'): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`${this.baseUrl}/${auditLogId}/suspicious`, {
      method: 'PATCH',
      body: JSON.stringify({
        flaggedReason,
        investigationStatus
      })
    });
  }

  /**
   * Update investigation status
   */
  async updateInvestigationStatus(auditLogId: string, investigationStatus: string, notes?: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`${this.baseUrl}/${auditLogId}/investigation`, {
      method: 'PATCH',
      body: JSON.stringify({
        investigationStatus,
        notes
      })
    });
  }

  /**
   * Export audit logs
   */
  async exportLogs(format: 'json' | 'csv', filters: AuditLogFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    params.append('format', format);

    // Create a temporary link to download the file
    const url = `${this.baseUrl}/export?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Clean up expired logs (admin only)
   */
  async cleanupExpiredLogs(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    return this.makeRequest(`${this.baseUrl}/cleanup`, {
      method: 'DELETE'
    });
  }
}

export const auditService = new AuditService(); 