import { Request, Response } from 'express';
import { DataRetentionService } from '../services/dataRetentionService';
import DataRetentionPolicy from '../models/DataRetentionPolicy';
import DeletionCertificate from '../models/DeletionCertificate';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';

export class DataRetentionController {
  private dataRetentionService: DataRetentionService;

  constructor() {
    this.dataRetentionService = new DataRetentionService();
  }

  /**
   * Get all data retention policies
   */
  getPolicies = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        active, 
        dataType, 
        category,
        page = 1, 
        limit = 20,
        sort = '-createdAt'
      } = req.query;

      const query: any = {};
      
      if (active !== undefined) {
        query.isActive = active === 'true';
      }
      
      if (dataType) {
        query.dataType = dataType;
      }
      
      if (category) {
        query.category = category;
      }

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort
      };

      const policies = await DataRetentionPolicy.find(query)
        .sort(sort as string)
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .lean();

      const total = await DataRetentionPolicy.countDocuments(query);

      res.json({
        success: true,
        data: policies,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages: Math.ceil(total / options.limit)
        }
      });
    } catch (error) {
      logger.error('Failed to get retention policies', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve retention policies',
        error: error.message
      });
    }
  };

  /**
   * Get a specific data retention policy
   */
  getPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { policyId } = req.params;
      const { includeExecutionHistory = false } = req.query;

      let query = DataRetentionPolicy.findById(policyId);
      
      if (!includeExecutionHistory) {
        query = query.select('-executionHistory');
      }

      const policy = await query.lean();

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
        return;
      }

      res.json({
        success: true,
        data: policy
      });
    } catch (error) {
      logger.error('Failed to get retention policy', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve retention policy',
        error: error.message
      });
    }
  };

  /**
   * Create a new data retention policy
   */
  createPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const policy = await this.dataRetentionService.createPolicy(req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Data retention policy created successfully',
        data: policy
      });
    } catch (error) {
      logger.error('Failed to create retention policy', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create retention policy',
        error: error.message
      });
    }
  };

  /**
   * Update an existing data retention policy
   */
  updatePolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { policyId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const policy = await this.dataRetentionService.updatePolicy(
        policyId,
        req.body,
        userId
      );

      res.json({
        success: true,
        message: 'Data retention policy updated successfully',
        data: policy
      });
    } catch (error) {
      logger.error('Failed to update retention policy', error);
      
      if (error.message === 'Policy not found') {
        res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update retention policy',
        error: error.message
      });
    }
  };

  /**
   * Delete a data retention policy
   */
  deletePolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { policyId } = req.params;

      const policy = await DataRetentionPolicy.findById(policyId);
      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
        return;
      }

      // Deactivate instead of deleting to preserve audit trail
      policy.isActive = false;
      policy.updatedBy = req.user?.id || 'system';
      await policy.save();

      res.json({
        success: true,
        message: 'Data retention policy deactivated successfully'
      });
    } catch (error) {
      logger.error('Failed to delete retention policy', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete retention policy',
        error: error.message
      });
    }
  };

  /**
   * Preview what would be deleted by a policy
   */
  previewPolicyExecution = async (req: Request, res: Response): Promise<void> => {
    try {
      const { policyId } = req.params;

      const preview = await this.dataRetentionService.previewPolicyExecution(policyId);

      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      logger.error('Failed to preview policy execution', error);
      
      if (error.message === 'Policy not found') {
        res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to preview policy execution',
        error: error.message
      });
    }
  };

  /**
   * Execute a specific data retention policy
   */
  executePolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { policyId } = req.params;
      const { dryRun = false, executionMethod = 'manual' } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const result = await this.dataRetentionService.executePolicy(
        policyId,
        userId,
        dryRun,
        executionMethod
      );

      res.json({
        success: true,
        message: dryRun ? 'Policy execution preview completed' : 'Policy executed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Failed to execute retention policy', error);
      
      if (error.message === 'Policy not found') {
        res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to execute retention policy',
        error: error.message
      });
    }
  };

  /**
   * Execute all scheduled policies
   */
  executeScheduledPolicies = async (req: Request, res: Response): Promise<void> => {
    try {
      const results = await this.dataRetentionService.executeScheduledPolicies();

      res.json({
        success: true,
        message: 'Scheduled policies execution completed',
        data: {
          totalPolicies: results.length,
          successfulExecutions: results.filter(r => r.result.success).length,
          results
        }
      });
    } catch (error) {
      logger.error('Failed to execute scheduled policies', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute scheduled policies',
        error: error.message
      });
    }
  };

  /**
   * Generate comprehensive retention report
   */
  generateRetentionReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const report = await this.dataRetentionService.generateRetentionReport();

      res.json({
        success: true,
        data: report,
        generatedAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to generate retention report', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate retention report',
        error: error.message
      });
    }
  };

  /**
   * Get deletion certificates
   */
  getDeletionCertificates = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        policyId,
        dataType,
        status,
        fromDate,
        toDate,
        page = 1,
        limit = 20,
        sort = '-executedAt'
      } = req.query;

      const query: any = {};

      if (policyId) {
        query.policyId = policyId;
      }

      if (dataType) {
        query.dataType = dataType;
      }

      if (status) {
        query.status = status;
      }

      if (fromDate || toDate) {
        query.executedAt = {};
        if (fromDate) {
          query.executedAt.$gte = new Date(fromDate as string);
        }
        if (toDate) {
          query.executedAt.$lte = new Date(toDate as string);
        }
      }

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const certificates = await DeletionCertificate.find(query)
        .sort(sort as string)
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .lean();

      const total = await DeletionCertificate.countDocuments(query);

      res.json({
        success: true,
        data: certificates,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages: Math.ceil(total / options.limit)
        }
      });
    } catch (error) {
      logger.error('Failed to get deletion certificates', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve deletion certificates',
        error: error.message
      });
    }
  };

  /**
   * Get a specific deletion certificate
   */
  getDeletionCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { certificateId } = req.params;

      const certificate = await DeletionCertificate.findOne({
        $or: [
          { certificateId },
          { certificateNumber: certificateId },
          { _id: certificateId }
        ]
      }).lean();

      if (!certificate) {
        res.status(404).json({
          success: false,
          message: 'Deletion certificate not found'
        });
        return;
      }

      res.json({
        success: true,
        data: certificate
      });
    } catch (error) {
      logger.error('Failed to get deletion certificate', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve deletion certificate',
        error: error.message
      });
    }
  };

  /**
   * Download deletion certificate as PDF report
   */
  downloadCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { certificateId } = req.params;

      const certificate = await DeletionCertificate.findOne({
        $or: [
          { certificateId },
          { certificateNumber: certificateId },
          { _id: certificateId }
        ]
      });

      if (!certificate) {
        res.status(404).json({
          success: false,
          message: 'Deletion certificate not found'
        });
        return;
      }

      const report = await certificate.generateReport();

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="deletion-certificate-${certificate.certificateNumber}.txt"`);
      res.send(report);
    } catch (error) {
      logger.error('Failed to download deletion certificate', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download deletion certificate',
        error: error.message
      });
    }
  };

  /**
   * Verify deletion certificate integrity
   */
  verifyCertificate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { certificateId } = req.params;

      const certificate = await DeletionCertificate.findOne({
        $or: [
          { certificateId },
          { certificateNumber: certificateId },
          { _id: certificateId }
        ]
      });

      if (!certificate) {
        res.status(404).json({
          success: false,
          message: 'Deletion certificate not found'
        });
        return;
      }

      const isValid = await certificate.verify();

      res.json({
        success: true,
        data: {
          certificateId: certificate.certificateId,
          certificateNumber: certificate.certificateNumber,
          isValid,
          verifiedAt: new Date(),
          status: certificate.status
        }
      });
    } catch (error) {
      logger.error('Failed to verify deletion certificate', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify deletion certificate',
        error: error.message
      });
    }
  };

  /**
   * Set legal hold on records
   */
  setLegalHold = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { dataType, recordIds, reason, expiresAt } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const result = await this.dataRetentionService.setLegalHold(
        dataType,
        recordIds,
        reason,
        userId,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.json({
        success: result.success,
        message: result.success ? 'Legal hold set successfully' : 'Failed to set legal hold',
        data: result
      });
    } catch (error) {
      logger.error('Failed to set legal hold', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set legal hold',
        error: error.message
      });
    }
  };

  /**
   * Remove legal hold from records
   */
  removeLegalHold = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dataType, recordIds, reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Find the policy for this data type
      const policies = await DataRetentionPolicy.findByDataType(dataType);
      const policy = policies[0];

      if (!policy || !policy.legalHoldSupport) {
        res.status(400).json({
          success: false,
          message: 'Legal hold not supported for this data type'
        });
        return;
      }

      // Update records to remove legal hold
      const Model = this.dataRetentionService['modelMap'].get(policy.modelName);
      if (!Model) {
        res.status(500).json({
          success: false,
          message: `Model ${policy.modelName} not found`
        });
        return;
      }

      const result = await Model.updateMany(
        { _id: { $in: recordIds } },
        {
          $set: {
            [`${policy.legalHoldField}.isActive`]: false,
            [`${policy.legalHoldField}.removedAt`]: new Date(),
            [`${policy.legalHoldField}.removedBy`]: userId,
            [`${policy.legalHoldField}.removalReason`]: reason
          }
        }
      );

      res.json({
        success: true,
        message: 'Legal hold removed successfully',
        data: {
          affectedRecords: result.modifiedCount
        }
      });
    } catch (error) {
      logger.error('Failed to remove legal hold', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove legal hold',
        error: error.message
      });
    }
  };

  /**
   * Get policy execution history
   */
  getPolicyExecutionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { policyId } = req.params;
      const { limit = 50 } = req.query;

      const policy = await DataRetentionPolicy.findById(policyId).select('executionHistory');

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
        return;
      }

      const history = policy.executionHistory
        .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
        .slice(0, parseInt(limit as string));

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Failed to get policy execution history', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve policy execution history',
        error: error.message
      });
    }
  };

  /**
   * Get system health status for data retention
   */
  getSystemHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const policies = await DataRetentionPolicy.find({ isActive: true });
      const overduePolicies = policies.filter(p => 
        p.nextExecutionAt && p.nextExecutionAt < new Date()
      );
      
      const failedExecutions = policies.filter(p =>
        p.executionHistory.length > 0 &&
        p.executionHistory[p.executionHistory.length - 1].status === 'failed'
      );

      const pendingDeletions = await Promise.all(
        policies.map(async (policy) => {
          try {
            const Model = this.dataRetentionService['modelMap'].get(policy.modelName);
            if (!Model) return 0;

            const retentionDate = policy.calculateRetentionDate(new Date());
            const query = {
              [policy.retentionPeriod.fromField]: { $lt: retentionDate }
            };

            if (policy.legalHoldSupport && policy.legalHoldField) {
              query[`${policy.legalHoldField}.isActive`] = { $ne: true };
            }

            return await Model.countDocuments(query);
          } catch {
            return 0;
          }
        })
      );

      const totalPendingDeletions = pendingDeletions.reduce((sum, count) => sum + count, 0);

      const health = {
        status: overduePolicies.length === 0 && failedExecutions.length === 0 ? 'healthy' : 'warning',
        activePolicies: policies.length,
        overduePolicies: overduePolicies.length,
        failedExecutions: failedExecutions.length,
        totalPendingDeletions,
        lastChecked: new Date()
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Failed to get system health', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system health',
        error: error.message
      });
    }
  };
}