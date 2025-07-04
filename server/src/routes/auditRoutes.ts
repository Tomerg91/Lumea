import express from 'express';
import { auditController } from '../controllers/auditController';
import { isAuthenticated, isCoach } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

const router = express.Router();

// All audit routes require authentication and coach/admin privileges
router.use(isAuthenticated);
router.use(isCoach);
router.use(apiLimiter);

// Get audit logs with filtering and pagination
router.get('/logs', auditController.getAuditLogs);

// Get audit statistics for dashboard
router.get('/statistics', auditController.getAuditStatistics);

// Get audit logs for a specific user
router.get('/user/:userId', auditController.getUserAuditLogs);

// Get PHI access logs
router.get('/phi-access', auditController.getPHIAccessLogs);

// Get suspicious activity logs
router.get('/suspicious', auditController.getSuspiciousActivity);

// Mark audit log as suspicious
router.patch('/:auditLogId/suspicious', auditController.markSuspicious);

// Update investigation status
router.patch('/:auditLogId/investigation', auditController.updateInvestigationStatus);

// Export audit logs (for compliance reporting)
router.get('/export', auditController.exportAuditLogs);

// Clean up expired logs (admin only)
router.delete('/cleanup', auditController.cleanupExpiredLogs);

export default router; 