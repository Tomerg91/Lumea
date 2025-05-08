import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { jwtConfig } from '../auth/config';

// Define a User type for Request context
export interface RequestUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'coach' | 'client' | string;
  roleName?: string;
  isActive?: boolean;
}

// Extend Express Request using module augmentation
declare module 'express' {
  interface Request {
    user?: RequestUser;
  }
}

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Authentication token is missing' });
      return;
    }

    // Verify the token
    try {
      const decoded = jwt.verify(token, jwtConfig.accessSecret) as jwt.JwtPayload;

      // Get user from database
      const user = await User.findById(decoded.id);

      if (!user) {
        res.status(401).json({ message: 'User not found' });
        return;
      }

      // Determine role value
      let roleValue: string | undefined = undefined;
      if (typeof user.role === 'object' && user.role !== null) {
        if ('name' in user.role) {
          roleValue = user.role.name as string;
        }
      } else if (user.role) {
        roleValue = String(user.role);
      }

      // Add user to request object with appropriate type
      req.user = {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: roleValue as 'admin' | 'coach' | 'client' | string,
        roleName: roleValue, // Add roleName for backward compatibility
        isActive: user.isActive,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({ message: 'Token expired' });
      } else {
        res.status(401).json({ message: 'Invalid token' });
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to check if user is a coach
 */
export const isCoach = (req: Request, res: Response, next: NextFunction): void => {
  // First ensure user is authenticated
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Then check role
  if (req.user.role !== 'coach') {
    res.status(403).json({ message: 'Coach access required' });
    return;
  }

  next();
};

/**
 * Middleware to check if user is a client
 */
export const isClient = (req: Request, res: Response, next: NextFunction): void => {
  // First ensure user is authenticated
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Then check role
  if (req.user.role !== 'client') {
    res.status(403).json({ message: 'Client access required' });
    return;
  }

  next();
};

/**
 * Middleware to check if user is an admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // First ensure user is authenticated
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Then check role
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
};
