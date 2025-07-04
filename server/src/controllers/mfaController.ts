import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MFAService } from '../services/mfaService';
import { APIError, ErrorCode } from '../middleware/error';
import { supabase } from '../lib/supabase';

// Validation schemas
const mfaSetupSchema = z.object({
  // No additional fields needed for setup - user info comes from auth
});

const mfaEnableSchema = z.object({
  token: z.string().min(6).max(8).regex(/^[0-9A-Z]+$/, 'Invalid token format'),
});

const mfaVerifySchema = z.object({
  token: z.string().min(6).max(8).regex(/^[0-9A-Z]+$/, 'Invalid token format'),
});

const mfaDisableSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().optional(),
});

/**
 * MFA Controller for HIPAA-compliant multi-factor authentication
 */
export class MFAController {
  /**
   * Initialize MFA setup for a user
   * POST /api/mfa/setup
   */
  static async setupMFA(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new APIError(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          401
        );
      }

      const { user } = req;

      // Check if MFA is required for this user
      const isRequired = await MFAService.isMFARequired(user.id);
      
      if (!isRequired) {
        return res.status(400).json({
          error: 'MFA is not required for this user role'
        });
      }

      // Check if MFA is already enabled
      const isEnabled = await MFAService.isMFAEnabled(user.id);
      
      if (isEnabled) {
        return res.status(400).json({
          error: 'MFA is already enabled for this user'
        });
      }

      // Get user email from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        throw new APIError(
          ErrorCode.NOT_FOUND,
          'User not found',
          404
        );
      }

      const setupResult = await MFAService.generateMFASecret(user.id, userData.email);

      res.json({
        message: 'MFA setup initiated',
        qrCode: setupResult.qrCodeUrl,
        backupCodes: setupResult.backupCodes,
        otpauthUrl: setupResult.otpauthUrl,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable MFA after verification
   * POST /api/mfa/enable
   */
  static async enableMFA(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new APIError(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          401
        );
      }

      const { token } = mfaEnableSchema.parse(req.body);
      const { user } = req;

      const result = await MFAService.enableMFA(user.id, token);

      if (!result.isValid) {
        return res.status(400).json({
          error: result.error || 'Invalid MFA token'
        });
      }

      res.json({
        message: 'MFA enabled successfully',
        enabled: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid input',
          details: error.errors
        });
      }
      next(error);
    }
  }

  /**
   * Verify MFA token during login
   * POST /api/mfa/verify
   */
  static async verifyMFA(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new APIError(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          401
        );
      }

      const { token } = mfaVerifySchema.parse(req.body);
      const { user } = req;

      const result = await MFAService.verifyMFA(user.id, token);

      if (!result.isValid) {
        return res.status(400).json({
          error: result.error || 'Invalid MFA token',
          verified: false,
        });
      }

      res.json({
        message: 'MFA verification successful',
        verified: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid input',
          details: error.errors
        });
      }
      next(error);
    }
  }

  /**
   * Get MFA status for current user
   * GET /api/mfa/status
   */
  static async getMFAStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new APIError(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          401
        );
      }

      const { user } = req;
      const status = await MFAService.getMFAStatus(user.id);

      res.json(status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable MFA for a user (admin only)
   * POST /api/mfa/disable
   */
  static async disableMFA(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new APIError(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          401
        );
      }

      // Check if user is admin
      const { data: adminUser, error: adminError } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (adminError || !adminUser || adminUser.role !== 'admin') {
        throw new APIError(
          ErrorCode.FORBIDDEN,
          'Admin access required',
          403
        );
      }

      const { userId, reason } = mfaDisableSchema.parse(req.body);

      const success = await MFAService.disableMFA(userId, req.user.id);

      if (!success) {
        throw new APIError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to disable MFA',
          500
        );
      }

      res.json({
        message: 'MFA disabled successfully',
        disabled: true,
        reason,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid input',
          details: error.errors
        });
      }
      next(error);
    }
  }

  /**
   * Check if MFA is required for current user
   * GET /api/mfa/required
   */
  static async isMFARequired(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new APIError(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          401
        );
      }

      const { user } = req;
      const isRequired = await MFAService.isMFARequired(user.id);

      res.json({
        required: isRequired,
        userId: user.id,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate new backup codes (requires MFA verification)
   * POST /api/mfa/backup-codes
   */
  static async generateBackupCodes(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new APIError(
          ErrorCode.UNAUTHORIZED,
          'Authentication required',
          401
        );
      }

      const { user } = req;

      // Verify current MFA token first
      const { token } = mfaVerifySchema.parse(req.body);
      const verification = await MFAService.verifyMFA(user.id, token);

      if (!verification.isValid) {
        return res.status(400).json({
          error: 'MFA verification required to generate new backup codes'
        });
      }

      // Generate new backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Update user's backup codes
      const { error: updateError } = await supabase
        .from('user_mfa_settings')
        .update({
          backup_codes: backupCodes,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw new APIError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to generate new backup codes',
          500
        );
      }

      res.json({
        message: 'New backup codes generated',
        backupCodes,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid input',
          details: error.errors
        });
      }
      next(error);
    }
  }
}

// Export individual controller functions for route binding
export const {
  setupMFA,
  enableMFA,
  verifyMFA,
  getMFAStatus,
  disableMFA,
  isMFARequired,
  generateBackupCodes,
} = MFAController;