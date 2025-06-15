import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  createPasswordResetToken,
  validatePasswordResetToken,
  invalidatePasswordResetToken,
} from '../services/passwordResetTokenService';
import { sendReset } from '../mail/sendReset';

const prisma = new PrismaClient();

/**
 * Request a password reset
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      res.status(400).json({ message: 'Valid email address is required' });
      return;
    }

    // Find the user by email
    const user = await prisma.user.findUnique({ where: { email } });

    // Even if we don't find a user, send a 200 response for security reasons
    // This prevents user enumeration attacks
    if (!user) {
      res.status(200).json({
        message: 'If your email is in our system, you will receive a password reset link shortly',
      });
      return;
    }

    // Generate a password reset token
    const token = await createPasswordResetToken(user.id.toString());

    // Send the reset email
    await sendReset(user.email, token, `${user.name}`);

    res.status(200).json({
      message: 'If your email is in our system, you will receive a password reset link shortly',
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
};

/**
 * Validate a password reset token
 */
export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ message: 'Token is required' });
      return;
    }

    const userIdCheck = await validatePasswordResetToken(token);

    if (!userIdCheck) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    res.status(200).json({ valid: true });
  } catch (error) {
    console.error('Error validating reset token:', error);
    res.status(500).json({ message: 'Error validating token' });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Token is required' });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters long' });
      return;
    }

    // Validate the token
    const userIdFromToken = await validatePasswordResetToken(token);

    if (!userIdFromToken) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { id: userIdFromToken } });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the user's password using the Prisma client
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate the token
    await invalidatePasswordResetToken(token);

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};
