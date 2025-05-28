import { Router } from 'express';
import { HIPAAComplianceController } from '../controllers/hipaaComplianceController.js';
import { isAuthenticated, isCoach } from '../middleware/auth.js';

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