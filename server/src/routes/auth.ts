import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { supabaseAuth, isAuthenticated } from '../middleware/supabaseAuth';
import { users } from '../../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Validation schemas for password reset (if not handled by Supabase)
const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string()
    .min(12, 'Password must be at least 12 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

// Email transporter (if needed for custom email functionality)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// NOTE: Login and Signup are now handled by Supabase Auth directly on the frontend
// These routes are kept for potential API compatibility but should not be used

// Current user endpoint - this gets user info for authenticated requests
router.get('/me', supabaseAuth, (req, res) => {
  // req.user is now populated by supabaseAuth middleware
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Return user info (password is not included in Supabase user object)
  res.json(req.user);
});

// Legacy route for compatibility
router.get('/current-user', supabaseAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  res.json(req.user);
});

// Profile update endpoint
router.put('/profile', supabaseAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const { name, bio, phone } = req.body;
    
    // Update user profile in Supabase
    const { data, error } = await supabase
      .from('users')
      .update({ 
        name, 
        bio, 
        phone,
        updated_at: new Date().toISOString() 
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(400).json({ message: 'Failed to update profile' });
    }

    res.json({ message: 'Profile updated successfully', user: data });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// NOTE: Password reset can be handled by Supabase Auth or custom implementation
// For now, using Supabase's built-in password reset is recommended

router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = requestPasswordResetSchema.parse(req.body);
    
    // Use Supabase's built-in password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL}/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({ message: 'Failed to send password reset email' });
    }

    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
