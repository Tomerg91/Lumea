// Security Monitoring Service - Frontend API Interface
import { API_BASE_URL } from '../lib/api';

// Type definitions for security monitoring
export interface SecurityMetrics {
  // Core metrics
  activeThreats: number;
  riskScore: number;
  systemHealth: number;
  complianceStatus: number;
  
  // Threat analysis
  threatsByType: Record<string, number>;
  recentThreats: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    description: string;
    status: 'detected' | 'investigating' | 'resolved';
  }>;
  
  // System metrics
  systemMetrics: {
    auditLogVolume: number;
    dataRetentionCompliance: number;
    consentCompliance: number;
    encryptionStatus: number;
    averageResponseTime: number;
    errorRate: number;
  };
  
  // Compliance metrics
  complianceMetrics: {
    hipaaCompliance: number;
    gdprCompliance: number;
    dataRetentionCompliance: number;
    consentCompliance: number;
    auditTrailIntegrity: number;
  };
}

export interface SecurityAlert {
  id: string;
  type: 'threat_detected' | 'compliance_violation' | 'system_anomaly' | 'data_breach' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  escalationLevel: number;
  affectedSystems: string[];
  metadata?: Record<string, any>;
}

export interface ThreatSummary {
  last24Hours: number;
  lastWeek: number;
  threatsByHour: Array<{ hour: number; count: number }>;
  topThreatTypes: Array<{ type: string; count: number }>;
  riskTrend: 'increasing' | 'decreasing';
}

export interface ComplianceStatus {
  overallCompliance: number;
  consent: {
    score: number;
    total: number;
    valid: number;
    expired: number;
  };
  dataRetention: {
    score: number;
    totalPolicies: number;
    overduePolicies: number;
  };
  hipaaCompliance: number;
  gdprCompliance: number;
}

export interface SystemHealth {
  systemHealth: number;
  metrics: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
    memoryUsage: any;
    timestamp: Date;
  };
  status: 'healthy' | 'warning' | 'critical';
}

export interface SecurityReport {
  summary: {
    period: { start: Date; end: Date };
    totalEvents: number;
    threats: number;
    criticalThreats: number;
    highThreats: number;
    uniqueUsers: number;
    topActions: Record<string, number>;
  };
  threats: any[];
  recommendations: string[];
}

// Simple API client for security monitoring service
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

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return this.request<T>(url.pathname + url.search);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export class SecurityMonitoringService {
  private api = new ApiClient();
  private baseUrl = '/api/security-monitoring';

  /**
   * Get real-time security metrics for the dashboard
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const response = await this.api.get<{ success: boolean; data: SecurityMetrics; timestamp: Date }>(`${this.baseUrl}/metrics`);
    return response.data;
  }

  /**
   * Get security alerts with optional filtering
   */
  async getSecurityAlerts(filters?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: string;
    limit?: number;
  }): Promise<SecurityAlert[]> {
    const response = await this.api.get<{ success: boolean; data: SecurityAlert[]; totalCount: number }>(`${this.baseUrl}/alerts`, filters);
    return response.data;
  }

  /**
   * Get threat detection summary and analytics
   */
  async getThreatDetectionSummary(): Promise<ThreatSummary> {
    const response = await this.api.get<{ success: boolean; data: ThreatSummary }>(`${this.baseUrl}/threats/summary`);
    return response.data;
  }

  /**
   * Get compliance status and metrics
   */
  async getComplianceStatus(): Promise<ComplianceStatus> {
    const response = await this.api.get<{ success: boolean; data: ComplianceStatus }>(`${this.baseUrl}/compliance/status`);
    return response.data;
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await this.api.get<{ success: boolean; data: SystemHealth }>(`${this.baseUrl}/system/health`);
    return response.data;
  }

  /**
   * Generate security report for specified time period
   */
  async getSecurityReport(startDate?: Date, endDate?: Date): Promise<SecurityReport> {
    const params: any = {};
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();
    
    const response = await this.api.get<{ success: boolean; data: SecurityReport }>(`${this.baseUrl}/reports/security`, params);
    return response.data;
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(alertId: string, status: SecurityAlert['status'], notes?: string): Promise<void> {
    await this.api.put(`${this.baseUrl}/alerts/${alertId}/status`, { status, notes });
  }

  /**
   * Get live security metrics with periodic updates
   */
  subscribeToMetrics(callback: (metrics: SecurityMetrics) => void, interval = 30000): () => void {
    const fetchMetrics = async () => {
      try {
        const metrics = await this.getSecurityMetrics();
        callback(metrics);
      } catch (error) {
        console.error('Failed to fetch security metrics:', error);
      }
    };

    // Initial fetch
    fetchMetrics();
    
    // Set up periodic updates
    const intervalId = setInterval(fetchMetrics, interval);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Get alerts by severity level
   */
  async getCriticalAlerts(): Promise<SecurityAlert[]> {
    return this.getSecurityAlerts({ severity: 'critical', limit: 20 });
  }

  async getHighPriorityAlerts(): Promise<SecurityAlert[]> {
    return this.getSecurityAlerts({ severity: 'high', limit: 50 });
  }

  /**
   * Get security metrics summary for dashboard widgets
   */
  async getDashboardSummary(): Promise<{
    activeThreats: number;
    riskScore: number;
    systemHealth: number;
    complianceStatus: number;
    criticalAlerts: number;
    recentThreats: SecurityMetrics['recentThreats'];
  }> {
    const [metrics, criticalAlerts] = await Promise.all([
      this.getSecurityMetrics(),
      this.getCriticalAlerts()
    ]);

    return {
      activeThreats: metrics.activeThreats,
      riskScore: metrics.riskScore,
      systemHealth: metrics.systemHealth,
      complianceStatus: metrics.complianceStatus,
      criticalAlerts: criticalAlerts.length,
      recentThreats: metrics.recentThreats
    };
  }

  /**
   * Export security data for external analysis
   */
  async exportSecurityData(startDate: Date, endDate: Date, format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const report = await this.getSecurityReport(startDate, endDate);
    const alerts = await this.getSecurityAlerts({ limit: 1000 });
    
    const exportData = {
      report,
      alerts,
      exportedAt: new Date(),
      period: { startDate, endDate }
    };

    if (format === 'json') {
      return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    } else {
      // Convert to CSV format
      const csvData = this.convertToCSV(exportData);
      return new Blob([csvData], { type: 'text/csv' });
    }
  }

  /**
   * Get security status color based on score
   */
  getStatusColor(score: number): 'green' | 'yellow' | 'orange' | 'red' {
    if (score >= 90) return 'green';
    if (score >= 75) return 'yellow';
    if (score >= 50) return 'orange';
    return 'red';
  }

  /**
   * Get risk level description
   */
  getRiskLevelDescription(score: number): string {
    if (score >= 90) return 'Low Risk';
    if (score >= 75) return 'Medium Risk';
    if (score >= 50) return 'High Risk';
    return 'Critical Risk';
  }

  /**
   * Helper method to convert data to CSV
   */
  private convertToCSV(data: any): string {
    // Simplified CSV conversion for alerts
    const alerts = data.alerts;
    if (!alerts || alerts.length === 0) return '';

    const headers = ['ID', 'Type', 'Severity', 'Title', 'Description', 'Timestamp', 'Status'];
    const rows = alerts.map((alert: SecurityAlert) => [
      alert.id,
      alert.type,
      alert.severity,
      alert.title,
      alert.description,
      alert.timestamp,
      alert.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

// Export singleton instance
export const securityMonitoringService = new SecurityMonitoringService();
export default securityMonitoringService; 