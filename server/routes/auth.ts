import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { PrismaClient, Prisma } from '@prisma/client';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = express.Router();
const prisma = new PrismaClient();
const saltRounds = 10;

// --- Register Route --- //
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, role } = req.body;

  // Basic Validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }
  // TODO: Add more robust validation (e.g., email format)

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    // Explicitly cast role if necessary, ensure it matches schema expectations (e.g., lowercase)
    const userRole = role?.toLowerCase() || 'client'; // Default to client, adjust if needed

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
      },
      select: {
        // Select only non-sensitive fields to return
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({ message: 'Registration successful', user: newUser });
  } catch (error) {
    console.error('Registration error:', error);
    // Handle potential Prisma unique constraint errors more gracefully if needed
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Email already in use.' });
    }
    next(error); // Pass other errors to the global error handler
  }
});

// --- Login Route --- //
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  // Input validation (basic)
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  passport.authenticate(
    'local',
    (
      err: Error | null,
      user: Express.User | false | null,
      info: { message: string } | undefined
    ) => {
      if (err) {
        console.error('Passport authentication error:', err);
        return next(err);
      }
      if (!user) {
        // Info.message comes from the LocalStrategy's done() callback
        console.log('Passport authentication failed:', info?.message);
        return res
          .status(401)
          .json({ message: info?.message || 'Login failed. Invalid credentials.' });
      }

      // Manually establish the session using req.logIn
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Session login error:', loginErr);
          return next(loginErr);
        }
        console.log('User logged in successfully:', user.id);
        // Send back the authenticated user object (provided by passport strategy)
        return res.status(200).json(user);
      });
    }
  )(req, res, next); // Important: call the middleware function returned by passport.authenticate
});

// --- Get Current User Route (/me) --- //
router.get('/me', isAuthenticated, (req: Request, res: Response) => {
  // If isAuthenticated middleware passes, req.user is populated
  // The AuthenticatedUser type should not include the password
  res.status(200).json(req.user);
});

// --- Logout Route --- //
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return next(err);
    }
    // Optional: Destroy session for complete cleanup
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error('Session destruction error:', destroyErr);
        // Still considered logged out on client-side, so proceed? Or return error?
        // Let's proceed but log the error.
      }
      console.log('User logged out and session destroyed.');
      res.status(200).json({ message: 'Logout successful.' });
    });
  });
});

export default router;
