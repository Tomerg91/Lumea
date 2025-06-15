
import crypto from 'crypto';
import DataRetentionPolicy, { IDataRetentionPolicy } from '../models/DataRetentionPolicy';
import DeletionCertificate from '../models/DeletionCertificate';
import { AuditService } from './auditService';
import { EncryptionService } from './encryptionService';
import { logger } from '../utils/logger';

// Import all models that can have retention policies
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Reflection } from '../models/Reflection';
import { CoachNote } from '../models/CoachNote';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { SessionFeedback } from '../models/SessionFeedback';
import { File } from '../models/File';
import { SessionHistory } from '../models/SessionHistory';
import { Consent } from '../models/Consent';
import { EncryptionKey } from '../models/EncryptionKey';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { InviteToken } from '../models/InviteToken';
import { SessionTiming } from '../models/SessionTiming';
import { CoachAvailability } from '../models/CoachAvailability';

interface DeletionResult {
  success: boolean;
  recordsProcessed: number;
  recordsDeleted: number;
  recordsSkipped: number;
  recordsFailed: number;
  errors: string[];
  certificateId?: string;
  executionTime: number;
}

interface PolicyPreview {
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

interface RetentionReport {
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

export class DataRetentionService {
  private auditService: AuditService;
  private encryptionService: EncryptionService;
  private modelMap: Map<string, any>;

  constructor() {
    this.auditService = new AuditService();
    this.encryptionService = new EncryptionService();
    this.initializeModelMap();
  }

  private initializeModelMap(): void {
    this.modelMap = new Map([
      ['User', User],
      ['Session', Session],
      ['Reflection', Reflection],
      ['CoachNote', CoachNote],
      ['AuditLog', AuditLog],
      ['Notification', Notification],
      ['SessionFeedback', SessionFeedback],
      ['File', File],
      ['SessionHistory', SessionHistory],
      ['Consent', Consent],
      ['EncryptionKey', EncryptionKey],
      ['PasswordResetToken', PasswordResetToken],
      ['InviteToken', InviteToken],
      ['SessionTiming', SessionTiming],
      ['CoachAvailability', CoachAvailability]
    ]);
  }

  /**
   * Create a new data retention policy
   */
  async createPolicy(policyData: Partial<IDataRetentionPolicy>, createdBy: string): Promise<IDataRetentionPolicy> {
    try {
      const policy = new DataRetentionPolicy({
        ...policyData,
        createdBy,
        updatedBy: createdBy
      });

      await policy.save();

      await this.auditService.log({
        action: 'CREATE',
        resource: 'data_retention_policy',
        resourceId: policy._id.toString(),
        userId: createdBy,
        description: `Created data retention policy: ${policy.name}`,
        riskLevel: 'medium',
        phiAccessed: false,
        dataClassification: 'internal'
      });

      logger.info('Data retention policy created', {
        policyId: policy._id,
        name: policy.name,
        dataType: policy.dataType,
        createdBy
      });

      return policy;
    } catch (error) {
      logger.error('Failed to create data retention policy', error);
      throw new Error('Failed to create data retention policy');
    }
  }

  /**
   * Update an existing data retention policy
   */
  async updatePolicy(
    policyId: string, 
    updates: Partial<IDataRetentionPolicy>, 
    updatedBy: string
  ): Promise<IDataRetentionPolicy> {
    try {
      const policy = await DataRetentionPolicy.findById(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }

      const oldValues = { ...policy.toObject() };
      Object.assign(policy, updates, { updatedBy, updatedAt: new Date() });
      
      await policy.save();

      await this.auditService.log({
        action: 'UPDATE',
        resource: 'data_retention_policy',
        resourceId: policyId,
        userId: updatedBy,
        description: `Updated data retention policy: ${policy.name}`,
        oldValues,
        newValues: updates,
        riskLevel: 'medium',
        phiAccessed: false,
        dataClassification: 'internal'
      });

      logger.info('Data retention policy updated', {
        policyId,
        updatedBy,
        changes: Object.keys(updates)
      });

      return policy;
    } catch (error) {
      logger.error('Failed to update data retention policy', error);
      throw new Error('Failed to update data retention policy');
    }
  }

