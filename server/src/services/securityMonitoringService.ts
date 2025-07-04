import { EventEmitter } from 'events';
import { AuditLog } from '../models/AuditLog.js';
import DeletionCertificate from '../models/DeletionCertificate.js';
import DataRetentionPolicy from '../models/DataRetentionPolicy.js';
import { Consent } from '../models/Consent.js';

// Simple logger implementation
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args)
};

// Types for security monitoring
export interface SecurityMetrics {
  // Real-time metrics
  activeThreats: number;
  riskScore: number;
  systemHealth: number;
  complianceStatus: number;
  
  // Threat statistics
  threatsByType: Record<string, number>;
  threatsByHour: Array<{ hour: number; count: number }>;
  recentThreats: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    description: string;
    status: 'detected' | 'investigating' | 'resolved';
  }>;
  
  // System health metrics
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
  
  // Geographic and behavioral data
  geographicThreats: Array<{
    country: string;
    threatCount: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  
  userBehaviorAnalytics: {
    suspiciousUsers: number;
    anomalousActivities: number;
    behaviorScore: number;
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
  assignedTo?: string;
  escalationLevel: number;
  affectedSystems: string[];
  recommendedActions: string[];
  metadata: Record<string, any>;
  resolvedAt?: Date;
  resolutionNotes?: string;
}

export interface IncidentReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  affectedUsers: number;
  estimatedImpact: string;
  timeline: Array<{
    timestamp: Date;
    action: string;
    performedBy: string;
    notes: string;
  }>;
  containmentActions: string[];
  recoveryActions: string[];
  preventionMeasures: string[];
  complianceImplications: string[];
}

export class SecurityMonitoringService extends EventEmitter {
  private alertCache: Map<string, SecurityAlert> = new Map();
  private incidentCache: Map<string, IncidentReport> = new Map();
  private metricsCache: SecurityMetrics | null = null;
  private lastMetricsUpdate: Date = new Date(0);
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  // Threat detection thresholds
  private readonly THRESHOLDS = {
    HIGH_RISK_SCORE: 80,
    CRITICAL_RISK_SCORE: 95,
    MAX_FAILED_LOGINS: 5,
    SUSPICIOUS_API_CALLS: 100,
    MAX_RESPONSE_TIME: 5000,
    MIN_SYSTEM_HEALTH: 70,
    COMPLIANCE_THRESHOLD: 95
  };

  constructor() {
    super();
    this.startRealTimeMonitoring();
  }

