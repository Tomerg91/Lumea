import { Router } from 'express';
import { HIPAAComplianceController } from '../controllers/hipaaComplianceController';
import { isAuthenticated, isCoach } from '../middleware/auth';

const router = Router();

/**
 * GET /api/compliance/status
 * Get current compliance status summary
 * Requires authentication (coaches and admins only)
 */
router.get('/status', isAuthenticated, isCoach, HIPAAComplianceController.getComplianceStatus);

/**
 * GET /api/compliance/dashboard
 * Get comprehensive compliance dashboard
 * Requires authentication (coaches and admins only)
 */
router.get('/dashboard', isAuthenticated, isCoach, HIPAAComplianceController.getComplianceDashboard);

/**
 * GET /api/compliance/report
 * Generate and download full compliance report
 * Requires authentication (coaches and admins only)
 */
router.get('/report', isAuthenticated, isCoach, HIPAAComplianceController.generateComplianceReport);

export default router; 