import express from 'express';
import {
  setupMFA,
  enableMFA,
  verifyMFA,
  getMFAStatus,
  disableMFA,
  isMFARequired,
  generateBackupCodes,
} from '../controllers/mfaController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all MFA routes
router.use(requireAuth);

// MFA setup and management routes
router.post('/setup', setupMFA);           // POST /api/mfa/setup
router.post('/enable', enableMFA);         // POST /api/mfa/enable
router.post('/verify', verifyMFA);         // POST /api/mfa/verify
router.get('/status', getMFAStatus);       // GET /api/mfa/status
router.get('/required', isMFARequired);    // GET /api/mfa/required
router.post('/backup-codes', generateBackupCodes); // POST /api/mfa/backup-codes

// Admin-only routes
router.post('/disable', disableMFA);       // POST /api/mfa/disable (admin only)

export default router;