import { Request, Response } from 'express';
import { AdvancedAuditService } from '../services/advancedAuditService.js';
import { AuditController } from './auditController.js';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../services/logger.js';

export class AdvancedAuditController extends AuditController {
  private advancedAuditService: AdvancedAuditService;

  constructor() {
    super();
    this.advancedAuditService = AdvancedAuditService.getInstance();
  }

  /**
   * Verify audit log integrity and chain
   */
  async verifyIntegrity(req: Request, res: Response) {
    try {
      const { startSequence, endSequence } = req.query;

      const result = await this.advancedAuditService.verifyLogIntegrity(
        startSequence ? parseInt(startSequence as string, 10) : undefined,
        endSequence ? parseInt(endSequence as string, 10) : undefined
      );

      // Log this administrative action
      await this.advancedAuditService.createAdvancedAuditLog({
        action: 'INTEGRITY_CHECK',
        resource: 'audit_logs',
        description: `Integrity verification performed by admin`,
        ipAddress: req.ip || 'unknown',
        riskLevel: 'low',
        eventType: 'admin_action',
        eventCategory: 'system_admin',
        dataClassification: 'internal',
        userId: (req.user as any)?.id,
        userEmail: (req.user as any)?.email,
        userRole: (req.user as any)?.role,
        metadata: {
          startSequence,
          endSequence,
          resultValid: result.isValid,
          issuesFound: result.issues.length
        }
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to verify audit log integrity', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify audit log integrity'
      });
    }
  }

  /**
   * Get comprehensive integrity and security report
   */
  async getIntegrityReport(req: Request, res: Response) {
    try {
      const { days = '30' } = req.query;
      const daysNum = parseInt(days as string, 10);

      const report = await this.advancedAuditService.getIntegrityReport(daysNum);

      // Log this administrative action
      await this.advancedAuditService.createAdvancedAuditLog({
        action: 'INTEGRITY_REPORT',
        resource: 'audit_reports',
        description: `Generated integrity report for ${daysNum} days`,
        ipAddress: req.ip || 'unknown',
        riskLevel: 'low',
        eventType: 'admin_action',
        eventCategory: 'system_admin',
        dataClassification: 'confidential',
        userId: (req.user as any)?.id,
        userEmail: (req.user as any)?.email,
        userRole: (req.user as any)?.role,
        metadata: {
          reportDays: daysNum,
          totalLogs: report.totalLogs,
          highRiskEvents: report.highRiskEvents,
          anomalousEvents: report.anomalousEvents
        }
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate integrity report', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate integrity report'
      });
    }
  }

