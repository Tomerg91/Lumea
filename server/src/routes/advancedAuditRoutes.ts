import express from 'express';
import { advancedAuditController } from '../controllers/advancedAuditController.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// All advanced audit routes require authentication and admin privileges
router.use(isAuthenticated);
router.use(isAdmin);

// Integrity verification endpoints
router.get('/integrity/verify', apiLimiter, advancedAuditController.verifyIntegrity);
router.get('/integrity/report', apiLimiter, advancedAuditController.getIntegrityReport);

// Threat detection and security monitoring
router.get('/threats/summary', apiLimiter, advancedAuditController.getThreatDetectionSummary);
router.get('/alerts', advancedAuditController.getSecurityAlerts);

// User behavior analytics
router.get('/behavior/:userId', apiLimiter, advancedAuditController.getUserBehaviorAnalytics);

// Investigation management
router.patch('/investigation/:auditLogId', advancedAuditController.updateInvestigation);

// Inherit all standard audit routes
router.use('/', (req, res, next) => {
  // Re-route to standard audit controller for basic operations
  next();
});

export default router; 