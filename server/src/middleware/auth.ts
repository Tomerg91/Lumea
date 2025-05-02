import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { APIError } from './error.js';
import { IUser } from '../models/User.js';
import mongoose from 'mongoose';

// Middleware to check if the user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Middleware to check if the user is not authenticated
export const isNotAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  throw new APIError(400, 'Already authenticated');
};

// Middleware to check if the user has a specific role
export const hasRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new APIError(401, 'Not authenticated');
    }

    if (req.user.role !== role) {
      throw new APIError(403, 'Insufficient permissions');
    }

    next();
  };
};

// Middleware to check if the user is the owner of a resource
export const isOwner = (getResourceUserId: (resourceId: string) => Promise<string | null>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new APIError(401, 'Not authenticated');
    }

    const resourceId = req.params.id;
    if (!resourceId) {
      throw new APIError(400, 'Resource ID is required');
    }

    const resourceUserId = await getResourceUserId(resourceId);
    if (!resourceUserId) {
      throw new APIError(404, 'Resource not found');
    }

    if (resourceUserId !== req.user.id.toString()) {
      throw new APIError(403, 'Not authorized to access this resource');
    }

    next();
  };
};

// Middleware to handle passport authentication
export const authenticate = (strategy: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      strategy,
      (err: Error | null, user: Express.User | false, info: { message?: string } | undefined) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          throw new APIError(401, info?.message || 'Authentication failed');
        }

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          next();
        });
      }
    )(req, res, next);
  };
};

// Middleware to check if user is a coach
export const isCoach = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role !== 'coach') {
    return res.status(403).json({ error: 'Not authorized - Coach access required' });
  }
  next();
};

// Middleware to check if user is a client
export const isClient = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: 'Not authorized - Client access required' });
  }
  next();
};

// Middleware to check if user is an admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized - Admin access required' });
  }
  next();
};

// Middleware to check if user has access to a specific resource
export const hasResourceAccess = (resourceType: 'session' | 'reflection' | 'payment') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const resourceId = req.params.id;
    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID is required' });
    }

    try {
      let hasAccess = false;

      switch (resourceType) {
        case 'session':
          if (req.user.role === 'coach') {
            const session = await req.app.locals.db.Session.findById(resourceId);
            hasAccess = session && session.coachId.toString() === req.user.id.toString();
          } else if (req.user.role === 'client') {
            const session = await req.app.locals.db.Session.findById(resourceId);
            hasAccess = session && session.clientId.toString() === req.user.id.toString();
          }
          break;

        case 'reflection':
          if (req.user.role === 'coach') {
            const reflection = await req.app.locals.db.Reflection.findById(resourceId);
            hasAccess = reflection && reflection.sharedWithCoach;
          } else if (req.user.role === 'client') {
            const reflection = await req.app.locals.db.Reflection.findById(resourceId);
            hasAccess = reflection && reflection.userId.toString() === req.user.id.toString();
          }
          break;

        case 'payment': {
          const payment = await req.app.locals.db.Payment.findById(resourceId);
          hasAccess =
            payment &&
            (payment.coachId.toString() === req.user.id.toString() ||
              payment.clientId.toString() === req.user.id.toString());
          break;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized to access this resource' });
      }

      next();
    } catch (error) {
      console.error('Error checking resource access:', error);
      res.status(500).json({ error: 'Failed to verify resource access' });
    }
  };
};
