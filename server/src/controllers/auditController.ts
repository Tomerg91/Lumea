import { Request, Response } from 'express';
import { auditService, AuditQueryOptions } from '../services/auditService.js';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../services/logger.js';

export class AuditController {
  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(req: Request, res: Response) {
    try {
      const {
        userId,
        startDate,
        endDate,
        action,
        resource,
        eventType,
        eventCategory,
        riskLevel,
        phiAccessed,
        suspicious,
        investigationStatus,
        limit = '50',
        page = '1',
        sortBy = 'timestamp',
        sortOrder = 'desc',
        searchText
      } = req.query;

      const limitNum = parseInt(limit as string, 10);
      const pageNum = parseInt(page as string, 10);
      const offset = (pageNum - 1) * limitNum;

      const options: AuditQueryOptions = {
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        action: action as string,
        resource: resource as string,
        eventType: eventType as string,
        eventCategory: eventCategory as string,
        riskLevel: riskLevel as string,
        phiAccessed: phiAccessed === 'true' ? true : phiAccessed === 'false' ? false : undefined,
        suspicious: suspicious === 'true' ? true : suspicious === 'false' ? false : undefined,
        investigationStatus: investigationStatus as string,
        limit: limitNum,
        offset,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        searchText: searchText as string
      };

      const result = await auditService.queryAuditLogs(options);

      res.json({
        success: true,
        data: result,
        pagination: {
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
          limit: limitNum
        }
      });
    } catch (error) {
      logger.error('Failed to get audit logs', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs'
      });
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  async getAuditStatistics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const statistics = await auditService.getAuditStatistics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Failed to get audit statistics', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit statistics'
      });
    }
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { limit = '100' } = req.query;

      const logs = await AuditLog.findByUser(userId, parseInt(limit as string, 10));

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      logger.error('Failed to get user audit logs', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user audit logs'
      });
    }
  }

  /**
   * Get PHI access logs
   */
  async getPHIAccessLogs(req: Request, res: Response) {
    try {
      const { startDate, endDate, limit = '100' } = req.query;

      const logs = await AuditLog.findPHIAccess(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: logs.slice(0, parseInt(limit as string, 10))
      });
    } catch (error) {
      logger.error('Failed to get PHI access logs', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve PHI access logs'
      });
    }
  }

  /**
   * Get suspicious activity logs
   */
  async getSuspiciousActivity(req: Request, res: Response) {
    try {
      const { limit = '100' } = req.query;

      const logs = await AuditLog.findSuspiciousActivity();

      res.json({
        success: true,
        data: logs.slice(0, parseInt(limit as string, 10))
      });
    } catch (error) {
      logger.error('Failed to get suspicious activity logs', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve suspicious activity logs'
      });
    }
  }

  /**
   * Mark audit log as suspicious
   */
  async markSuspicious(req: Request, res: Response) {
    try {
      const { auditLogId } = req.params;
      const { flaggedReason, investigationStatus = 'pending' } = req.body;

      if (!flaggedReason) {
        return res.status(400).json({
          success: false,
          message: 'Flagged reason is required'
        });
      }

      await auditService.markSuspicious(auditLogId, flaggedReason, investigationStatus);

      // Log this security action
      await auditService.auditSecurityEvent(
        req,
        `Marked audit log ${auditLogId} as suspicious: ${flaggedReason}`,
        'medium',
        false
      );

      res.json({
        success: true,
        message: 'Audit log marked as suspicious'
      });
    } catch (error) {
      logger.error('Failed to mark audit log as suspicious', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark audit log as suspicious'
      });
    }
  }

  /**
   * Update investigation status
   */
  async updateInvestigationStatus(req: Request, res: Response) {
    try {
      const { auditLogId } = req.params;
      const { investigationStatus, notes } = req.body;

      if (!investigationStatus) {
        return res.status(400).json({
          success: false,
          message: 'Investigation status is required'
        });
      }

      const validStatuses = ['none', 'pending', 'in_progress', 'resolved', 'escalated'];
      if (!validStatuses.includes(investigationStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid investigation status'
        });
      }

      await AuditLog.findByIdAndUpdate(auditLogId, {
        investigationStatus,
        ...(notes && { 'metadata.investigationNotes': notes })
      });

      // Log this security action
      await auditService.auditSecurityEvent(
        req,
        `Updated investigation status for audit log ${auditLogId} to ${investigationStatus}`,
        'low',
        false
      );

      res.json({
        success: true,
        message: 'Investigation status updated'
      });
    } catch (error) {
      logger.error('Failed to update investigation status', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update investigation status'
      });
    }
  }

  /**
   * Export audit logs for compliance reporting
   */
  async exportAuditLogs(req: Request, res: Response) {
    try {
      const {
        startDate,
        endDate,
        format = 'json',
        phiOnly = 'false'
      } = req.query;

      const options: AuditQueryOptions = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        phiAccessed: phiOnly === 'true' ? true : undefined,
        limit: 10000, // Large limit for export
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const result = await auditService.queryAuditLogs(options);

      // Log this export action
      await auditService.auditSecurityEvent(
        req,
        `Exported ${result.logs.length} audit logs for compliance reporting`,
        'medium',
        false
      );

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = [
          'Timestamp', 'User ID', 'User Email', 'Action', 'Resource', 'Resource ID',
          'PHI Accessed', 'PHI Type', 'Risk Level', 'Event Type', 'IP Address',
          'Description', 'Status Code', 'Suspicious'
        ];

        const csvRows = result.logs.map(log => [
          log.timestamp.toISOString(),
          log.userId || '',
          log.userEmail || '',
          log.action,
          log.resource,
          log.resourceId || '',
          log.phiAccessed ? 'Yes' : 'No',
          log.phiType || '',
          log.riskLevel,
          log.eventType,
          log.ipAddress,
          log.description,
          log.statusCode || '',
          log.suspicious ? 'Yes' : 'No'
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
        res.json({
          exportDate: new Date().toISOString(),
          totalRecords: result.total,
          exportedRecords: result.logs.length,
          filters: options,
          data: result.logs
        });
      }
    } catch (error) {
      logger.error('Failed to export audit logs', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export audit logs'
      });
    }
  }

  /**
   * Clean up expired audit logs (admin only)
   */
  async cleanupExpiredLogs(req: Request, res: Response) {
    try {
      // Additional admin check could be added here
      const user = req.user as any;
      if (user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin privileges required for log cleanup'
        });
      }

      const deletedCount = await auditService.cleanupExpiredLogs();

      // Log this admin action
      await auditService.auditSecurityEvent(
        req,
        `Cleaned up ${deletedCount} expired audit logs`,
        'low',
        false
      );

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} expired audit logs`,
        deletedCount
      });
    } catch (error) {
      logger.error('Failed to cleanup expired logs', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup expired logs'
      });
    }
  }
}

export const auditController = new AuditController(); 