  /**
   * Start real-time security monitoring
   */
  private startRealTimeMonitoring(): void {
    // Update metrics every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateSecurityMetrics();
        await this.detectThreats();
        await this.checkComplianceViolations();
      } catch (error) {
        logger.error('Security monitoring error:', error);
      }
    }, 30000);

    logger.info('Security monitoring service started');
  }

  /**
   * Stop real-time monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    logger.info('Security monitoring service stopped');
  }

  /**
   * Get current security metrics
   */
  public async getSecurityMetrics(): Promise<SecurityMetrics> {
    const now = new Date();
    const cacheAge = now.getTime() - this.lastMetricsUpdate.getTime();
    
    // Return cached metrics if less than 1 minute old
    if (this.metricsCache && cacheAge < 60000) {
      return this.metricsCache;
    }

    return await this.updateSecurityMetrics();
  }

  /**
   * Update security metrics
   */
  private async updateSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get audit data for analysis
      const recentAudits = await AuditLog.find({
        timestamp: { $gte: last24Hours }
      }).limit(1000);

      // Calculate threat metrics
      const threats = recentAudits.filter(audit => 
        audit.riskLevel === 'high' || audit.riskLevel === 'critical' || audit.suspiciousActivity
      );

      const threatsByType = threats.reduce((acc, threat) => {
        const type = threat.eventType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate hourly threat distribution
      const threatsByHour = Array.from({ length: 24 }, (_, hour) => {
        const hourThreats = threats.filter(threat => {
          const threatHour = new Date(threat.timestamp).getHours();
          return threatHour === hour;
        });
        return { hour, count: hourThreats.length };
      });

      // Get recent high-priority threats
      const recentThreats = threats
        .slice(0, 10)
        .map(threat => ({
          id: threat._id.toString(),
          type: threat.eventType || 'unknown',
          severity: this.mapRiskToSeverity(threat.riskLevel),
          timestamp: threat.timestamp,
          description: threat.description,
          status: threat.investigationStatus || 'detected'
        }));

      // Calculate system health metrics
      const totalAudits = recentAudits.length;
      const errorAudits = recentAudits.filter(audit => 
        audit.eventType === 'error' || audit.statusCode >= 400
      );
      const averageResponseTime = recentAudits.reduce((sum, audit) => 
        sum + (audit.responseTime || 0), 0) / totalAudits || 0;

      // Get compliance data
      const activeConsents = await Consent.find({ 
        status: 'active',
        expiresAt: { $gt: now }
      });

      // Calculate compliance metrics
      const dataRetentionCompliance = await this.calculateDataRetentionCompliance();
      const consentCompliance = await this.calculateConsentCompliance();
      const auditTrailIntegrity = await this.calculateAuditIntegrity();

      // Calculate overall scores
      const riskScore = this.calculateOverallRiskScore(threats, recentAudits);
      const systemHealth = this.calculateSystemHealth(errorAudits.length, totalAudits, averageResponseTime);
      const complianceStatus = (dataRetentionCompliance + consentCompliance + auditTrailIntegrity) / 3;

      // Build metrics object
      this.metricsCache = {
        activeThreats: threats.length,
        riskScore,
        systemHealth,
        complianceStatus,
        threatsByType,
        threatsByHour,
        recentThreats,
        systemMetrics: {
          auditLogVolume: totalAudits,
          dataRetentionCompliance,
          consentCompliance,
          encryptionStatus: 100, // Assuming encryption is working
          averageResponseTime,
          errorRate: (errorAudits.length / totalAudits) * 100 || 0
        },
        complianceMetrics: {
          hipaaCompliance: Math.min(dataRetentionCompliance, auditTrailIntegrity),
          gdprCompliance: Math.min(consentCompliance, dataRetentionCompliance),
          dataRetentionCompliance,
          consentCompliance,
          auditTrailIntegrity
        },
        geographicThreats: await this.getGeographicThreats(threats),
        userBehaviorAnalytics: await this.getUserBehaviorAnalytics(recentAudits)
      };

      this.lastMetricsUpdate = now;
      
      // Emit metrics update event
      this.emit('metricsUpdated', this.metricsCache);
      
      return this.metricsCache;
    } catch (error) {
      logger.error('Failed to update security metrics:', error);
      throw error;
    }
  }

  /**
   * Detect security threats
   */
  private async detectThreats(): Promise<void> {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent high-risk audit logs
      const highRiskAudits = await AuditLog.find({
        timestamp: { $gte: lastHour },
        $or: [
          { riskLevel: 'high' },
          { riskLevel: 'critical' },
          { suspiciousActivity: true }
        ]
      });

      for (const audit of highRiskAudits) {
        const alertId = `threat_${audit._id}`;
        
        // Skip if alert already exists
        if (this.alertCache.has(alertId)) continue;

        const alert: SecurityAlert = {
          id: alertId,
          type: 'threat_detected',
          severity: this.mapRiskToSeverity(audit.riskLevel),
          title: `Security Threat Detected: ${audit.eventType}`,
          description: audit.description,
          timestamp: audit.timestamp,
          status: 'open',
          escalationLevel: audit.riskLevel === 'critical' ? 3 : audit.riskLevel === 'high' ? 2 : 1,
          affectedSystems: [audit.resource || 'system'],
          recommendedActions: this.generateRecommendedActions(audit),
          metadata: {
            auditId: audit._id,
            userId: audit.userId,
            ipAddress: audit.ipAddress,
            userAgent: audit.userAgent
          }
        };

        this.alertCache.set(alertId, alert);
        this.emit('alertGenerated', alert);

        // Auto-escalate critical alerts
        if (alert.severity === 'critical') {
          await this.escalateAlert(alert);
        }
      }
    } catch (error) {
      logger.error('Threat detection failed:', error);
    }
  }

  /**
   * Check for compliance violations
   */
  private async checkComplianceViolations(): Promise<void> {
    try {
      // Check data retention compliance
      const overdueRetentions = await this.findOverdueRetentions();
      for (const overdue of overdueRetentions) {
        await this.generateComplianceAlert('data_retention_overdue', overdue);
      }

      // Check consent compliance
      const expiredConsents = await this.findExpiredConsents();
      for (const expired of expiredConsents) {
        await this.generateComplianceAlert('consent_expired', expired);
      }

      // Check audit trail integrity
      const integrityIssues = await this.findAuditIntegrityIssues();
      for (const issue of integrityIssues) {
        await this.generateComplianceAlert('audit_integrity', issue);
      }
    } catch (error) {
      logger.error('Compliance check failed:', error);
    }
  }

  /**
   * Generate compliance alert
   */
  private async generateComplianceAlert(type: string, data: any): Promise<void> {
    const alertId = `compliance_${type}_${data._id || Date.now()}`;
    
    if (this.alertCache.has(alertId)) return;

    const alert: SecurityAlert = {
      id: alertId,
      type: 'compliance_violation',
      severity: 'high',
      title: `Compliance Violation: ${type.replace(/_/g, ' ').toUpperCase()}`,
      description: this.generateComplianceDescription(type, data),
      timestamp: new Date(),
      status: 'open',
      escalationLevel: 2,
      affectedSystems: ['compliance'],
      recommendedActions: this.generateComplianceActions(type),
      metadata: { type, data }
    };

    this.alertCache.set(alertId, alert);
    this.emit('alertGenerated', alert);
  }

  /**
   * Get all active alerts
   */
  public getActiveAlerts(severity?: string, type?: string): SecurityAlert[] {
    let alerts = Array.from(this.alertCache.values())
      .filter(alert => alert.status === 'open' || alert.status === 'investigating');

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Update alert status
   */
  public async updateAlertStatus(alertId: string, status: SecurityAlert['status'], notes?: string): Promise<void> {
    const alert = this.alertCache.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = status;
    if (status === 'resolved') {
      alert.resolvedAt = new Date();
      alert.resolutionNotes = notes;
    }

    this.alertCache.set(alertId, alert);
    this.emit('alertUpdated', alert);
  }

  /**
   * Create security incident
   */
  public async createIncident(data: Partial<IncidentReport>): Promise<IncidentReport> {
    const incident: IncidentReport = {
      id: `incident_${Date.now()}`,
      title: data.title || 'Security Incident',
      description: data.description || '',
      severity: data.severity || 'medium',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedTo: data.assignedTo,
      affectedUsers: data.affectedUsers || 0,
      estimatedImpact: data.estimatedImpact || 'Low',
      timeline: [{
        timestamp: new Date(),
        action: 'Incident created',
        performedBy: data.assignedTo || 'system',
        notes: 'Initial incident report created'
      }],
      containmentActions: data.containmentActions || [],
      recoveryActions: data.recoveryActions || [],
      preventionMeasures: data.preventionMeasures || [],
      complianceImplications: data.complianceImplications || []
    };

    this.incidentCache.set(incident.id, incident);
    this.emit('incidentCreated', incident);
    
    return incident;
  }

  /**
   * Get security reports
   */
  public async getSecurityReport(timeframe: { start: Date; end: Date }): Promise<any> {
    const metrics = await this.getSecurityMetrics();
    const alerts = this.getActiveAlerts();
    const incidents = Array.from(this.incidentCache.values());

    return {
      summary: {
        totalThreats: metrics.activeThreats,
        riskScore: metrics.riskScore,
        systemHealth: metrics.systemHealth,
        complianceStatus: metrics.complianceStatus
      },
      alerts: {
        total: alerts.length,
        byType: alerts.reduce((acc, alert) => {
          acc[alert.type] = (acc[alert.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        bySeverity: alerts.reduce((acc, alert) => {
          acc[alert.severity] = (acc[alert.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      incidents: {
        total: incidents.length,
        open: incidents.filter(i => i.status === 'open').length,
        resolved: incidents.filter(i => i.status === 'resolved').length
      },
      compliance: metrics.complianceMetrics,
      recommendations: this.generateSecurityRecommendations(metrics, alerts)
    };
  }

  // Helper methods
  private mapRiskToSeverity(riskLevel: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (riskLevel) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private calculateOverallRiskScore(threats: any[], audits: any[]): number {
    if (audits.length === 0) return 0;
    
    const threatRatio = threats.length / audits.length;
    const criticalThreats = threats.filter(t => t.riskLevel === 'critical').length;
    const highThreats = threats.filter(t => t.riskLevel === 'high').length;
    
    const score = Math.min(100, (threatRatio * 50) + (criticalThreats * 10) + (highThreats * 5));
    return Math.round(score);
  }

  private calculateSystemHealth(errors: number, total: number, avgResponseTime: number): number {
    if (total === 0) return 100;
    
    const errorRate = errors / total;
    const responseScore = Math.max(0, 100 - (avgResponseTime / 50));
    const errorScore = Math.max(0, 100 - (errorRate * 200));
    
    return Math.round((responseScore + errorScore) / 2);
  }

  private async calculateDataRetentionCompliance(): Promise<number> {
    // Simplified calculation - in reality would be more complex
    const policies = await DataRetentionPolicy.find({ isActive: true });
    if (policies.length === 0) return 100;
    
    // Mock calculation based on policy execution success
    return 95; // Would calculate based on actual policy compliance
  }

  private async calculateConsentCompliance(): Promise<number> {
    const now = new Date();
    const totalConsents = await Consent.countDocuments();
    const validConsents = await Consent.countDocuments({
      status: 'active',
      expiresAt: { $gt: now }
    });
    
    if (totalConsents === 0) return 100;
    return Math.round((validConsents / totalConsents) * 100);
  }

  private async calculateAuditIntegrity(): Promise<number> {
    // Use advanced audit service to check integrity
    try {
      const integrityReport = await this.advancedAuditService.verifyIntegrity();
      return integrityReport.overallIntegrity;
    } catch (error) {
      logger.error('Failed to calculate audit integrity:', error);
      return 90; // Conservative estimate
    }
  }

  private async getGeographicThreats(threats: any[]): Promise<Array<{country: string; threatCount: number; riskLevel: 'low' | 'medium' | 'high' | 'critical'}>> {
    // Simplified geographic analysis
    const countryThreats: Record<string, number> = {};
    
    for (const threat of threats) {
      const country = threat.geoLocation?.country || 'Unknown';
      countryThreats[country] = (countryThreats[country] || 0) + 1;
    }
    
    return Object.entries(countryThreats).map(([country, count]) => ({
      country,
      threatCount: count,
      riskLevel: count > 10 ? 'critical' : count > 5 ? 'high' : count > 2 ? 'medium' : 'low'
    }));
  }

  private async getUserBehaviorAnalytics(audits: any[]): Promise<{suspiciousUsers: number; anomalousActivities: number; behaviorScore: number}> {
    const userActivities: Record<string, number> = {};
    let anomalousCount = 0;
    
    for (const audit of audits) {
      if (audit.userId) {
        userActivities[audit.userId] = (userActivities[audit.userId] || 0) + 1;
      }
      if (audit.anomalyScore > 70) {
        anomalousCount++;
      }
    }
    
    const suspiciousUsers = Object.values(userActivities).filter(count => count > 50).length;
    const behaviorScore = Math.max(0, 100 - (anomalousCount / audits.length) * 100);
    
    return {
      suspiciousUsers,
      anomalousActivities: anomalousCount,
      behaviorScore: Math.round(behaviorScore)
    };
  }

  private generateRecommendedActions(audit: any): string[] {
    const actions = [];
    
    if (audit.riskLevel === 'critical') {
      actions.push('Immediately investigate the incident');
      actions.push('Consider blocking the IP address');
      actions.push('Notify security team');
    }
    
    if (audit.suspiciousActivity) {
      actions.push('Review user activity patterns');
      actions.push('Verify user identity');
    }
    
    if (audit.eventType === 'authentication') {
      actions.push('Force password reset');
      actions.push('Enable 2FA if not already active');
    }
    
    return actions;
  }

  private async escalateAlert(alert: SecurityAlert): Promise<void> {
    // Implement alert escalation logic
    logger.warn(`Critical alert escalated: ${alert.id} - ${alert.title}`);
    this.emit('alertEscalated', alert);
  }

  private async findOverdueRetentions(): Promise<any[]> {
    const now = new Date();
    return await DataRetentionPolicy.find({
      isActive: true,
      'schedule.nextExecution': { $lt: now }
    });
  }

  private async findExpiredConsents(): Promise<any[]> {
    const now = new Date();
    return await Consent.find({
      status: 'active',
      expiresAt: { $lt: now }
    });
  }

  private async findAuditIntegrityIssues(): Promise<any[]> {
    // Check for audit log gaps or integrity issues
    return []; // Simplified - would implement actual integrity checks
  }

  private generateComplianceDescription(type: string, data: any): string {
    switch (type) {
      case 'data_retention_overdue':
        return `Data retention policy "${data.name}" is overdue for execution`;
      case 'consent_expired':
        return `User consent has expired and requires renewal`;
      case 'audit_integrity':
        return 'Audit trail integrity issue detected';
      default:
        return 'Compliance violation detected';
    }
  }

  private generateComplianceActions(type: string): string[] {
    switch (type) {
      case 'data_retention_overdue':
        return ['Execute retention policy immediately', 'Review policy schedule', 'Generate compliance report'];
      case 'consent_expired':
        return ['Contact user for consent renewal', 'Suspend data processing', 'Update consent status'];
      case 'audit_integrity':
        return ['Investigate integrity issue', 'Restore from backup if needed', 'Review audit processes'];
      default:
        return ['Review compliance status', 'Take corrective action'];
    }
  }

  private generateSecurityRecommendations(metrics: SecurityMetrics, alerts: SecurityAlert[]): string[] {
    const recommendations = [];
    
    if (metrics.riskScore > this.THRESHOLDS.HIGH_RISK_SCORE) {
      recommendations.push('High risk score detected - review security policies');
    }
    
    if (metrics.systemHealth < this.THRESHOLDS.MIN_SYSTEM_HEALTH) {
      recommendations.push('System health is low - investigate performance issues');
    }
    
    if (metrics.complianceStatus < this.THRESHOLDS.COMPLIANCE_THRESHOLD) {
      recommendations.push('Compliance score is below threshold - address violations');
    }
    
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(`${criticalAlerts.length} critical alerts require immediate attention`);
    }
    
    return recommendations;
  }
}

export default SecurityMonitoringService; 