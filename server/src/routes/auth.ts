import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { z } from 'zod';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { isAuthenticated } from '../middleware/auth.js';
import { signup } from '../controllers/authController.js';
import { User as DrizzleUser, users } from '../../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../db';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Validation schemas
// These are now handled in the controller, but can be kept for other routes or reference
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

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Middleware to ensure user is authenticated
const ensureAuthenticated = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

// Routes
router.post('/signup', signup);

router.post('/login', (req, res, next) => {
  passport.authenticate(
    'local',
    (err: Error | null, user: DrizzleUser | false, info?: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }

      req.login(user, (errLogin) => {
        if (errLogin) {
          return next(errLogin);
        }
        // Exclude password from the response
        const { password, ...userResponse } = user;
        return res.json(userResponse);
      });
    }
  )(req, res, next);
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error destroying session' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

router.get('/current-user', isAuthenticated, (req, res) => {
  // req.user is now the Drizzle User object
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  // Exclude password from the response
  const { password, ...userResponse } = req.user;
  res.json(userResponse);
});

router.post('/request-password-reset', async (req, res, next) => {
  res.status(501).json({ message: 'Not Implemented - Blocked by Linter Issue' });
});

router.post('/reset-password', async (req, res, next) => {
  res.status(501).json({ message: 'Not Implemented - Blocked by Linter Issue' });
});

// Profile routes
// These will need to be refactored
// router.get('/me', isAuthenticated, authController.getCurrentUser);
// router.put('/profile', isAuthenticated, authController.updateProfile);

export default router;
