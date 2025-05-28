import { Request, Response } from 'express';
import { HIPAAComplianceService } from '../services/hipaaComplianceService.js';
import { logger } from '../services/logger.js';

export class HIPAAComplianceController {
  /**
   * GET /api/compliance/report
   * Generate and return a comprehensive HIPAA compliance report
   */
  static async generateComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Generating HIPAA compliance report', { userId: req.user?.id });

      const report = await HIPAAComplianceService.generateComplianceReport();

      res.status(200).json({
        success: true,
        message: 'HIPAA compliance report generated successfully',
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate HIPAA compliance report', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate compliance report',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  /**
   * GET /api/compliance/dashboard
   * Get compliance dashboard summary
   */
  static async getComplianceDashboard(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching compliance dashboard', { userId: req.user?.id });

      const dashboard = await HIPAAComplianceService.getComplianceDashboard();

      res.status(200).json({
        success: true,
        message: 'Compliance dashboard retrieved successfully',
        data: dashboard
      });
    } catch (error) {
      logger.error('Failed to get compliance dashboard', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get compliance dashboard',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  /**
   * GET /api/compliance/status
   * Get current compliance status summary
   */
  static async getComplianceStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching compliance status', { userId: req.user?.id });

      const dashboard = await HIPAAComplianceService.getComplianceDashboard();
      
      // Return simplified status for quick checks
      const status = {
        overallStatus: dashboard.overallStatus,
        complianceScore: dashboard.complianceScore,
        criticalIssues: dashboard.criticalIssues,
        lastReview: dashboard.lastReview,
        nextReview: dashboard.nextReview
      };

      res.status(200).json({
        success: true,
        message: 'Compliance status retrieved successfully',
        data: status
      });
    } catch (error) {
      logger.error('Failed to get compliance status', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get compliance status',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
} 