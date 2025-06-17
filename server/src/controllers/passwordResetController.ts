import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabase, serverTables } from '../lib/supabase.js';
import {
  createPasswordResetToken,
  validatePasswordResetToken,
  invalidatePasswordResetToken,
} from '../services/passwordResetTokenService.js';
import { sendReset } from '../mail/sendReset.js';
import type { User } from '../../../shared/types/database.js';

// Validation schema for password reset request
const resetRequestSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

// Validation schema for password reset
const resetPasswordSchema = z.object({
  password: z.string()
    .min(12, 'Password must be at least 12 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

/**
 * Request a password reset
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = resetRequestSchema.parse(req.body);

    // Find the user by email using Supabase
    const { data: user, error } = await serverTables.users()
      .select('id, email, name')
      .eq('email', validatedData.email)
      .single();

    // Even if we don't find a user, send a 200 response for security reasons
    // This prevents user enumeration attacks
    if (error || !user) {
      res.status(200).json({
        message: 'If your email is in our system, you will receive a password reset link shortly',
      });
      return;
    }

    // Generate a password reset token
    const token = await createPasswordResetToken(user.id);

    // Send the reset email
    await sendReset(user.email, token, user.name);

    res.status(200).json({
      message: 'If your email is in our system, you will receive a password reset link shortly',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
      return;
    }
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
    const validatedData = resetPasswordSchema.parse(req.body);

    if (!token) {
      res.status(400).json({ message: 'Token is required' });
      return;
    }

    // Validate the token
    const userIdFromToken = await validatePasswordResetToken(token);

    if (!userIdFromToken) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    // Find the user using Supabase
    const { data: user, error: userError } = await serverTables.users()
      .select('id, email')
      .eq('id', userIdFromToken)
      .single();

    if (userError || !user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(validatedData.password, salt);

    // Update the user's password using Supabase
    const { error: updateError } = await serverTables.users()
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user password:', updateError);
      res.status(500).json({ message: 'Error updating password' });
      return;
    }

    // Invalidate the token
    await invalidatePasswordResetToken(token);

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
      return;
    }
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};
