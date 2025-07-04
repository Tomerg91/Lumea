import { Request, Response, NextFunction } from 'express';

// Extend Express Request using module augmentation
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      email: string;
      name?: string;
      role: 'client' | 'coach' | 'admin';
    };
  }
}

/**
 * DEVELOPMENT MODE: Simplified auth middleware
 * This bypasses real authentication for development purposes
 */
export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // For development mode, create a mock user
    if (process.env.NODE_ENV === 'development' || process.env.VITE_MOCK_AUTH === 'true') {
      req.user = {
        id: 'dev-user-123',
        email: 'dev@example.com',
        name: 'Development User',
        role: 'admin'
      };
      next();
      return;
    }

    // In production, this would implement real JWT verification
    res.status(401).json({ message: 'Authentication not implemented for production' });
  } catch (error) {
    res.status(401).json({ message: 'Authentication error' });
  }
};

/**
 * Middleware to check if user is a coach
 */
export const isCoach = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'coach' && req.user.role !== 'admin') {
    res.status(403).json({ message: 'Coach access required' });
    return;
  }

  next();
};

/**
 * Middleware to check if user is a client
 */
export const isClient = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'client' && req.user.role !== 'admin') {
    res.status(403).json({ message: 'Client access required' });
    return;
  }

  next();
};

/**
 * Middleware to check if user is an admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
};
