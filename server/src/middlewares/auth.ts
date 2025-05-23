import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.js';
import { jwtConfig } from '../auth/config';
import { AuthenticatedUserPayload } from '../types/user.js';
import { IRole } from '../models/Role.js';

// Extend Express Request using module augmentation
declare module 'express' {
  interface Request {
    user?: AuthenticatedUserPayload;
  }
}

/**
 * Middleware to check if user is authenticated via JWT
 */
export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    try {
      const decoded = jwt.verify(token, jwtConfig.accessSecret) as jwt.JwtPayload;
      const userFromDb = await User.findById(decoded.id).populate('role');

      if (!userFromDb) {
        res.status(401).json({ message: 'User not found' });
        return;
      }

      const plainUser = userFromDb.toObject();
      const populatedRole = plainUser.role as IRole;
      const roleName = (populatedRole && typeof populatedRole === 'object' && populatedRole.name) 
                       ? populatedRole.name 
                       : 'client';

      req.user = {
        id: plainUser._id.toString(),
        email: plainUser.email,
        name: `${plainUser.firstName || ''} ${plainUser.lastName || ''}`.trim() || undefined,
        role: roleName,
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
    res.status(401).json({ message: 'Authentication error' });
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
