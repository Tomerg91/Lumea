import express from 'express';
import { 
  requestPasswordReset, 
  validateResetToken, 
  resetPassword 
} from '../controllers/passwordResetController';

const router = express.Router();

// POST /api/password-reset - Request a password reset
router.post('/password-reset', requestPasswordReset);

// GET /api/password-reset/:token - Validate a password reset token
router.get('/password-reset/:token', validateResetToken);

// POST /api/password-reset/:token - Reset password with token
router.post('/password-reset/:token', resetPassword);

export default router; 