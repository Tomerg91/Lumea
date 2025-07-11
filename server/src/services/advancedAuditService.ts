import crypto from 'crypto';
import { AuditService, AuditLogEntry } from './auditService';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';

interface IntegrityCheckResult {
  isValid: boolean;
  issues: string[];
  lastValidSequence?: number;
  brokenChainAt?: number;
}

interface ThreatPattern {
  pattern: string;
  indicators: string[];
  riskScore: number;
  description: string;
}

interface BehavioralBaseline {
  userId: string;
  normalHours: [number, number]; // [start, end] in 24h format
  normalLocations: string[];
  typicalActions: string[];
  avgSessionDuration: number;
  avgRequestsPerSession: number;
}

export class AdvancedAuditService extends AuditService {
  private static advancedInstance: AdvancedAuditService;
  private auditKey: string; // For digital signatures
  private sequenceCounter: number = 0;
  private behavioralBaselines: Map<string, BehavioralBaseline> = new Map();

  private constructor() {
    super();
    this.auditKey = this.loadOrCreateAuditKey();
    this.initializeSequenceCounter();
  }

  public static getInstance(): AdvancedAuditService {
    if (!AdvancedAuditService.advancedInstance) {
      AdvancedAuditService.advancedInstance = new AdvancedAuditService();
    }
    return AdvancedAuditService.advancedInstance;
  }

  /**
   * Load the audit key from ENV, disk, or generate a new one the first time.
   * The key is written with mode 600 so only the running user can read it.
   * NOTE: In production you should replace this with a proper secrets
   * manager (AWS/GCP/Vault).  This implementation is a quick win to avoid
   * regenerating the key on every restart in dev / single-node deployments.
   */
  private loadOrCreateAuditKey(): string {
    // Priority 1 – Environment variable (e.g. from KMS / secrets manager)
    if (process.env.AUDIT_SIGNATURE_KEY && process.env.AUDIT_SIGNATURE_KEY.trim().length > 0) {
      return process.env.AUDIT_SIGNATURE_KEY.trim();
    }

    // Priority 2 – Local key file (useful for dev / Docker volume)
    const keyFilePath = path.resolve(process.cwd(), 'config', 'audit_key');
    try {
      if (fs.existsSync(keyFilePath)) {
        const keyFromFile = fs.readFileSync(keyFilePath, 'utf8').trim();
        if (keyFromFile.length >= 64) {
          return keyFromFile;
        }
        logger.warn('Audit key file found but contents look invalid, regenerating.');
      }
    } catch (fileErr) {
      logger.error('Error reading audit key file', fileErr);
    }

    // Priority 3 – Generate a new key and persist it
    const newKey = this.generateAuditKey();
    try {
      // Ensure directory exists
      fs.mkdirSync(path.dirname(keyFilePath), { recursive: true });
      fs.writeFileSync(keyFilePath, newKey, { mode: 0o600 });
      logger.info(`Persisted new audit signature key to ${keyFilePath}`);
    } catch (writeErr) {
      logger.error('Failed to persist audit key to disk. Consider setting AUDIT_SIGNATURE_KEY env var.', writeErr);
    }
    return newKey;
  }

  /**
   * Generate a secure audit key for digital signatures
   */
  private generateAuditKey(): string {
    const key = crypto.randomBytes(64).toString('hex');
    logger.warn('Generated new audit signature key. Store this securely!', { keyLength: key.length });
    return key;
  }

