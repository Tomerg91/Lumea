import { supabase, serverTables } from '../lib/supabase';
import crypto from 'crypto';
import type { PasswordResetToken, PasswordResetTokenInsert } from '../../../shared/types/database';

const TOKEN_BYTES = 32; // 32 bytes -> 64-char hex string
const TOKEN_TTL_MINUTES = 30; // token valid for 30 minutes

/**
 * Create a password reset token for the given user.
 * Any existing tokens for the user are removed first.
 * Returns the raw token string (hex).
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  // Remove previous tokens for this user to ensure single active token
  const { error: deleteError } = await serverTables.password_reset_tokens()
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.warn('Warning: Could not delete existing tokens:', deleteError);
  }

  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  const tokenData: PasswordResetTokenInsert = {
    token,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  };

  const { error: createError } = await serverTables.password_reset_tokens()
    .insert(tokenData);

  if (createError) {
    console.error('Error creating password reset token:', createError);
    throw new Error('Failed to create password reset token');
  }

  return token;
}

/**
 * Validate a password reset token.
 * Returns the associated userId if valid, otherwise null.
 */
export async function validatePasswordResetToken(token: string): Promise<string | null> {
  const { data: record, error } = await serverTables.password_reset_tokens()
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (error || !record) {
    return null;
  }

  const expiresAt = new Date(record.expires_at);
  if (expiresAt < new Date()) {
    // expired – clean up
    await serverTables.password_reset_tokens()
      .delete()
      .eq('token', token);
    return null;
  }

  return record.user_id;
}

/**
 * Invalidate a token after successful password reset.
 */
export async function invalidatePasswordResetToken(token: string): Promise<void> {
  const { error } = await serverTables.password_reset_tokens()
    .delete()
    .eq('token', token);

  if (error) {
    console.warn('Warning: Could not invalidate token:', error);
  }
} 