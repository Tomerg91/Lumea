import express from 'express';
import { param, query } from 'express-validator';
import SecurityMonitoringController from '../controllers/securityMonitoringController';
import { isAuthenticated, hasRole } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const securityMonitoringController = new SecurityMonitoringController();

// Rate limiting for security monitoring operations
const securityMonitoringLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many security monitoring requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and authentication to all routes
router.use(securityMonitoringLimiter);
router.use(isAuthenticated);
router.use(hasRole('admin', 'security_officer', 'data_protection_officer'));

/**
 * @route GET /api/security-monitoring/metrics
 * @desc Get real-time security metrics for the dashboard
 * @access Admin, Security Officer, DPO
 */
router.get('/metrics', securityMonitoringController.getSecurityMetrics);

/**
 * @route GET /api/security-monitoring/alerts
 * @desc Get security alerts with optional filtering
 * @access Admin, Security Officer, DPO
 */
router.get('/alerts', [
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('type').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], securityMonitoringController.getSecurityAlerts);

/**
 * @route GET /api/security-monitoring/threats/summary
 * @desc Get threat detection summary and analytics
 * @access Admin, Security Officer, DPO
 */
router.get('/threats/summary', securityMonitoringController.getThreatDetectionSummary);

/**
 * @route GET /api/security-monitoring/compliance/status
 * @desc Get compliance status and metrics
 * @access Admin, Security Officer, DPO
 */
router.get('/compliance/status', securityMonitoringController.getComplianceStatus);

/**
 * @route GET /api/security-monitoring/reports/security
 * @desc Generate security report for specified time period
 * @access Admin, Security Officer, DPO
 */
router.get('/reports/security', [
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate()
], securityMonitoringController.getSecurityReport);

/**
 * @route GET /api/security-monitoring/system/health
 * @desc Get system health metrics
 * @access Admin, Security Officer, DPO
 */
router.get('/system/health', securityMonitoringController.getSystemHealth);

/**
 * @route PUT /api/security-monitoring/alerts/:alertId/status
 * @desc Update alert status (resolve, investigate, etc.)
 * @access Admin, Security Officer, DPO
 */
router.put('/alerts/:alertId/status', [
  param('alertId').isString().notEmpty(),
  query('status').isIn(['open', 'investigating', 'resolved', 'false_positive']),
  query('notes').optional().isString()
], securityMonitoringController.updateAlertStatus);

export default router; 