import { AuditAction, AuditEntry, BulkOperation } from '../types/coachNote';

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

class AuditService {
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
}

export const auditService = new AuditService(); 