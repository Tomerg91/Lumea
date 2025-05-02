import { Request, Response, NextFunction } from 'express';

// No need to redefine User interface here, it's already in express.d.ts
// Remove the User interface and Express namespace declaration
// This is causing conflicts with the global declaration

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
  // Check if the authenticated user has the 'coach' role
  // Ensure req.user and req.user.role exist and match your AuthenticatedUser structure
  if (req.user && req.user.role === 'coach') {
    // Use lowercase 'coach' to match the defined enum
    return next();
  }
  res.status(403).json({ message: 'Forbidden: Coach role required.' });
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Not authorized' });
};
