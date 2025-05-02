import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Express, Request } from 'express';
import session from 'express-session';
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'crypto';
import { promisify } from 'util';
import { storage } from './storage';
import { User as SelectUser, insertUserSchema } from '@shared/schema';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getNumericUserId } from './utils';

// No need to redeclare Express.User interface here as it's defined in express.d.ts

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'satya-method-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === 'production',
    },
  };

  app.set('trust proxy', 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          } else {
            // Convert user to Express.User format
            const userForSession: Express.User = {
              _id: String(user.id),
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
            return done(null, userForSession);
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string | number, done) => {
    try {
      // Convert string id to number if needed
      const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      const user = await storage.getUser(numericId);
      if (!user) {
        return done(null, false);
      }
      // Convert user to Express.User format
      const userForSession: Express.User = {
        _id: String(user.id),
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      done(null, userForSession);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post('/api/register', async (req, res, next) => {
    try {
      // Define the registration schema using Zod
      const registerSchema = z
        .object({
          name: z.string(),
          email: z.string().email(),
          password: z.string(),
          confirmPassword: z.string(),
          role: z.enum(['coach', 'client', 'admin']).default('client'),
          profilePicture: z.string().optional(),
          phone: z.string().optional(),
          bio: z.string().optional(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords don't match",
          path: ['confirmPassword'],
        });

      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      // Create the user with hashed password
      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
      });

      // Remove sensitive data
      const { password, confirmPassword, ...userWithoutPassword } = validatedData;

      // Convert to proper Express.User for login
      const userForSession: Express.User = {
        _id: String(user.id),
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      // Log the user in
      req.login(userForSession, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      next(error);
    }
  });

  // Login endpoint
  app.post('/api/login', (req, res, next) => {
    passport.authenticate(
      'local',
      (err: Error | null, user: Express.User | false, info: { message: string }) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }

        req.login(user, (err) => {
          if (err) return next(err);

          // Remove sensitive data
          const { password, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      }
    )(req, res, next);
  });

  // Logout endpoint
  app.post('/api/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Create a user object without the password
    // First, treat req.user as unknown to avoid type errors
    const user = req.user as unknown;

    // Check if user is an object with expected properties
    if (user && typeof user === 'object') {
      // Now we can safely destructure, as we've checked user exists and is an object
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user as {
        password?: unknown;
        [key: string]: unknown;
      };
      res.json(userWithoutPassword);
    } else {
      // Fallback if structure doesn't match expectations
      res.json(user);
    }
  });

  // Request password reset endpoint
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Create reset token
      const token = await storage.createPasswordResetToken(email);

      if (!token) {
        // Don't reveal if the user exists or not for security reasons
        return res.status(200).json({
          message: 'If an account with that email exists, a password reset link has been sent.',
        });
      }

      // In a real application, you would send an email with the reset link
      // For this demo, we'll just return the token in the response
      res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        token, // In production, remove this and send it via email instead
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Validate reset token endpoint
  app.get('/api/reset-password/:token', async (req, res) => {
    try {
      const { token } = req.params;

      const user = await storage.validatePasswordResetToken(token);

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      res.status(200).json({ valid: true });
    } catch (error) {
      console.error('Token validation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Reset password endpoint
  app.post('/api/reset-password/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const { password, confirmPassword } = req.body;

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords don't match" });
      }

      // Validate the token and get the user
      const user = await storage.validatePasswordResetToken(token);

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Reset the password
      const success = await storage.resetPassword(user.id, password);

      if (!success) {
        return res.status(400).json({ message: 'Failed to reset password' });
      }

      res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
}