  /**
   * Initialize sequence counter from the latest log entry
   */
  private async initializeSequenceCounter(): Promise<void> {
    try {
      // Wait for MongoDB connection if not ready yet (0 = disconnected, 1 = connected)
      if (mongoose.connection.readyState !== 1) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('MongoDB connection timeout for sequence counter init')), 10000);
          mongoose.connection.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      // Use lean & projection for minimal overhead and force index via sort
      const lastLog = await AuditLog.findOne({}, { sequenceNumber: 1 }, { sort: { sequenceNumber: -1 }, lean: true }).hint({ sequenceNumber: -1 });
      this.sequenceCounter = (lastLog as any)?.sequenceNumber || 0;
    } catch (error) {
      logger.error('Failed to initialize sequence counter', error);
      this.sequenceCounter = 0;
    }
  }

  /**
   * Generate cryptographic hash for integrity verification
   */
  private generateIntegrityHash(entry: AuditLogEntry, sequenceNumber: number, previousHash?: string): string {
    const criticalFields = {
      timestamp: new Date().toISOString(),
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      sequenceNumber,
      previousHash: previousHash || ''
    };

    const dataString = JSON.stringify(criticalFields, Object.keys(criticalFields).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Generate digital signature for non-repudiation
   */
  private generateDigitalSignature(integrityHash: string): string {
    return crypto.createHmac('sha256', this.auditKey).update(integrityHash).digest('hex');
  }

  /**
   * Calculate anomaly score based on user behavior
   */
  private async calculateAnomalyScore(entry: AuditLogEntry): Promise<number> {
    if (!entry.userId) return 0;

    const baseline = this.behavioralBaselines.get(entry.userId);
    if (!baseline) {
      // No baseline yet, consider it normal
      return 10; // Low anomaly score
    }

    let anomalyScore = 0;
    const currentHour = new Date().getHours();

    // Check time anomaly
    if (currentHour < baseline.normalHours[0] || currentHour > baseline.normalHours[1]) {
      anomalyScore += 25;
    }

    // Check action anomaly
    if (!baseline.typicalActions.includes(entry.action)) {
      anomalyScore += 20;
    }

    // Check high-risk actions
    if (['DELETE', 'ADMIN_ACCESS', 'PERMISSION_CHANGE'].includes(entry.action)) {
      anomalyScore += 15;
    }

    // Check PHI access outside normal patterns
    if (entry.phiAccessed && !baseline.typicalActions.includes('PHI_ACCESS')) {
      anomalyScore += 30;
    }

    return Math.min(anomalyScore, 100);
  }

  /**
   * Calculate risk score based on multiple factors
   */
  private calculateRiskScore(entry: AuditLogEntry, anomalyScore: number): number {
    let riskScore = 0;

    // Base risk by event type
    switch (entry.eventType) {
      case 'security_event': riskScore += 40; break;
      case 'admin_action': riskScore += 30; break;
      case 'data_access': riskScore += 20; break;
      case 'user_action': riskScore += 10; break;
      default: riskScore += 5;
    }

    // Risk by data classification
    switch (entry.dataClassification) {
      case 'restricted': riskScore += 25; break;
      case 'confidential': riskScore += 15; break;
      case 'internal': riskScore += 5; break;
      default: riskScore += 0;
    }

    // PHI access risk
    if (entry.phiAccessed) {
      riskScore += 20;
    }

    // Failed actions are riskier
    if (entry.statusCode && entry.statusCode >= 400) {
      riskScore += 15;
    }

    // Add anomaly score
    riskScore += anomalyScore * 0.3;

    return Math.min(riskScore, 100);
  }

  /**
   * Detect threat indicators
   */
  private detectThreatIndicators(entry: AuditLogEntry): string[] {
    const indicators: string[] = [];

    // Multiple failed login attempts
    if (entry.action === 'LOGIN_FAILED') {
      indicators.push('FAILED_LOGIN_ATTEMPT');
    }

    // Admin access from unusual IP
    if (entry.action === 'ADMIN_ACCESS' && entry.eventType === 'admin_action') {
      indicators.push('ADMIN_ACCESS_DETECTED');
    }

    // Bulk data access
    if (entry.action === 'READ' && entry.resource === 'bulk_data') {
      indicators.push('BULK_DATA_ACCESS');
    }

    // PHI access outside business hours
    const currentHour = new Date().getHours();
    if (entry.phiAccessed && (currentHour < 6 || currentHour > 22)) {
      indicators.push('PHI_ACCESS_UNUSUAL_TIME');
    }

    // Privilege escalation attempts
    if (entry.action === 'PERMISSION_CHANGE') {
      indicators.push('PRIVILEGE_ESCALATION_ATTEMPT');
    }

    // Data export activities
    if (entry.action === 'EXPORT' || entry.action === 'DATA_EXPORT') {
      indicators.push('DATA_EXPORT_ACTIVITY');
    }

    return indicators;
  }

  /**
   * Enhanced audit log creation with tamper-proof features
   */
  async createAdvancedAuditLog(entry: AuditLogEntry): Promise<IAuditLog> {
    try {
      // Get the last log entry for hash chaining
      const lastLog = await AuditLog.findOne({}, {}, { sort: { sequenceNumber: -1 } });
      const previousHash = lastLog?.integrityHash;

      // Increment sequence number
      this.sequenceCounter++;
      const sequenceNumber = this.sequenceCounter;

      // Calculate analytics
      const anomalyScore = await this.calculateAnomalyScore(entry);
      const riskScore = this.calculateRiskScore(entry, anomalyScore);
      const threatIndicators = this.detectThreatIndicators(entry);

      // Generate integrity hash and digital signature
      const integrityHash = this.generateIntegrityHash(entry, sequenceNumber, previousHash);
      const digitalSignature = this.generateDigitalSignature(integrityHash);

      // Create enhanced audit log
      const enhancedEntry = {
        ...entry,
        sequenceNumber,
        integrityHash,
        previousLogHash: previousHash,
        digitalSignature,
        anomalyScore,
        riskScore,
        threatIndicators,
        escalationLevel: riskScore > 80 ? 3 : riskScore > 60 ? 2 : riskScore > 40 ? 1 : 0,
        serverInstance: process.env.SERVER_INSTANCE || 'default',
        applicationVersion: process.env.npm_package_version || '1.0.0'
      };

      const auditLog = new AuditLog({
        timestamp: new Date(),
        ...enhancedEntry
      });

      const savedLog = await auditLog.save();

      // Alert on high-risk events
      if (riskScore > 70 || anomalyScore > 80 || threatIndicators.length > 0) {
        await this.triggerSecurityAlert(savedLog);
      }

      // Update behavioral baseline
      if (entry.userId) {
        await this.updateBehavioralBaseline(entry.userId, entry);
      }

      logger.info('Advanced audit log created', {
        auditLogId: savedLog._id,
        sequenceNumber,
        riskScore,
        anomalyScore,
        threatIndicators: threatIndicators.length
      });

      return savedLog;
    } catch (error) {
      logger.error('Failed to create advanced audit log', error);
      throw new Error('Failed to create advanced audit log');
    }
  }

  /**
   * Verify audit log chain integrity
   */
  async verifyLogIntegrity(startSequence?: number, endSequence?: number): Promise<IntegrityCheckResult> {
    logger.warn('Audit log integrity verification is a placeholder. Implement with Supabase.');
    return {
      isValid: false,
      issues: ['Integrity verification not implemented for Supabase'],
      lastValidSequence: 0,
      brokenChainAt: 0
    };
  }

  /**
   * Trigger security alert for high-risk events
   */
  private async triggerSecurityAlert(auditLog: IAuditLog): Promise<void> {
    try {
      const alertData = {
        type: 'SECURITY_ALERT',
        severity: auditLog.escalationLevel! > 2 ? 'HIGH' : 'MEDIUM',
        auditLogId: auditLog._id,
        userId: auditLog.userId,
        action: auditLog.action,
        resource: auditLog.resource,
        riskScore: auditLog.riskScore,
        anomalyScore: auditLog.anomalyScore,
        threatIndicators: auditLog.threatIndicators,
        timestamp: auditLog.timestamp,
        ipAddress: auditLog.ipAddress
      };

      // Log the alert
      logger.warn('Security alert triggered', alertData);

      // Here you could integrate with external alerting systems
      // await notificationService.sendSecurityAlert(alertData);
      // await slackService.postSecurityAlert(alertData);
      // await emailService.sendSecurityAlert(alertData);

    } catch (error) {
      logger.error('Failed to trigger security alert', error);
    }
  }

  /**
   * Update behavioral baseline for a user
   */
  private async updateBehavioralBaseline(userId: string, entry: AuditLogEntry): Promise<void> {
    try {
      const existing = this.behavioralBaselines.get(userId);
      const currentHour = new Date().getHours();

      if (!existing) {
        // Create new baseline
        this.behavioralBaselines.set(userId, {
          userId,
          normalHours: [Math.max(6, currentHour - 1), Math.min(22, currentHour + 1)],
          normalLocations: entry.ipAddress ? [entry.ipAddress] : [],
          typicalActions: [entry.action],
          avgSessionDuration: 30, // Default 30 minutes
          avgRequestsPerSession: 10 // Default 10 requests
        });
      } else {
        // Update existing baseline
        if (!existing.typicalActions.includes(entry.action)) {
          existing.typicalActions.push(entry.action);
          // Keep only top 10 most common actions
          if (existing.typicalActions.length > 10) {
            existing.typicalActions = existing.typicalActions.slice(-10);
          }
        }

        // Update normal hours range
        if (currentHour < existing.normalHours[0]) {
          existing.normalHours[0] = Math.max(0, currentHour);
        }
        if (currentHour > existing.normalHours[1]) {
          existing.normalHours[1] = Math.min(23, currentHour);
        }

        // Update normal locations
        if (entry.ipAddress && !existing.normalLocations.includes(entry.ipAddress)) {
          existing.normalLocations.push(entry.ipAddress);
          // Keep only top 5 most common locations
          if (existing.normalLocations.length > 5) {
            existing.normalLocations = existing.normalLocations.slice(-5);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to update behavioral baseline', error);
    }
  }

  /**
   * Get integrity report for compliance
   */
  async getIntegrityReport(days: number = 30): Promise<{
    totalLogs: number;
    integrityChecks: IntegrityCheckResult;
    highRiskEvents: number;
    anomalousEvents: number;
    threatIndicatorSummary: Record<string, number>;
  }> {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

      const [totalLogs, highRiskEvents, anomalousEvents, threatLogs] = await Promise.all([
        AuditLog.countDocuments({ timestamp: { $gte: startDate } }),
        AuditLog.countDocuments({ 
          timestamp: { $gte: startDate },
          riskScore: { $gte: 70 }
        }),
        AuditLog.countDocuments({ 
          timestamp: { $gte: startDate },
          anomalyScore: { $gte: 80 }
        }),
        AuditLog.find({ 
          timestamp: { $gte: startDate },
          threatIndicators: { $exists: true, $ne: [] }
        }).select('threatIndicators')
      ]);

      // Aggregate threat indicators
      const threatIndicatorSummary: Record<string, number> = {};
      threatLogs.forEach(log => {
        log.threatIndicators?.forEach(indicator => {
          threatIndicatorSummary[indicator] = (threatIndicatorSummary[indicator] || 0) + 1;
        });
      });

      const integrityChecks = await this.verifyLogIntegrity();

      return {
        totalLogs,
        integrityChecks,
        highRiskEvents,
        anomalousEvents,
        threatIndicatorSummary
      };
    } catch (error) {
      logger.error('Failed to generate integrity report', error);
      throw error;
    }
  }
} 