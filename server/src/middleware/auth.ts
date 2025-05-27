import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { APIError, ErrorCode } from './error.js';
import { AuthenticatedUserPayload } from '../types/user.js';
import mongoose from 'mongoose';

// Middleware to check if the user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Middleware to check if the user is already authenticated (redirect if logged in)
export const isAlreadyAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    throw APIError.unauthorized('Already authenticated');
  }
  next();
};

// Middleware to check if the user has specific roles
export const hasRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw APIError.unauthorized('Not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      throw APIError.forbidden('Insufficient permissions');
    }

    next();
  };
};

// Middleware to check if the user is a coach or admin
export const isCoach = hasRole('coach', 'admin');

// Middleware to check if the user is an admin
export const isAdmin = hasRole('admin');

// Middleware to check resource access (user can only access their own resources)
export const canAccessResource = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw APIError.unauthorized('Not authenticated');
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    if (!resourceUserId) {
      throw new APIError(ErrorCode.VALIDATION_ERROR, 'Resource ID is required', 400);
    }

    if (resourceUserId !== req.user.id) {
      throw APIError.notFound('Resource');
    }

    if (resourceUserId !== req.user.id) {
      throw APIError.forbidden('Not authorized to access this resource');
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
          throw APIError.unauthorized(info?.message || 'Authentication failed');
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
