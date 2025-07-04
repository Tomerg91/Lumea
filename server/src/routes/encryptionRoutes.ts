import { Router } from 'express';
import { EncryptionController } from '../controllers/encryptionController.js';
import { isAuthenticated } from '../../middleware/authMiddleware.js';
import { auditMiddleware } from '../middleware/auditMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for encryption endpoints
const encryptionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: {
    success: false,
    message: 'Too many encryption requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const keyRotationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 key rotations per hour
  message: {
    success: false,
    message: 'Too many key rotation requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const keyExportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 key exports per hour
  message: {
    success: false,
    message: 'Too many key export requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply middleware to all routes
router.use(isAuthenticated);
router.use(auditMiddleware);
router.use(encryptionRateLimit);

/**
 * @route GET /api/encryption/metrics
 * @desc Get encryption metrics and statistics
 * @access Private (Authenticated users)
 */
router.get('/metrics', EncryptionController.getMetrics);

/**
 * @route GET /api/encryption/keys
 * @desc Get information about encryption keys
 * @query purpose - Optional filter by purpose (data, backup, transit)
 * @access Private (Authenticated users)
 */
router.get('/keys', EncryptionController.getKeyInfo);

/**
 * @route POST /api/encryption/keys/:purpose/rotate
 * @desc Rotate encryption key for a specific purpose
 * @param purpose - Key purpose (data, backup, transit)
 * @body force - Force rotation even if not needed
 * @body reason - Reason for rotation
 * @access Private (Authenticated users)
 */
router.post('/keys/:purpose/rotate', keyRotationRateLimit, EncryptionController.rotateKey);

/**
 * @route GET /api/encryption/keys/expiring
 * @desc Get keys nearing expiration
 * @query days - Number of days to check ahead (default: 7)
 * @access Private (Authenticated users)
 */
router.get('/keys/expiring', EncryptionController.getKeysNearingExpiration);

/**
 * @route GET /api/encryption/policies
 * @desc Get rotation policies
 * @access Private (Authenticated users)
 */
router.get('/policies', EncryptionController.getRotationPolicies);

/**
 * @route PUT /api/encryption/policies/:purpose
 * @desc Update rotation policy for a specific purpose
 * @param purpose - Policy purpose (data, backup, transit)
 * @body rotationIntervalDays - Days between rotations
 * @body maxKeyAge - Maximum age of keys
 * @body requiresApproval - Whether rotation requires approval
 * @body notifyBefore - Days before expiration to notify
 * @body autoRotate - Whether to auto-rotate keys
 * @body retentionPeriod - Days to retain old keys
 * @access Private (Authenticated users)
 */
router.put('/policies/:purpose', keyRotationRateLimit, EncryptionController.updateRotationPolicy);

/**
 * @route POST /api/encryption/keys/:keyId/export
 * @desc Export encryption key (password protected)
 * @param keyId - ID of the key to export
 * @body password - Password to encrypt the exported key
 * @access Private (Authenticated users)
 */
router.post('/keys/:keyId/export', keyExportRateLimit, EncryptionController.exportKey);

/**
 * @route POST /api/encryption/keys/import
 * @desc Import encryption key (password protected)
 * @body encryptedKeyData - Encrypted key data
 * @body password - Password to decrypt the key
 * @access Private (Authenticated users)
 */
router.post('/keys/import', keyExportRateLimit, EncryptionController.importKey);

/**
 * @route POST /api/encryption/test
 * @desc Test encryption/decryption functionality
 * @body testData - Data to encrypt/decrypt (optional)
 * @body purpose - Purpose of encryption (optional, default: data)
 * @access Private (Authenticated users)
 */
router.post('/test', EncryptionController.testEncryption);

/**
 * @route DELETE /api/encryption/keys/cleanup
 * @desc Cleanup expired keys
 * @access Private (Authenticated users)
 */
router.delete('/keys/cleanup', EncryptionController.cleanupExpiredKeys);

export default router; 