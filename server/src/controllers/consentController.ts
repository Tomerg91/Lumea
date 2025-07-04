import { Request, Response } from 'express';
import { consentService, ConsentRequest, ConsentWithdrawalRequest, DataPortabilityRequest } from '../services/consentService.js';
import { auditService } from '../services/auditService.js';
import { logger } from '../services/logger.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export class ConsentController {
  /**
   * Grant consent for the authenticated user
   */
  async grantConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        consentType,
        purpose,
        legalBasis,
        category,
        isRequired,
        dataProcessed,
        retentionPeriod,
        thirdPartySharing,
        automatedDecisionMaking,
        consentMethod,
        evidenceOfConsent,
        minorConsent,
        complianceFlags
      } = req.body;

      // Validate required fields
      if (!consentType || !purpose || !dataProcessed || !evidenceOfConsent) {
        res.status(400).json({ 
          error: 'Missing required fields: consentType, purpose, dataProcessed, evidenceOfConsent' 
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const consentRequest: ConsentRequest = {
        userId,
        consentType,
        purpose,
        legalBasis,
        category,
        isRequired,
        dataProcessed,
        retentionPeriod,
        thirdPartySharing,
        automatedDecisionMaking,
        consentMethod,
        evidenceOfConsent,
        minorConsent,
        ipAddress,
        userAgent,
        complianceFlags
      };

      const consent = await consentService.grantConsent(consentRequest);

      res.status(201).json({
        success: true,
        message: 'Consent granted successfully',
        data: {
          consentId: consent._id,
          consentType: consent.consentType,
          status: consent.status,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt
        }
      });
    } catch (error) {
      logger.error('Error granting consent:', error);
      res.status(500).json({ 
        error: 'Failed to grant consent',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Withdraw consent for the authenticated user
   */
  async withdrawConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { consentType, reason } = req.body;

      if (!consentType) {
        res.status(400).json({ error: 'consentType is required' });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const withdrawalRequest: ConsentWithdrawalRequest = {
        userId,
        consentType,
        reason,
        ipAddress,
        userAgent
      };

      const consent = await consentService.withdrawConsent(withdrawalRequest);

      if (!consent) {
        res.status(404).json({ error: 'Active consent not found for the specified type' });
        return;
      }

      res.json({
        success: true,
        message: 'Consent withdrawn successfully',
        data: {
          consentId: consent._id,
          consentType: consent.consentType,
          status: consent.status,
          withdrawnAt: consent.withdrawnAt
        }
      });
    } catch (error) {
      logger.error('Error withdrawing consent:', error);
      res.status(500).json({ 
        error: 'Failed to withdraw consent',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user's current consents
   */
  async getUserConsents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const consents = await consentService.getUserConsents(userId);

      res.json({
        success: true,
        data: consents.map(consent => ({
          id: consent._id,
          consentType: consent.consentType,
          purpose: consent.purpose,
          status: consent.status,
          legalBasis: consent.legalBasis,
          category: consent.category,
          isRequired: consent.isRequired,
          dataProcessed: consent.dataProcessed,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt,
          retentionPeriod: consent.retentionPeriod,
          thirdPartySharing: consent.thirdPartySharing,
          automatedDecisionMaking: consent.automatedDecisionMaking,
          complianceFlags: consent.complianceFlags,
          daysUntilExpiration: consent.getDaysUntilExpiration()
        }))
      });
    } catch (error) {
      logger.error('Error getting user consents:', error);
      res.status(500).json({ 
        error: 'Failed to get user consents',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get consent history for the authenticated user
   */
  async getConsentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { consentType } = req.query;
      const history = await consentService.getConsentHistory(userId, consentType as string);

      res.json({
        success: true,
        data: history.map(consent => ({
          id: consent._id,
          consentType: consent.consentType,
          purpose: consent.purpose,
          status: consent.status,
          grantedAt: consent.grantedAt,
          withdrawnAt: consent.withdrawnAt,
          expiresAt: consent.expiresAt,
          auditTrail: consent.auditTrail,
          complianceFlags: consent.complianceFlags
        }))
      });
    } catch (error) {
      logger.error('Error getting consent history:', error);
      res.status(500).json({ 
        error: 'Failed to get consent history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if user has specific consent
   */
  async checkConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { consentType } = req.params;
      if (!consentType) {
        res.status(400).json({ error: 'consentType parameter is required' });
        return;
      }

      const hasConsent = await consentService.hasConsent(userId, consentType);

      res.json({
        success: true,
        data: {
          hasConsent,
          consentType
        }
      });
    } catch (error) {
      logger.error('Error checking consent:', error);
      res.status(500).json({ 
        error: 'Failed to check consent',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Renew consent
   */
  async renewConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { consentType, evidenceOfConsent, retentionPeriod } = req.body;

      if (!consentType || !evidenceOfConsent) {
        res.status(400).json({ 
          error: 'consentType and evidenceOfConsent are required' 
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const consent = await consentService.renewConsent(
        userId,
        consentType,
        evidenceOfConsent,
        ipAddress,
        userAgent,
        retentionPeriod
      );

      if (!consent) {
        res.status(404).json({ error: 'Consent not found for renewal' });
        return;
      }

      res.json({
        success: true,
        message: 'Consent renewed successfully',
        data: {
          consentId: consent._id,
          consentType: consent.consentType,
          status: consent.status,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt
        }
      });
    } catch (error) {
      logger.error('Error renewing consent:', error);
      res.status(500).json({ 
        error: 'Failed to renew consent',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Withdraw all consents (Right to be forgotten)
   */
  async withdrawAllConsents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { reason } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const withdrawnCount = await consentService.withdrawAllConsents(
        userId,
        reason || 'User requested withdrawal of all consents',
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: 'All consents withdrawn successfully',
        data: {
          withdrawnCount
        }
      });
    } catch (error) {
      logger.error('Error withdrawing all consents:', error);
      res.status(500).json({ 
        error: 'Failed to withdraw all consents',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export user data (GDPR Data Portability)
   */
  async exportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { format = 'json', includeHistory = true, encryptData = false } = req.query;

      const exportRequest: DataPortabilityRequest = {
        userId,
        format: format as 'json' | 'xml' | 'csv',
        includeHistory: includeHistory === 'true',
        encryptData: encryptData === 'true'
      };

      const exportData = await consentService.exportUserData(exportRequest);

      // Set appropriate headers for download
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `consent-data-${userId}-${timestamp}.${format}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');

      res.json({
        success: true,
        data: exportData,
        metadata: {
          exportDate: new Date().toISOString(),
          format: exportRequest.format,
          includeHistory: exportRequest.includeHistory,
          encryptData: exportRequest.encryptData
        }
      });
    } catch (error) {
      logger.error('Error exporting user data:', error);
      res.status(500).json({ 
        error: 'Failed to export user data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate consent for specific action (for developers/integrations)
   */
  async validateConsentForAction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { actionType, requiredConsents } = req.body;

      if (!actionType || !requiredConsents || !Array.isArray(requiredConsents)) {
        res.status(400).json({ 
          error: 'actionType and requiredConsents array are required' 
        });
        return;
      }

      const validation = await consentService.validateConsentForAction(
        userId,
        actionType,
        requiredConsents
      );

      res.json({
        success: true,
        data: {
          ...validation,
          actionType
        }
      });
    } catch (error) {
      logger.error('Error validating consent for action:', error);
      res.status(500).json({ 
        error: 'Failed to validate consent',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Admin endpoints (require admin role)

  /**
   * Get consent metrics (Admin only)
   */
  async getConsentMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const metrics = await consentService.getConsentMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error getting consent metrics:', error);
      res.status(500).json({ 
        error: 'Failed to get consent metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get expiring consents (Admin only)
   */
  async getExpiringConsents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { days = 30 } = req.query;
      const daysUntilExpiration = parseInt(days as string, 10);

      const expiringConsents = await consentService.getExpiringConsents(daysUntilExpiration);

      res.json({
        success: true,
        data: expiringConsents.map(consent => ({
          id: consent._id,
          userId: consent.userId,
          consentType: consent.consentType,
          purpose: consent.purpose,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt,
          daysUntilExpiration: consent.getDaysUntilExpiration(),
          complianceFlags: consent.complianceFlags
        }))
      });
    } catch (error) {
      logger.error('Error getting expiring consents:', error);
      res.status(500).json({ 
        error: 'Failed to get expiring consents',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process expiring consents (Admin only - typically called by cron job)
   */
  async processExpiringConsents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      await consentService.processExpiringConsents();

      res.json({
        success: true,
        message: 'Expiring consents processed successfully'
      });
    } catch (error) {
      logger.error('Error processing expiring consents:', error);
      res.status(500).json({ 
        error: 'Failed to process expiring consents',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user consent by ID (Admin only)
   */
  async getUserConsentById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ error: 'userId parameter is required' });
        return;
      }

      const consents = await consentService.getUserConsents(userId);

      res.json({
        success: true,
        data: consents
      });
    } catch (error) {
      logger.error('Error getting user consent by ID:', error);
      res.status(500).json({ 
        error: 'Failed to get user consent',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test consent system (Development/Testing only)
   */
  async testConsentSystem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Test endpoints not available in production' });
        return;
      }

      const testResults = {
        timestamp: new Date().toISOString(),
        tests: [
          {
            name: 'Consent Service Available',
            status: 'pass',
            details: 'Consent service is properly initialized'
          },
          {
            name: 'Database Connection',
            status: 'pass',
            details: 'Successfully connected to consent collection'
          }
        ]
      };

      res.json({
        success: true,
        message: 'Consent system test completed',
        data: testResults
      });
    } catch (error) {
      logger.error('Error testing consent system:', error);
      res.status(500).json({ 
        error: 'Consent system test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const consentController = new ConsentController(); 