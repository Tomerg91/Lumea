import { Request, Response, NextFunction } from 'express';

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized. Please log in.' });
};

// Middleware to check if the authenticated user is a coach
export const isCoach = (req: Request, res: Response, next: NextFunction) => {
  // Ensure user is authenticated first
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }
  // Check if the user object exists and has the 'COACH' role
  // Adjust 'req.user.role' based on your actual AuthenticatedUser structure
  if (req.user && req.user.role === 'COACH') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden. Coach access required.' });
}; 