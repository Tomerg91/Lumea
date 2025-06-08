import { auditService } from './auditService';

interface IntegrityCheckResult {
  isValid: boolean;
  issues: string[];
  lastValidSequence?: number;
  brokenChainAt?: number;
}

interface IntegrityReport {
  totalLogs: number;
  integrityChecks: IntegrityCheckResult;
  highRiskEvents: number;
  anomalousEvents: number;
  threatIndicatorSummary: Record<string, number>;
}

interface ThreatSummary {
  timeRange: {
    days: number;
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalThreats: number;
    highRiskEvents: number;
    anomalousEvents: number;
    uniqueThreatTypes: number;
  };
  threatIndicators: Array<{
    _id: string;
    count: number;
    avgRiskScore: number;
    latestOccurrence: Date;
  }>;
  recentThreats: any[];
  highestRiskEvents: any[];
  mostAnomalousEvents: any[];
}

interface UserBehaviorAnalytics {
  totalActions: number;
  averageRiskScore: number;
  averageAnomalyScore: number;
  hourlyActivity: number[];
  dailyActivity: Record<string, number>;
  actionBreakdown: Record<string, number>;
  resourceBreakdown: Record<string, number>;
  highRiskActions: number;
  anomalousActions: number;
  recentThreatIndicators: string[];
  behavioralChanges: any[];
}

interface SecurityAlerts {
  totalAlerts: number;
  highSeverity: number;
  mediumSeverity: number;
  unresolved: number;
  alerts: any[];
}

class AdvancedAuditService {
  private baseUrl = '/api/audit/advanced';

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      ...options,
    };

    const response = await fetch(endpoint, defaultOptions);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(startSequence?: number, endSequence?: number): Promise<{ success: boolean; data: IntegrityCheckResult }> {
    const params = new URLSearchParams();
    if (startSequence !== undefined) params.append('startSequence', startSequence.toString());
    if (endSequence !== undefined) params.append('endSequence', endSequence.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.makeRequest(`${this.baseUrl}/integrity/verify${query}`);
  }

  /**
   * Get comprehensive integrity report
   */
  async getIntegrityReport(days: number = 30): Promise<{ success: boolean; data: IntegrityReport }> {
    return this.makeRequest(`${this.baseUrl}/integrity/report?days=${days}`);
  }

  /**
   * Get threat detection summary
   */
  async getThreatDetectionSummary(days: number = 7): Promise<{ success: boolean; data: ThreatSummary }> {
    return this.makeRequest(`${this.baseUrl}/threats/summary?days=${days}`);
  }

  /**
   * Get real-time security alerts
   */
  async getSecurityAlerts(limit: number = 50, severity?: 'high' | 'medium'): Promise<{ success: boolean; data: SecurityAlerts }> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (severity) params.append('severity', severity);
    
    return this.makeRequest(`${this.baseUrl}/alerts?${params.toString()}`);
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(userId: string, days: number = 30): Promise<{ success: boolean; data: UserBehaviorAnalytics }> {
    return this.makeRequest(`${this.baseUrl}/behavior/${userId}?days=${days}`);
  }

  /**
   * Update investigation status and notes
   */
  async updateInvestigation(
    auditLogId: string,
    data: {
      investigationStatus?: string;
      investigationNotes?: string;
      responseActions?: string[];
      escalationLevel?: number;
    }
  ): Promise<{ success: boolean; data: any; message: string }> {
    return this.makeRequest(`${this.baseUrl}/investigation/${auditLogId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get audit analytics for dashboard
   */
  async getAuditAnalytics(days: number = 30): Promise<{
    integrity: IntegrityReport;
    threats: ThreatSummary;
    alerts: SecurityAlerts;
  }> {
    const [integrityResponse, threatsResponse, alertsResponse] = await Promise.all([
      this.getIntegrityReport(days),
      this.getThreatDetectionSummary(days),
      this.getSecurityAlerts(50)
    ]);

    return {
      integrity: integrityResponse.data,
      threats: threatsResponse.data,
      alerts: alertsResponse.data
    };
  }

  /**
   * Export advanced audit data
   */
  async exportAdvancedAuditData(
    type: 'integrity' | 'threats' | 'behavior',
    options: {
      userId?: string;
      days?: number;
      format?: 'json' | 'csv';
      includeRawData?: boolean;
    } = {}
  ): Promise<void> {
    const { days = 30, format = 'json', includeRawData = false } = options;
    
    let endpoint = '';
    let filename = '';
    
    switch (type) {
      case 'integrity':
        endpoint = `${this.baseUrl}/integrity/report?days=${days}&export=${format}`;
        filename = `integrity-report-${days}days.${format}`;
        break;
      case 'threats':
        endpoint = `${this.baseUrl}/threats/summary?days=${days}&export=${format}`;
        filename = `threat-summary-${days}days.${format}`;
        break;
      case 'behavior':
        if (!options.userId) throw new Error('userId required for behavior export');
        endpoint = `${this.baseUrl}/behavior/${options.userId}?days=${days}&export=${format}`;
        filename = `user-behavior-${options.userId}-${days}days.${format}`;
        break;
    }

    if (includeRawData) {
      endpoint += `&includeRawData=true`;
    }

    // Trigger download
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const response = await fetch(endpoint, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      }
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get real-time audit metrics for live monitoring
   */
  async getLiveMetrics(): Promise<{
    activeUsers: number;
    recentHighRiskEvents: number;
    systemIntegrityStatus: 'healthy' | 'warning' | 'critical';
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    lastSequenceNumber: number;
    recentAlerts: any[];
  }> {
    // This would typically be a separate endpoint for live metrics
    // For now, combine data from existing endpoints
    const [alertsResponse, integrityResponse] = await Promise.all([
      this.getSecurityAlerts(10),
      this.verifyIntegrity()
    ]);

    const alerts = alertsResponse.data;
    const integrity = integrityResponse.data;

    // Simulate real-time metrics calculation
    const systemIntegrityStatus = integrity.isValid ? 'healthy' : 'critical';
    const threatLevel = alerts.highSeverity > 5 ? 'critical' : 
                      alerts.highSeverity > 2 ? 'high' :
                      alerts.mediumSeverity > 10 ? 'medium' : 'low';

    return {
      activeUsers: 0, // Would need real-time session tracking
      recentHighRiskEvents: alerts.highSeverity,
      systemIntegrityStatus,
      threatLevel,
      lastSequenceNumber: integrity.lastValidSequence || 0,
      recentAlerts: alerts.alerts.slice(0, 5)
    };
  }
}

export const advancedAuditService = new AdvancedAuditService(); 