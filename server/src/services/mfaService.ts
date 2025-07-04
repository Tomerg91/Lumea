import { supabase } from '../lib/supabase';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { APIError, ErrorCode } from '../middleware/error';

// MFA configuration
const MFA_CONFIG = {
  serviceName: 'Satya Coaching',
  issuer: 'SatyaCoaching',
  window: 2, // Allow 2 time steps either side of current time (TOTP tolerance)
  tokenLength: 6,
  step: 30, // 30 second time step
  encoding: 'base32' as const,
};

// Types for MFA operations
export interface MFASecret {
  ascii: string;
  hex: string;
  base32: string;
  otpauth_url?: string;
  qr_code_ascii?: string;
  qr_code_hex?: string;
  qr_code_base32?: string;
}

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  otpauthUrl: string;
}

export interface MFAVerificationResult {
  isValid: boolean;
  error?: string;
}

/**
 * MFA Service for HIPAA-compliant multi-factor authentication
 * Required for healthcare providers accessing PHI data
 */
export class MFAService {
  /**
   * Generate MFA secret and QR code for initial setup
   */
  static async generateMFASecret(userId: string, userEmail: string): Promise<MFASetupResult> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${MFA_CONFIG.serviceName}:${userEmail}`,
        issuer: MFA_CONFIG.issuer,
        length: 32,
      });

      if (!secret.base32) {
        throw new APIError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to generate MFA secret',
          500
        );
      }

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store MFA setup in database (pending activation)
      const { error: dbError } = await supabase
        .from('user_mfa_settings')
        .upsert({
          user_id: userId,
          secret: secret.base32,
          backup_codes: backupCodes,
          is_enabled: false,
          setup_at: new Date().toISOString(),
          last_used_at: null,
        }, {
          onConflict: 'user_id'
        });

      if (dbError) {
        console.error('Failed to store MFA setup:', dbError);
        throw new APIError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to store MFA configuration',
          500
        );
      }

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        otpauthUrl: secret.otpauth_url!,
      };
    } catch (error) {
      console.error('MFA secret generation error:', error);
      if (error instanceof APIError) throw error;
      throw new APIError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to generate MFA secret',
        500
      );
    }
  }

  /**
   * Verify MFA token and enable MFA for user
   */
  static async enableMFA(userId: string, token: string): Promise<MFAVerificationResult> {
    try {
      // Get user's MFA settings
      const { data: mfaSettings, error: fetchError } = await supabase
        .from('user_mfa_settings')
        .select('secret, backup_codes, is_enabled')
        .eq('user_id', userId)
        .single();

      if (fetchError || !mfaSettings) {
        return {
          isValid: false,
          error: 'MFA not set up for this user'
        };
      }

      if (mfaSettings.is_enabled) {
        return {
          isValid: false,
          error: 'MFA already enabled'
        };
      }

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: mfaSettings.secret,
        encoding: MFA_CONFIG.encoding,
        token,
        step: MFA_CONFIG.step,
        window: MFA_CONFIG.window,
      });

      if (!verified) {
        // Log failed verification attempt
        await this.logMFAEvent(userId, 'verification_failed', {
          action: 'enable_mfa',
          success: false,
        });

        return {
          isValid: false,
          error: 'Invalid MFA token'
        };
      }

      // Enable MFA
      const { error: updateError } = await supabase
        .from('user_mfa_settings')
        .update({
          is_enabled: true,
          enabled_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to enable MFA:', updateError);
        throw new APIError(
          ErrorCode.INTERNAL_ERROR,
          'Failed to enable MFA',
          500
        );
      }

      // Log successful MFA enablement
      await this.logMFAEvent(userId, 'mfa_enabled', {
        action: 'enable_mfa',
        success: true,
      });

      return { isValid: true };
    } catch (error) {
      console.error('MFA enable error:', error);
      if (error instanceof APIError) throw error;
      throw new APIError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to enable MFA',
        500
      );
    }
  }

  /**
   * Verify MFA token during login
   */
  static async verifyMFA(userId: string, token: string): Promise<MFAVerificationResult> {
    try {
      // Get user's MFA settings
      const { data: mfaSettings, error: fetchError } = await supabase
        .from('user_mfa_settings')
        .select('secret, backup_codes, is_enabled, last_used_at')
        .eq('user_id', userId)
        .single();

      if (fetchError || !mfaSettings || !mfaSettings.is_enabled) {
        return {
          isValid: false,
          error: 'MFA not enabled for this user'
        };
      }

      // Check if token is a backup code
      if (token.length === 8 && mfaSettings.backup_codes.includes(token)) {
        // Use backup code
        const updatedBackupCodes = mfaSettings.backup_codes.filter((code: string) => code !== token);
        
        const { error: updateError } = await supabase
          .from('user_mfa_settings')
          .update({
            backup_codes: updatedBackupCodes,
            last_used_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Failed to update backup codes:', updateError);
        }

        await this.logMFAEvent(userId, 'backup_code_used', {
          action: 'mfa_verification',
          success: true,
        });

        return { isValid: true };
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: mfaSettings.secret,
        encoding: MFA_CONFIG.encoding,
        token,
        step: MFA_CONFIG.step,
        window: MFA_CONFIG.window,
      });

      // Update last used time if verification successful
      if (verified) {
        const { error: updateError } = await supabase
          .from('user_mfa_settings')
          .update({
            last_used_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Failed to update MFA last used time:', updateError);
        }

        await this.logMFAEvent(userId, 'mfa_verified', {
          action: 'mfa_verification',
          success: true,
        });
      } else {
        await this.logMFAEvent(userId, 'verification_failed', {
          action: 'mfa_verification',
          success: false,
        });
      }

      return {
        isValid: verified,
        error: verified ? undefined : 'Invalid MFA token'
      };
    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        isValid: false,
        error: 'MFA verification failed'
      };
    }
  }

  /**
   * Check if MFA is required for user based on role
   */
  static async isMFARequired(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return false;
      }

      // MFA required for coaches and admins (healthcare providers)
      return user.role === 'coach' || user.role === 'admin';
    } catch (error) {
      console.error('MFA requirement check error:', error);
      return false;
    }
  }

  /**
   * Check if user has MFA enabled
   */
  static async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const { data: mfaSettings, error } = await supabase
        .from('user_mfa_settings')
        .select('is_enabled')
        .eq('user_id', userId)
        .single();

      return !error && mfaSettings?.is_enabled === true;
    } catch (error) {
      console.error('MFA status check error:', error);
      return false;
    }
  }

  /**
   * Disable MFA for user (admin action)
   */
  static async disableMFA(userId: string, adminUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_mfa_settings')
        .update({
          is_enabled: false,
          disabled_at: new Date().toISOString(),
          disabled_by: adminUserId,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to disable MFA:', error);
        return false;
      }

      await this.logMFAEvent(userId, 'mfa_disabled', {
        action: 'disable_mfa',
        admin_user_id: adminUserId,
        success: true,
      });

      return true;
    } catch (error) {
      console.error('MFA disable error:', error);
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Log MFA events for audit trail
   */
  private static async logMFAEvent(
    userId: string,
    event: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: `mfa_${event}`,
          resource: 'mfa',
          metadata,
          created_at: new Date().toISOString(),
          event_type: 'authentication',
          event_category: 'security',
          risk_level: 'medium',
          compliance_flags: ['HIPAA'],
        });
    } catch (error) {
      console.error('Failed to log MFA event:', error);
      // Don't throw - logging failures shouldn't break MFA flow
    }
  }

  /**
   * Get MFA status for user
   */
  static async getMFAStatus(userId: string): Promise<{
    isRequired: boolean;
    isEnabled: boolean;
    backupCodesRemaining: number;
  }> {
    try {
      const [isRequired, mfaSettings] = await Promise.all([
        this.isMFARequired(userId),
        supabase
          .from('user_mfa_settings')
          .select('is_enabled, backup_codes')
          .eq('user_id', userId)
          .single()
      ]);

      const isEnabled = !mfaSettings.error && mfaSettings.data?.is_enabled === true;
      const backupCodesRemaining = mfaSettings.data?.backup_codes?.length || 0;

      return {
        isRequired,
        isEnabled,
        backupCodesRemaining,
      };
    } catch (error) {
      console.error('MFA status check error:', error);
      return {
        isRequired: false,
        isEnabled: false,
        backupCodesRemaining: 0,
      };
    }
  }
}