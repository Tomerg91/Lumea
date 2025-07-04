import crypto from 'crypto';

import {
  createPasswordResetToken as createPasswordResetTokenPrisma,
  validatePasswordResetToken as validatePasswordResetTokenPrisma,
  invalidatePasswordResetToken as invalidatePasswordResetTokenPrisma,
} from '../services/passwordResetTokenService';

/**
 * Generate a secure random token (48-byte hex string)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Create a new invite token for a client
 */
export async function createInviteToken(
  coachId: Types.ObjectId | string,
  email: string
): Promise<string> {
  // Delete any existing invites for this email
  await InviteToken.deleteMany({ email });

  const token = generateSecureToken();

  await InviteToken.create({
    token,
    coachId: typeof coachId === 'string' ? new Types.ObjectId(coachId) : coachId,
    email,
    expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
  });

  return token;
}

/**
 * Verify an invite token
 */
export async function validateInviteToken(token: string): Promise<IInviteToken | null> {
  return await InviteToken.findOne({
    token,
    expires: { $gt: new Date() },
  });
}

/**
 * Create a password reset token for a user
 */
export async function createPasswordResetToken(userId: Types.ObjectId | string): Promise<string> {
  // Delete any existing reset tokens for this user
  await PasswordResetToken.deleteMany({ userId });

  const token = generateSecureToken();

  await PasswordResetToken.create({
    token,
    userId: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
    expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
  });

  return token;
}

/**
 * Verify a password reset token
 */
export async function validatePasswordResetToken(
  token: string
): Promise<IPasswordResetToken | null> {
  return await PasswordResetToken.findOne({
    token,
    expires: { $gt: new Date() },
  });
}

/**
 * Invalidate a password reset token after use
 */
export async function invalidatePasswordResetToken(token: string): Promise<void> {
  await PasswordResetToken.deleteOne({ token });
}

/**
 * Invalidate an invite token after use
 */
export async function invalidateInviteToken(token: string): Promise<void> {
  console.warn('invalidateInviteToken is a placeholder. Implement with Supabase.');
}
