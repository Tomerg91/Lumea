import { Router } from 'express';
import { consentController } from '../controllers/consentController';
import { authenticate } from '../middleware/auth';
import { auditMiddleware } from '../middleware/auditMiddleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for consent operations
const consentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many consent requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// More restrictive rate limit for sensitive operations
const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many sensitive consent operations, please try again later',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication and audit logging to all routes
router.use(authenticate);
router.use(auditMiddleware);

// User consent management endpoints

/**
 * @route POST /api/consent/grant
 * @desc Grant consent for the authenticated user
 * @access Private
 */
router.post('/grant', 
  consentRateLimit,
  consentController.grantConsent
);

/**
 * @route POST /api/consent/withdraw
 * @desc Withdraw specific consent for the authenticated user
 * @access Private
 */
router.post('/withdraw', 
  consentRateLimit,
  consentController.withdrawConsent
);

/**
 * @route GET /api/consent/my-consents
 * @desc Get current user's active consents
 * @access Private
 */
router.get('/my-consents', 
  consentRateLimit,
  consentController.getUserConsents
);

/**
 * @route GET /api/consent/history
 * @desc Get consent history for the authenticated user
 * @access Private
 */
router.get('/history', 
  consentRateLimit,
  consentController.getConsentHistory
);

/**
 * @route GET /api/consent/check/:consentType
 * @desc Check if user has specific consent
 * @access Private
 */
router.get('/check/:consentType', 
  consentRateLimit,
  consentController.checkConsent
);

/**
 * @route POST /api/consent/renew
 * @desc Renew existing consent
 * @access Private
 */
router.post('/renew', 
  consentRateLimit,
  consentController.renewConsent
);

/**
 * @route POST /api/consent/validate
 * @desc Validate consent requirements for an action
 * @access Private
 */
router.post('/validate', 
  consentRateLimit,
  consentController.validateConsentForAction
);

// Sensitive operations with stricter rate limiting

/**
 * @route POST /api/consent/withdraw-all
 * @desc Withdraw all consents (Right to be forgotten)
 * @access Private
 */
router.post('/withdraw-all', 
  sensitiveRateLimit,
  consentController.withdrawAllConsents
);

/**
 * @route GET /api/consent/export
 * @desc Export user data for GDPR compliance
 * @access Private
 */
router.get('/export', 
  sensitiveRateLimit,
  consentController.exportUserData
);

// Admin endpoints (require admin role)

/**
 * @route GET /api/consent/admin/metrics
 * @desc Get consent metrics for dashboard
 * @access Admin
 */
router.get('/admin/metrics', 
  consentRateLimit,
  consentController.getConsentMetrics
);

/**
 * @route GET /api/consent/admin/expiring
 * @desc Get expiring consents
 * @access Admin
 */
router.get('/admin/expiring', 
  consentRateLimit,
  consentController.getExpiringConsents
);

/**
 * @route POST /api/consent/admin/process-expiring
 * @desc Process expiring consents (typically called by cron job)
 * @access Admin
 */
router.post('/admin/process-expiring', 
  sensitiveRateLimit,
  consentController.processExpiringConsents
);

/**
 * @route GET /api/consent/admin/user/:userId
 * @desc Get consent details for specific user
 * @access Admin
 */
router.get('/admin/user/:userId', 
  consentRateLimit,
  consentController.getUserConsentById
);

// Development/Testing endpoints

/**
 * @route GET /api/consent/test
 * @desc Test consent system functionality
 * @access Private (Development only)
 */
router.get('/test', 
  consentRateLimit,
  consentController.testConsentSystem
);

export default router; 