  /**
   * Preview what records would be deleted by a policy without actually deleting them
   */
  async previewPolicyExecution(policyId: string): Promise<PolicyPreview> {
    try {
      const policy = await DataRetentionPolicy.findById(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }

      const Model = this.modelMap.get(policy.modelName);
      if (!Model) {
        throw new Error(`Model ${policy.modelName} not found`);
      }

      // Build query for eligible records
      const query = this.buildRetentionQuery(policy);
      
      const estimatedRecords = await Model.countDocuments(query);
      const sampledRecords = await Model.find(query).limit(10).lean();
      
      let oldestRecord: Date | undefined;
      let newestRecord: Date | undefined;
      
      if (sampledRecords.length > 0) {
        const dates = sampledRecords
          .map(r => r[policy.retentionPeriod.fromField])
          .filter(d => d)
          .sort();
        
        oldestRecord = dates[0];
        newestRecord = dates[dates.length - 1];
      }

      const risks = this.assessDeletionRisks(policy, estimatedRecords);
      const recommendations = this.generateRecommendations(policy, estimatedRecords);

      logger.info('Policy execution preview generated', {
        policyId,
        estimatedRecords,
        risks: risks.length,
        recommendations: recommendations.length
      });

      return {
        policyId,
        policyName: policy.name,
        dataType: policy.dataType,
        estimatedRecords,
        oldestRecord,
        newestRecord,
        sampledRecords,
        risks,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to generate policy preview', error);
      throw new Error('Failed to generate policy preview');
    }
  }

  /**
   * Execute a specific data retention policy
   */
  async executePolicy(
    policyId: string, 
    executedBy: string, 
    dryRun: boolean = false,
    executionMethod: 'automated' | 'manual' | 'emergency' = 'manual'
  ): Promise<DeletionResult> {
    const startTime = Date.now();
    let result: DeletionResult = {
      success: false,
      recordsProcessed: 0,
      recordsDeleted: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
      executionTime: 0
    };

    try {
      const policy = await DataRetentionPolicy.findById(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }

      if (!policy.isActive) {
        throw new Error('Policy is not active');
      }

      logger.info('Starting policy execution', {
        policyId,
        policyName: policy.name,
        executedBy,
        dryRun,
        executionMethod
      });

      const Model = this.modelMap.get(policy.modelName);
      if (!Model) {
        throw new Error(`Model ${policy.modelName} not found`);
      }

      // Build query for eligible records
      const query = this.buildRetentionQuery(policy);
      
      // Process records in batches
      let skip = 0;
      const batchSize = policy.batchSize;
      let totalProcessed = 0;
      let totalDeleted = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      const errors: string[] = [];
      const deletedRecords: any[] = [];

      while (true) {
        const batch = await Model.find(query)
          .skip(skip)
          .limit(batchSize)
          .lean();

        if (batch.length === 0) break;

        for (const record of batch) {
          totalProcessed++;

          try {
            // Check if record is eligible for deletion
            if (!policy.isEligibleForDeletion(record)) {
              totalSkipped++;
              continue;
            }

            if (!dryRun) {
              // Perform the deletion based on method
              const deleteResult = await this.deleteRecord(Model, record, policy);
              
              if (deleteResult.success) {
                totalDeleted++;
                deletedRecords.push(record);
                
                // Log individual deletion for audit
                await this.auditService.log({
                  action: 'DELETE',
                  resource: policy.dataType,
                  resourceId: record._id?.toString() || record.id,
                  userId: executedBy,
                  description: `Record deleted by retention policy: ${policy.name}`,
                  riskLevel: 'high',
                  phiAccessed: policy.category === 'medical_data',
                  dataClassification: this.getDataClassification(policy.category),
                  metadata: {
                    policyId,
                    deletionMethod: policy.deletionMethod,
                    secureWipe: policy.secureWipe
                  }
                });
              } else {
                totalFailed++;
                errors.push(`Failed to delete record ${record._id}: ${deleteResult.error}`);
              }
            } else {
              // Dry run - just count what would be deleted
              totalDeleted++;
            }
          } catch (error) {
            totalFailed++;
            errors.push(`Error processing record ${record._id}: ${error.message}`);
            logger.error('Error processing record for deletion', error);
          }
        }

        skip += batchSize;

        // Safety break for very large datasets
        if (totalProcessed > 100000) {
          logger.warn('Breaking execution due to large dataset', { totalProcessed });
          break;
        }
      }

      result = {
        success: totalFailed === 0,
        recordsProcessed: totalProcessed,
        recordsDeleted: totalDeleted,
        recordsSkipped: totalSkipped,
        recordsFailed: totalFailed,
        errors,
        executionTime: Date.now() - startTime
      };

      // Create deletion certificate if any records were deleted and not a dry run
      if (!dryRun && totalDeleted > 0) {
        const certificate = await this.createDeletionCertificate(
          policy,
          result,
          executedBy,
          executionMethod,
          deletedRecords
        );
        result.certificateId = certificate.certificateId;
      }

      // Update policy execution history
      if (!dryRun) {
        await this.updatePolicyExecutionHistory(policy, result);
      }

      logger.info('Policy execution completed', {
        policyId,
        dryRun,
        result
      });

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(error.message);
      result.executionTime = Date.now() - startTime;
      
      logger.error('Policy execution failed', error);
      throw error;
    }
  }

  /**
   * Execute all active policies that are due for execution
   */
  async executeScheduledPolicies(): Promise<Array<{ policyId: string; result: DeletionResult }>> {
    try {
      const policies = await DataRetentionPolicy.findPoliciesForExecution();
      const results: Array<{ policyId: string; result: DeletionResult }> = [];

      logger.info('Starting scheduled policy execution', {
        policiesCount: policies.length
      });

      for (const policy of policies) {
        try {
          const result = await this.executePolicy(
            policy._id.toString(),
            'system',
            false,
            'automated'
          );
          
          results.push({
            policyId: policy._id.toString(),
            result
          });

          // Update next execution time
          policy.setNextExecutionDate();
          await policy.save();
        } catch (error) {
          logger.error('Failed to execute scheduled policy', {
            policyId: policy._id,
            error: error.message
          });
          
          results.push({
            policyId: policy._id.toString(),
            result: {
              success: false,
              recordsProcessed: 0,
              recordsDeleted: 0,
              recordsSkipped: 0,
              recordsFailed: 0,
              errors: [error.message],
              executionTime: 0
            }
          });
        }
      }

      logger.info('Scheduled policy execution completed', {
        total: results.length,
        successful: results.filter(r => r.result.success).length
      });

      return results;
    } catch (error) {
      logger.error('Failed to execute scheduled policies', error);
      throw new Error('Failed to execute scheduled policies');
    }
  }

  /**
   * Generate comprehensive retention report
   */
  async generateRetentionReport(): Promise<RetentionReport> {
    try {
      const policies = await DataRetentionPolicy.find();
      const activePolicies = policies.filter(p => p.isActive);
      
      // Get execution summary for last 30 days
      const executionSummary = await DataRetentionPolicy.getExecutionSummary(30);
      const summary = executionSummary[0] || {
        totalExecutions: 0,
        totalProcessed: 0,
        totalDeleted: 0,
        successRate: 0
      };

      // Check policy status
      const policyStatus = await Promise.all(
        activePolicies.map(async (policy) => {
          const pendingRecords = await this.countPendingDeletions(policy);
          const isOverdue = policy.nextExecutionAt && policy.nextExecutionAt < new Date();
          const hasRecentFailures = policy.executionHistory
            .slice(-3)
            .some(exec => exec.status === 'failed');

          return {
            policyId: policy._id.toString(),
            name: policy.name,
            lastExecution: policy.lastExecutedAt,
            nextExecution: policy.nextExecutionAt,
            status: hasRecentFailures ? 'failed' : isOverdue ? 'overdue' : 'healthy',
            recordsPendingDeletion: pendingRecords
          };
        })
      );

      // Get recent executions
      const recentExecutions = await DeletionCertificate.find()
        .sort({ executedAt: -1 })
        .limit(20)
        .lean();

      // Calculate compliance metrics
      const complianceMetrics = this.calculateComplianceMetrics(policies, policyStatus);

      const report: RetentionReport = {
        summary: {
          totalPolicies: policies.length,
          activePolicies: activePolicies.length,
          executionsLast30Days: summary.totalExecutions,
          totalRecordsDeleted: summary.totalDeleted,
          complianceStatus: complianceMetrics.hipaaCompliant && complianceMetrics.gdprCompliant
            ? 'compliant'
            : complianceMetrics.retentionRisk > 0.7
            ? 'non_compliant'
            : 'at_risk'
        },
        policyStatus,
        recentExecutions: recentExecutions.map(exec => ({
          policyId: exec.policyId,
          executedAt: exec.executedAt,
          status: exec.status,
          recordsDeleted: exec.recordsDeleted,
          certificateId: exec.certificateId
        })),
        complianceMetrics
      };

      logger.info('Retention report generated', {
        totalPolicies: report.summary.totalPolicies,
        complianceStatus: report.summary.complianceStatus
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate retention report', error);
      throw new Error('Failed to generate retention report');
    }
  }

  /**
   * Set legal hold on specific records to prevent deletion
   */
  async setLegalHold(
    dataType: string,
    recordIds: string[],
    reason: string,
    setBy: string,
    expiresAt?: Date
  ): Promise<{ success: boolean; affectedRecords: number; errors: string[] }> {
    try {
      const policies = await DataRetentionPolicy.findByDataType(dataType);
      const policy = policies[0]; // Use the first policy for the data type
      
      if (!policy || !policy.legalHoldSupport) {
        throw new Error('Legal hold not supported for this data type');
      }

      const Model = this.modelMap.get(policy.modelName);
      if (!Model) {
        throw new Error(`Model ${policy.modelName} not found`);
      }

      const result = await Model.updateMany(
        { _id: { $in: recordIds } },
        {
          $set: {
            [policy.legalHoldField]: {
              isActive: true,
              reason,
              setBy,
              setAt: new Date(),
              expiresAt
            }
          }
        }
      );

      // Log legal hold setting
      await this.auditService.log({
        action: 'UPDATE',
        resource: dataType,
        resourceId: recordIds.join(','),
        userId: setBy,
        description: `Legal hold set: ${reason}`,
        riskLevel: 'high',
        phiAccessed: policy.category === 'medical_data',
        dataClassification: this.getDataClassification(policy.category),
        metadata: {
          legalHoldReason: reason,
          recordCount: recordIds.length,
          expiresAt
        }
      });

      logger.info('Legal hold set', {
        dataType,
        recordCount: result.modifiedCount,
        reason,
        setBy
      });

      return {
        success: true,
        affectedRecords: result.modifiedCount,
        errors: []
      };
    } catch (error) {
      logger.error('Failed to set legal hold', error);
      return {
        success: false,
        affectedRecords: 0,
        errors: [error.message]
      };
    }
  }

  // Private helper methods

  private buildRetentionQuery(policy: IDataRetentionPolicy): any {
    const retentionDate = policy.calculateRetentionDate(new Date());
    
    const query: any = {
      [policy.retentionPeriod.fromField]: { $lt: retentionDate }
    };

    // Add legal hold exclusion if supported
    if (policy.legalHoldSupport && policy.legalHoldField) {
      query[`${policy.legalHoldField}.isActive`] = { $ne: true };
    }

    // Apply include conditions
    if (Object.keys(policy.filters.includeConditions).length > 0) {
      Object.assign(query, policy.filters.includeConditions);
    }

    // Apply exclude conditions (negated)
    if (Object.keys(policy.filters.excludeConditions).length > 0) {
      for (const [field, value] of Object.entries(policy.filters.excludeConditions)) {
        query[field] = { $ne: value };
      }
    }

    return query;
  }

  private async deleteRecord(
    Model: any,
    record: any,
    policy: IDataRetentionPolicy
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (policy.deletionMethod) {
        case 'soft_delete':
          await Model.findByIdAndUpdate(record._id, {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: 'retention_policy'
          });
          break;

        case 'hard_delete':
          if (policy.secureWipe) {
            // Perform secure wipe by overwriting sensitive fields
            await this.secureWipeRecord(Model, record);
          }
          await Model.findByIdAndDelete(record._id);
          break;

        case 'anonymize':
          await this.anonymizeRecord(Model, record);
          break;

        case 'archive':
          await this.archiveRecord(Model, record, policy);
          break;

        default:
          throw new Error(`Unknown deletion method: ${policy.deletionMethod}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async secureWipeRecord(Model: any, record: any): Promise<void> {
    // Identify sensitive fields to overwrite
    const sensitiveFields = this.identifySensitiveFields(record);
    const overwriteData: any = {};

    for (const field of sensitiveFields) {
      overwriteData[field] = crypto.randomBytes(32).toString('hex');
    }

    // Overwrite sensitive data multiple times for secure deletion
    for (let i = 0; i < 3; i++) {
      await Model.findByIdAndUpdate(record._id, overwriteData);
    }
  }

  private async anonymizeRecord(Model: any, record: any): Promise<void> {
    const anonymizedData = this.generateAnonymizedData(record);
    await Model.findByIdAndUpdate(record._id, {
      ...anonymizedData,
      anonymized: true,
      anonymizedAt: new Date()
    });
  }

  private async archiveRecord(Model: any, record: any, policy: IDataRetentionPolicy): Promise<void> {
    // Archive to a separate collection or storage
    const archiveData = {
      ...record,
      archivedAt: new Date(),
      originalCollection: Model.collection.name,
      policyId: policy._id
    };

    // Save to archive collection (implementation would depend on archive strategy)
    // For now, just mark as archived
    await Model.findByIdAndUpdate(record._id, {
      archived: true,
      archivedAt: new Date()
    });
  }

  private identifySensitiveFields(record: any): string[] {
    const sensitivePatterns = [
      'email', 'phone', 'address', 'ssn', 'name', 'password',
      'content', 'notes', 'reflection', 'description'
    ];

    return Object.keys(record).filter(key =>
      sensitivePatterns.some(pattern => key.toLowerCase().includes(pattern))
    );
  }

  private generateAnonymizedData(record: any): any {
    const anonymized: any = {};
    const sensitiveFields = this.identifySensitiveFields(record);

    for (const field of sensitiveFields) {
      if (typeof record[field] === 'string') {
        anonymized[field] = `[ANONYMIZED_${field.toUpperCase()}]`;
      } else if (typeof record[field] === 'number') {
        anonymized[field] = 0;
      } else {
        anonymized[field] = null;
      }
    }

    return anonymized;
  }

  private async createDeletionCertificate(
    policy: IDataRetentionPolicy,
    result: DeletionResult,
    executedBy: string,
    executionMethod: 'automated' | 'manual' | 'emergency',
    deletedRecords: any[]
  ): Promise<any> {
    const crypto = require('crypto');
    
    const certificateData = {
      policyId: policy._id.toString(),
      dataType: policy.dataType,
      modelName: policy.modelName,
      executedAt: new Date(),
      executedBy,
      executionMethod,
      recordsProcessed: result.recordsProcessed,
      recordsDeleted: result.recordsDeleted,
      recordsSkipped: result.recordsSkipped,
      recordsFailed: result.recordsFailed,
      deletionMethod: policy.deletionMethod,
      secureWipeUsed: policy.secureWipe,
      cryptographicHash: this.calculateRecordsHash(deletedRecords),
      digitalSignature: this.generateDigitalSignature(deletedRecords, policy),
      legalBasis: 'Data retention policy compliance',
      complianceFramework: this.getComplianceFrameworks(policy),
      retentionPeriodMet: true,
      affectedTables: [policy.modelName],
      backupStatus: 'retained',
      backupRetentionUntil: new Date(Date.now() + policy.backupRetention * 24 * 60 * 60 * 1000),
      verificationHash: crypto.randomBytes(32).toString('hex'),
      status: result.success ? 'completed' : 'partial'
    };

    const certificate = new DeletionCertificate(certificateData);
    await certificate.save();

    return certificate;
  }

  private calculateRecordsHash(records: any[]): string {
    const recordIds = records.map(r => r._id?.toString() || r.id).sort();
    return crypto.createHash('sha256').update(recordIds.join(',')).digest('hex');
  }

  private generateDigitalSignature(records: any[], policy: IDataRetentionPolicy): string {
    const signatureData = {
      recordCount: records.length,
      policyId: policy._id,
      timestamp: new Date().toISOString()
    };
    return crypto.createHash('sha256').update(JSON.stringify(signatureData)).digest('hex');
  }

  private getComplianceFrameworks(policy: IDataRetentionPolicy): string[] {
    const frameworks = [];
    
    if (policy.category === 'medical_data') {
      frameworks.push('HIPAA');
    }
    
    frameworks.push('GDPR'); // All data should comply with GDPR
    
    return frameworks;
  }

  private async updatePolicyExecutionHistory(
    policy: IDataRetentionPolicy,
    result: DeletionResult
  ): Promise<void> {
    const executionEntry = {
      executedAt: new Date(),
      recordsProcessed: result.recordsProcessed,
      recordsDeleted: result.recordsDeleted,
      recordsSkipped: result.recordsSkipped,
      errorCount: result.recordsFailed,
      executionTime: result.executionTime,
      status: result.success ? 'success' : result.recordsDeleted > 0 ? 'partial' : 'failed',
      certificateId: result.certificateId,
      notes: result.errors.length > 0 ? result.errors.join('; ') : undefined
    };

    policy.executionHistory.push(executionEntry as any);
    policy.lastExecutedAt = new Date();
    
    // Keep only last 50 executions
    if (policy.executionHistory.length > 50) {
      policy.executionHistory = policy.executionHistory.slice(-50);
    }

    await policy.save();
  }

  private assessDeletionRisks(policy: IDataRetentionPolicy, recordCount: number): string[] {
    const risks: string[] = [];

    if (recordCount > 10000) {
      risks.push('Large dataset deletion - consider batching over multiple executions');
    }

    if (policy.category === 'medical_data') {
      risks.push('Medical data deletion - ensure HIPAA compliance and patient consent');
    }

    if (policy.deletionMethod === 'hard_delete' && !policy.secureWipe) {
      risks.push('Hard deletion without secure wipe may leave recoverable data');
    }

    if (!policy.legalHoldSupport) {
      risks.push('No legal hold support - may delete legally protected records');
    }

    return risks;
  }

  private generateRecommendations(policy: IDataRetentionPolicy, recordCount: number): string[] {
    const recommendations: string[] = [];

    if (recordCount === 0) {
      recommendations.push('No records eligible for deletion - policy may be too restrictive');
    }

    if (policy.deletionMethod === 'soft_delete') {
      recommendations.push('Consider implementing hard deletion for better data minimization');
    }

    if (!policy.autoExecute) {
      recommendations.push('Enable auto-execution for consistent retention policy enforcement');
    }

    if (policy.batchSize > 5000) {
      recommendations.push('Consider smaller batch size for better performance and monitoring');
    }

    return recommendations;
  }

  private async countPendingDeletions(policy: IDataRetentionPolicy): Promise<number> {
    try {
      const Model = this.modelMap.get(policy.modelName);
      if (!Model) return 0;

      const query = this.buildRetentionQuery(policy);
      return await Model.countDocuments(query);
    } catch (error) {
      logger.error('Failed to count pending deletions', error);
      return 0;
    }
  }

  private calculateComplianceMetrics(
    policies: IDataRetentionPolicy[],
    policyStatus: any[]
  ): any {
    const hipaaCompliant = policies
      .filter(p => p.category === 'medical_data')
      .every(p => p.calculateRetentionDays() >= p.complianceRequirements.hipaaMinimum);

    const gdprCompliant = policies
      .every(p => !p.complianceRequirements.gdprMaximum || 
        p.calculateRetentionDays() <= p.complianceRequirements.gdprMaximum);

    const healthyPolicies = policyStatus.filter(p => p.status === 'healthy').length;
    const dataMinimizationScore = healthyPolicies / Math.max(policyStatus.length, 1);

    const overduePolicies = policyStatus.filter(p => p.status === 'overdue').length;
    const retentionRisk = overduePolicies / Math.max(policyStatus.length, 1);

    return {
      hipaaCompliant,
      gdprCompliant,
      dataMinimizationScore,
      retentionRisk
    };
  }

  private getDataClassification(category: string): 'public' | 'internal' | 'confidential' | 'restricted' {
    switch (category) {
      case 'medical_data':
      case 'financial_data':
        return 'restricted';
      case 'personal_data':
        return 'confidential';
      case 'audit_data':
        return 'internal';
      default:
        return 'internal';
    }
  }
}