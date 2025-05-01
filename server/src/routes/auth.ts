import express from 'express';
import passport from 'passport';
import { z } from 'zod';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { User, IUser } from '../models/User.js';
import {
  getUserByEmail,
  createUser,
  setUserPasswordResetToken,
  findUserByPasswordResetToken,
  clearUserPasswordResetToken,
  updateUserPassword,
} from '../storage.js';
import { isAuthenticated } from '../middleware/auth.js';
import { authController } from '../controllers/authController.js';
// import { loginSchema, registerSchema, passwordResetSchema, passwordUpdateSchema } from '../validators/authValidators'; // Commented out - Module not found

const router = express.Router();

// Validation schemas
const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['client', 'coach', 'admin']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
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
router.post('/signup', async (req, res) => {
  console.log('[POST /api/auth/signup] Starting signup process');
  try {
    console.log('[POST /api/auth/signup] Validating request body:', req.body);
    const validatedData = signupSchema.parse(req.body);
    console.log('[POST /api/auth/signup] Request body validated successfully');

    console.log(
      '[POST /api/auth/signup] Checking for existing user with email:',
      validatedData.email
    );
    const existingUser = await getUserByEmail(validatedData.email);
    if (existingUser) {
      console.log('[POST /api/auth/signup] User already exists with email:', validatedData.email);
      return res.status(409).json({ message: 'Email already exists' });
    }

    console.log('[POST /api/auth/signup] Creating new user');
    const user = await createUser(validatedData);
    console.log('[POST /api/auth/signup] User created successfully:', user._id);

    console.log('[POST /api/auth/signup] Attempting to log in user');
    req.login(user as any, (err) => {
      if (err) {
        console.error('[POST /api/auth/signup] Error during login:', err);
        return res.status(500).json({ message: 'Error logging in after signup' });
      }
      console.log('[POST /api/auth/signup] User logged in successfully');
      const { password, ...userWithoutPassword } = user.toObject();
      return res.status(201).json(userWithoutPassword);
    });
  } catch (error) {
    console.error('[POST /api/auth/signup] Error during signup:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: 'An unexpected error occurred during signup' });
  }
});

router.post('/login', (req, res, next) => {
  try {
    // try {
    //   loginSchema.parse(req.body); // Commented out schema usage
    passport.authenticate(
      'local',
      (err: Error | null, user: IUser | false, info: { message: string }) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message });
        }
        req.login(user as any, (err) => {
          if (err) {
            return next(err);
          }
          const { password, ...userWithoutPassword } = user.toObject();
          res.json(userWithoutPassword);
        });
      }
    )(req, res, next);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    next(error);
  }
});

router.post('/logout', (req, res) => {
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

router.get('/current-user', ensureAuthenticated, (req, res) => {
  console.log('[GET /api/auth/current-user] Starting current user check');
  if (!req.user) {
    console.error(
      '[GET /api/auth/current-user] Error: req.user is missing after ensureAuthenticated'
    );
    return res.status(500).json({ message: 'Internal server error: User context missing' });
  }
  console.log('[GET /api/auth/current-user] User found:', (req.user as any)._id);
  const { password, ...userWithoutPassword } = (req.user as any).toObject();
  res.json(userWithoutPassword);
});

router.post('/request-password-reset', async (req, res) => {
  try {
    // try {
    //   passwordResetSchema.parse(req.body); // Commented out schema usage
    const { email } = requestPasswordResetSchema.parse(req.body);
    const user = await getUserByEmail(email);

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return res.json({ message: 'If an account exists, a password reset email has been sent' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date(Date.now() + 3600000); // 1 hour from now

    // Use user.id which should be a string | undefined
    if (!user || !user.id) {
      // Handle case where user or user.id is null/undefined, though technically covered by earlier check
      // Log error or return specific response if needed
      console.error('[request-password-reset] User or user ID missing after check');
      return res.status(500).json({ message: 'Internal error processing request' });
    }
    await setUserPasswordResetToken(user.id, token, expiryDate);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset.</p>
        <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.json({ message: 'If an account exists, a password reset email has been sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ message: 'Error requesting password reset' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    // try {
    //   passwordUpdateSchema.parse(req.body); // Commented out schema usage
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const user = await findUserByPasswordResetToken(token);

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Use user.id which should be a string | undefined
    if (!user || !user.id) {
      console.error('[reset-password] User or user ID missing after check');
      return res.status(500).json({ message: 'Internal error processing request' });
    }
    await updateUserPassword(user.id, newPassword);
    await clearUserPasswordResetToken(user.id);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Profile routes
router.get('/me', isAuthenticated, authController.getCurrentUser);
router.put('/profile', isAuthenticated, authController.updateProfile);

export default router;
