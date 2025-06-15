import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const TOKEN_BYTES = 32; // 32 bytes -> 64-char hex string
const TOKEN_TTL_MINUTES = 30; // token valid for 30 minutes

/**
 * Create a password reset token for the given user.
 * Any existing tokens for the user are removed first.
 * Returns the raw token string (hex).
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  // Remove previous tokens for this user to ensure single active token
  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Validate a password reset token.
 * Returns the associated userId if valid, otherwise null.
 */
export async function validatePasswordResetToken(token: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record) return null;
  if (record.expiresAt < new Date()) {
    // expired – clean up
    await prisma.passwordResetToken.delete({ where: { token } });
    return null;
  }
  return record.userId;
}

/**
 * Invalidate a token after successful password reset.
 */
export async function invalidatePasswordResetToken(token: string): Promise<void> {
  await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {
    /* token may already be removed */
  });
} 