  /**
   * Get threat detection summary
   */
  async getThreatDetectionSummary(req: Request, res: Response) {
    try {
      const { days = '7' } = req.query;
      const daysNum = parseInt(days as string, 10);
      const startDate = new Date(Date.now() - (daysNum * 24 * 60 * 60 * 1000));

      const [
        threatLogs,
        highRiskLogs,
        suspiciousLogs,
        threatIndicatorBreakdown
      ] = await Promise.all([
        AuditLog.find({
          timestamp: { $gte: startDate },
          threatIndicators: { $exists: true, $ne: [] }
        }).sort({ timestamp: -1 }).limit(100),

        AuditLog.find({
          timestamp: { $gte: startDate },
          riskScore: { $gte: 70 }
        }).sort({ riskScore: -1, timestamp: -1 }).limit(50),

        AuditLog.find({
          timestamp: { $gte: startDate },
          anomalyScore: { $gte: 80 }
        }).sort({ anomalyScore: -1, timestamp: -1 }).limit(50),

        AuditLog.aggregate([
          { $match: { 
            timestamp: { $gte: startDate },
            threatIndicators: { $exists: true, $ne: [] }
          }},
          { $unwind: '$threatIndicators' },
          { $group: { 
            _id: '$threatIndicators', 
            count: { $sum: 1 },
            avgRiskScore: { $avg: '$riskScore' },
            latestOccurrence: { $max: '$timestamp' }
          }},
          { $sort: { count: -1 } }
        ])
      ]);

      const summary = {
        timeRange: {
          days: daysNum,
          startDate,
          endDate: new Date()
        },
        summary: {
          totalThreats: threatLogs.length,
          highRiskEvents: highRiskLogs.length,
          anomalousEvents: suspiciousLogs.length,
          uniqueThreatTypes: threatIndicatorBreakdown.length
        },
        threatIndicators: threatIndicatorBreakdown,
        recentThreats: threatLogs.slice(0, 20),
        highestRiskEvents: highRiskLogs.slice(0, 10),
        mostAnomalousEvents: suspiciousLogs.slice(0, 10)
      };

      // Log this security monitoring action
      await this.advancedAuditService.createAdvancedAuditLog({
        action: 'THREAT_ANALYSIS',
        resource: 'security_monitoring',
        description: `Generated threat detection summary for ${daysNum} days`,
        ipAddress: req.ip || 'unknown',
        riskLevel: 'medium',
        eventType: 'admin_action',
        eventCategory: 'security_incident',
        dataClassification: 'restricted',
        userId: (req.user as any)?.id,
        userEmail: (req.user as any)?.email,
        userRole: (req.user as any)?.role,
        metadata: {
          analysisScope: daysNum,
          threatsFound: summary.summary.totalThreats,
          riskEvents: summary.summary.highRiskEvents
        }
      });

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Failed to get threat detection summary', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get threat detection summary'
      });
    }
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { days = '30' } = req.query;
      const daysNum = parseInt(days as string, 10);
      const startDate = new Date(Date.now() - (daysNum * 24 * 60 * 60 * 1000));

      const userLogs = await AuditLog.find({
        userId,
        timestamp: { $gte: startDate }
      }).sort({ timestamp: 1 });

      // Calculate analytics
      const analytics = {
        totalActions: userLogs.length,
        averageRiskScore: userLogs.reduce((sum, log) => sum + (log.riskScore || 0), 0) / userLogs.length || 0,
        averageAnomalyScore: userLogs.reduce((sum, log) => sum + (log.anomalyScore || 0), 0) / userLogs.length || 0,
        
        // Time analysis
        hourlyActivity: Array(24).fill(0),
        dailyActivity: {},
        
        // Action patterns
        actionBreakdown: {} as Record<string, number>,
        resourceBreakdown: {} as Record<string, number>,
        
        // Risk analysis
        highRiskActions: userLogs.filter(log => (log.riskScore || 0) > 70).length,
        anomalousActions: userLogs.filter(log => (log.anomalyScore || 0) > 80).length,
        
        // Recent patterns
        recentThreatIndicators: [] as string[],
        behavioralChanges: [] as any[]
      };

      // Calculate time patterns
      userLogs.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        const day = new Date(log.timestamp).toDateString();
        
        analytics.hourlyActivity[hour]++;
        analytics.dailyActivity[day] = (analytics.dailyActivity[day] || 0) + 1;
        
        analytics.actionBreakdown[log.action] = (analytics.actionBreakdown[log.action] || 0) + 1;
        analytics.resourceBreakdown[log.resource] = (analytics.resourceBreakdown[log.resource] || 0) + 1;
        
        if (log.threatIndicators?.length) {
          analytics.recentThreatIndicators.push(...log.threatIndicators);
        }
      });

      // Remove duplicates from threat indicators
      analytics.recentThreatIndicators = [...new Set(analytics.recentThreatIndicators)];

      // Log this user analysis action
      await this.advancedAuditService.createAdvancedAuditLog({
        action: 'USER_ANALYSIS',
        resource: 'user_behavior',
        resourceId: userId,
        description: `Generated behavior analytics for user ${userId}`,
        ipAddress: req.ip || 'unknown',
        riskLevel: 'medium',
        eventType: 'admin_action',
        eventCategory: 'data_access',
        dataClassification: 'confidential',
        userId: (req.user as any)?.id,
        userEmail: (req.user as any)?.email,
        userRole: (req.user as any)?.role,
        metadata: {
          analyzedUser: userId,
          analysisDays: daysNum,
          totalActions: analytics.totalActions,
          riskEvents: analytics.highRiskActions
        }
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Failed to get user behavior analytics', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user behavior analytics'
      });
    }
  }

  /**
   * Update investigation status and add notes
   */
  async updateInvestigation(req: Request, res: Response) {
    try {
      const { auditLogId } = req.params;
      const { 
        investigationStatus, 
        investigationNotes, 
        responseActions,
        escalationLevel 
      } = req.body;

      const updateData: any = {};
      if (investigationStatus) updateData.investigationStatus = investigationStatus;
      if (investigationNotes) updateData.investigationNotes = investigationNotes;
      if (responseActions) updateData.responseActions = responseActions;
      if (escalationLevel !== undefined) updateData.escalationLevel = escalationLevel;
      
      updateData.reviewedBy = (req.user as any)?.id || (req.user as any)?.email;
      updateData.reviewedAt = new Date();

      const updatedLog = await AuditLog.findByIdAndUpdate(
        auditLogId,
        updateData,
        { new: true }
      );

      if (!updatedLog) {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }

      // Log this investigation action
      await this.advancedAuditService.createAdvancedAuditLog({
        action: 'INVESTIGATION_UPDATE',
        resource: 'audit_investigation',
        resourceId: auditLogId,
        description: `Updated investigation for audit log ${auditLogId}`,
        ipAddress: req.ip || 'unknown',
        riskLevel: 'medium',
        eventType: 'admin_action',
        eventCategory: 'security_incident',
        dataClassification: 'restricted',
        userId: (req.user as any)?.id,
        userEmail: (req.user as any)?.email,
        userRole: (req.user as any)?.role,
        metadata: {
          auditLogId,
          investigationStatus,
          escalationLevel,
          hasNotes: !!investigationNotes,
          responseActionsCount: responseActions?.length || 0
        }
      });

      res.json({
        success: true,
        data: updatedLog,
        message: 'Investigation updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update investigation', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update investigation'
      });
    }
  }

  /**
   * Get real-time security alerts
   */
  async getSecurityAlerts(req: Request, res: Response) {
    try {
      const { limit = '50', severity } = req.query;
      const limitNum = parseInt(limit as string, 10);

      const query: any = {
        escalationLevel: { $gte: 1 }, // Only escalated events
        timestamp: { $gte: new Date(Date.now() - (24 * 60 * 60 * 1000)) } // Last 24 hours
      };

      if (severity) {
        if (severity === 'high') {
          query.escalationLevel = { $gte: 3 };
        } else if (severity === 'medium') {
          query.escalationLevel = { $in: [1, 2] };
        }
      }

      const alerts = await AuditLog.find(query)
        .sort({ escalationLevel: -1, timestamp: -1 })
        .limit(limitNum)
        .select({
          timestamp: 1,
          userId: 1,
          userEmail: 1,
          action: 1,
          resource: 1,
          riskScore: 1,
          anomalyScore: 1,
          threatIndicators: 1,
          escalationLevel: 1,
          investigationStatus: 1,
          ipAddress: 1,
          description: 1
        });

      const alertSummary = {
        totalAlerts: alerts.length,
        highSeverity: alerts.filter(a => a.escalationLevel >= 3).length,
        mediumSeverity: alerts.filter(a => a.escalationLevel >= 1 && a.escalationLevel < 3).length,
        unresolved: alerts.filter(a => 
          a.investigationStatus === 'none' || 
          a.investigationStatus === 'pending' || 
          a.investigationStatus === 'in_progress'
        ).length,
        alerts: alerts
      };

      res.json({
        success: true,
        data: alertSummary
      });
    } catch (error) {
      logger.error('Failed to get security alerts', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get security alerts'
      });
    }
  }
}

export const advancedAuditController = new AdvancedAuditController(); 