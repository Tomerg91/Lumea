import { Request, Response } from 'express';
import { encryptionService } from '../services/encryptionService';
import { EncryptionKeyMetadata } from '../models/EncryptionKey';
import { auditService } from '../services/auditService';

export class EncryptionController {
  /**
   * Get encryption metrics and statistics
   */
  public static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = encryptionService.getMetrics();
      const keyUsageStats = await EncryptionKeyMetadata.getKeyUsageStats();
      
      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_metrics_accessed',
        riskLevel: 'low',
        details: { metricsAccessed: true }
      });

      res.json({
        success: true,
        data: {
          ...metrics,
          keyUsageStats
        }
      });
    } catch (error) {
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_metrics_access_failed',
        riskLevel: 'medium',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve encryption metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get information about encryption keys
   */
  public static async getKeyInfo(req: Request, res: Response): Promise<void> {
    try {
      const { purpose } = req.query;
      
      const keys = encryptionService.getKeyInfo(purpose as any);
      const keyMetadata = await EncryptionKeyMetadata.find(
        purpose ? { purpose } : {}
      ).sort({ createdAt: -1 });

      // Map keys with metadata
      const enrichedKeys = keys.map(key => {
        const metadata = keyMetadata.find(m => m.keyId === key.id);
        return {
          id: key.id,
          version: key.version,
          purpose: key.purpose,
          algorithm: key.algorithm,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          isActive: key.isActive,
          usageCount: metadata?.usageCount || 0,
          lastUsedAt: metadata?.lastUsedAt,
          daysUntilExpiration: metadata?.daysUntilExpiration() || null
        };
      });

      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_keys_accessed',
        riskLevel: 'medium',
        details: { 
          purpose,
          keyCount: enrichedKeys.length
        }
      });

      res.json({
        success: true,
        data: {
          keys: enrichedKeys,
          totalKeys: enrichedKeys.length,
          activeKeys: enrichedKeys.filter(k => k.isActive).length
        }
      });
    } catch (error) {
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_keys_access_failed',
        riskLevel: 'high',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve key information',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Rotate encryption key for a specific purpose
   */
  public static async rotateKey(req: Request, res: Response): Promise<void> {
    try {
      const { purpose } = req.params;
      const { force = false, reason } = req.body;
      const userId = req.user?.id;

      if (!['data', 'backup', 'transit'].includes(purpose)) {
        return void res.status(400).json({
          success: false,
          message: 'Invalid purpose. Must be one of: data, backup, transit'
        });
      }

      const newKey = await encryptionService.rotateKey(purpose as any, force);

      // Update metadata for old key
      const oldKeyId = encryptionService.getActiveKeyId(purpose as any);
      if (oldKeyId && oldKeyId !== newKey.id) {
        const oldKeyMetadata = await EncryptionKeyMetadata.findOne({ keyId: oldKeyId });
        if (oldKeyMetadata) {
          await oldKeyMetadata.deactivate(reason, userId);
        }
      }

      // Create metadata for new key
      const newKeyMetadata = new EncryptionKeyMetadata({
        keyId: newKey.id,
        version: newKey.version,
        purpose: newKey.purpose,
        algorithm: newKey.algorithm,
        createdAt: newKey.createdAt,
        expiresAt: newKey.expiresAt,
        isActive: newKey.isActive,
        approvedBy: userId
      });

      await newKeyMetadata.save();
      await newKeyMetadata.addAuditEntry('rotated', userId, reason);

      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_key_rotated',
        riskLevel: 'high',
        details: {
          purpose,
          newKeyId: newKey.id,
          oldKeyId,
          force,
          reason
        }
      });

      res.json({
        success: true,
        message: `Successfully rotated ${purpose} encryption key`,
        data: {
          keyId: newKey.id,
          purpose: newKey.purpose,
          createdAt: newKey.createdAt,
          expiresAt: newKey.expiresAt
        }
      });
    } catch (error) {
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_key_rotation_failed',
        riskLevel: 'high',
        details: { 
          purpose: req.params.purpose,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      res.status(500).json({
        success: false,
        message: 'Failed to rotate encryption key',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get keys nearing expiration
   */
  public static async getKeysNearingExpiration(req: Request, res: Response): Promise<void> {
    try {
      const { days = 7 } = req.query;
      const daysNumber = parseInt(days as string, 10);

      const keys = await EncryptionKeyMetadata.findKeysNearingExpiration(daysNumber);

      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_expiration_check',
        riskLevel: 'low',
        details: { 
          days: daysNumber,
          expiringKeysCount: keys.length
        }
      });

      res.json({
        success: true,
        data: {
          keys: keys.map(key => ({
            keyId: key.keyId,
            purpose: key.purpose,
            expiresAt: key.expiresAt,
            daysUntilExpiration: key.daysUntilExpiration(),
            isActive: key.isActive
          })),
          count: keys.length,
          checkPeriod: daysNumber
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to check key expiration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get rotation policies
   */
  public static async getRotationPolicies(req: Request, res: Response): Promise<void> {
    try {
      const policies = encryptionService.getRotationPolicies();

      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_policies_accessed',
        riskLevel: 'medium',
        details: { policiesCount: policies.length }
      });

      res.json({
        success: true,
        data: policies
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve rotation policies',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update rotation policy
   */
  public static async updateRotationPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { purpose } = req.params;
      const policyData = req.body;
      const userId = req.user?.id;

      if (!['data', 'backup', 'transit'].includes(purpose)) {
        return void res.status(400).json({
          success: false,
          message: 'Invalid purpose. Must be one of: data, backup, transit'
        });
      }

      const policy = {
        id: `${purpose}-policy`,
        purpose: purpose as 'data' | 'backup' | 'transit',
        ...policyData
      };

      encryptionService.updateRotationPolicy(policy);

      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_policy_updated',
        riskLevel: 'high',
        details: {
          purpose,
          policy: policyData,
          updatedBy: userId
        }
      });

      res.json({
        success: true,
        message: `Successfully updated ${purpose} rotation policy`,
        data: policy
      });
    } catch (error) {
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_policy_update_failed',
        riskLevel: 'high',
        details: { 
          purpose: req.params.purpose,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update rotation policy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export encryption key (password protected)
   */
  public static async exportKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const { password } = req.body;
      const userId = req.user?.id;

      if (!password || password.length < 12) {
        return void res.status(400).json({
          success: false,
          message: 'Password must be at least 12 characters long'
        });
      }

      const exportedKey = await encryptionService.exportKey(keyId, password);

      // Update metadata
      const keyMetadata = await EncryptionKeyMetadata.findOne({ keyId });
      if (keyMetadata) {
        await keyMetadata.addAuditEntry('exported', userId, 'Key exported for backup');
      }

      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_key_exported',
        riskLevel: 'critical',
        details: {
          keyId,
          exportedBy: userId
        }
      });

      res.json({
        success: true,
        message: 'Key exported successfully',
        data: {
          encryptedKey: exportedKey,
          keyId
        }
      });
    } catch (error) {
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_key_export_failed',
        riskLevel: 'high',
        details: { 
          keyId: req.params.keyId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      res.status(500).json({
        success: false,
        message: 'Failed to export key',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Import encryption key (password protected)
   */
  public static async importKey(req: Request, res: Response): Promise<void> {
    try {
      const { encryptedKeyData, password } = req.body;
      const userId = req.user?.id;

      if (!encryptedKeyData || !password) {
        return void res.status(400).json({
          success: false,
          message: 'Encrypted key data and password are required'
        });
      }

      await encryptionService.importKey(encryptedKeyData, password);

      // Extract key ID from encrypted data to log it
      const keyData = JSON.parse(encryptedKeyData);
      const keyId = keyData.keyId;

      // Create metadata entry
      const keyMetadata = new EncryptionKeyMetadata({
        keyId,
        version: 1,
        purpose: 'data', // Default, can be updated
        algorithm: 'aes-256-gcm',
        isActive: false, // Imported keys start inactive
        approvedBy: userId
      });

      await keyMetadata.save();
      await keyMetadata.addAuditEntry('imported', userId, 'Key imported from backup');

      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_key_imported',
        riskLevel: 'critical',
        details: {
          keyId,
          importedBy: userId
        }
      });

      res.json({
        success: true,
        message: 'Key imported successfully',
        data: {
          keyId,
          isActive: false
        }
      });
    } catch (error) {
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_key_import_failed',
        riskLevel: 'high',
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      res.status(500).json({
        success: false,
        message: 'Failed to import key',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test encryption/decryption functionality
   */
  public static async testEncryption(req: Request, res: Response): Promise<void> {
    try {
      const { testData = 'HIPAA Test Data', purpose = 'data' } = req.body;
      const userId = req.user?.id;

      // Encrypt test data
      const encrypted = await encryptionService.encryptData(testData, purpose as any);
      
      // Decrypt test data
      const decrypted = await encryptionService.decryptData(encrypted);

      const testPassed = decrypted === testData;

      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_test_performed',
        riskLevel: 'medium',
        details: {
          purpose,
          testPassed,
          testedBy: userId
        }
      });

      res.json({
        success: testPassed,
        message: testPassed ? 'Encryption test passed' : 'Encryption test failed',
        data: {
          testPassed,
          originalData: testData,
          encryptedData: encrypted.data.substring(0, 50) + '...', // Show partial for verification
          decryptedData: decrypted,
          keyId: encrypted.keyId,
          algorithm: encrypted.algorithm
        }
      });
    } catch (error) {
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_test_failed',
        riskLevel: 'high',
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      res.status(500).json({
        success: false,
        message: 'Encryption test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cleanup expired keys
   */
  public static async cleanupExpiredKeys(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      const cleanedCount = await encryptionService.cleanupExpiredKeys();

      // Also cleanup database metadata
      const expiredMetadata = await EncryptionKeyMetadata.findExpiredKeys();
      for (const metadata of expiredMetadata) {
        await metadata.addAuditEntry('expired', userId, 'Automatic cleanup of expired key');
        metadata.isActive = false;
        await metadata.save();
      }

      // Log audit event
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_keys_cleaned',
        riskLevel: 'medium',
        details: {
          cleanedCount,
          cleanedBy: userId
        }
      });

      res.json({
        success: true,
        message: `Successfully cleaned up ${cleanedCount} expired keys`,
        data: {
          cleanedCount
        }
      });
    } catch (error) {
      await auditService.logSecurityEvent(req, {
        eventType: 'encryption_cleanup_failed',
        riskLevel: 'medium',
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      res.status(500).json({
        success: false,
        message: 'Failed to cleanup expired keys',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
} 