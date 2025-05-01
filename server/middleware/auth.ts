import { Request, Response, NextFunction } from 'express';

interface User {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      role: string;
    }
  }
}

// Middleware to check if user is authenticated (relies on Passport session)
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized: Authentication required.' });
};

// Middleware to check if the authenticated user is a coach
export const isCoach = (req: Request, res: Response, next: NextFunction) => {
  // First, ensure the user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
  }
  // Check if the authenticated user has the 'COACH' role
  // Ensure req.user and req.user.role exist and match your AuthenticatedUser structure
  if (req.user && req.user.role === 'COACH') {
    // Use uppercase 'COACH' as per likely schema enum/string
    return next();
  }
  res.status(403).json({ message: 'Forbidden: Coach role required.' });
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'ADMIN') {
    return next();
  }
  res.status(403).json({ message: 'Not authorized' });
};
