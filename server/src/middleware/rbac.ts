import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';

// Define the roles and their permissions
export enum Role {
  CLIENT = 'client',
  COACH = 'coach',
  ADMIN = 'admin',
}

// Define the resources that can be accessed
export enum Resource {
  SESSION = 'session',
  REFLECTION = 'reflection',
  FILE = 'file',
  USER = 'user',
  ADMIN = 'admin',
}

// Define the actions that can be performed on resources
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  APPROVE = 'approve',
}

// Define the permissions for each role and resource
const permissions: Record<Role, Record<Resource, Action[]>> = {
  [Role.CLIENT]: {
    [Resource.SESSION]: [Action.READ, Action.LIST],
    [Resource.REFLECTION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.FILE]: [Action.CREATE, Action.READ, Action.DELETE, Action.LIST],
    [Resource.USER]: [Action.READ, Action.UPDATE],
    [Resource.ADMIN]: [],
  },
  [Role.COACH]: {
    [Resource.SESSION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.REFLECTION]: [Action.READ, Action.LIST],
    [Resource.FILE]: [Action.CREATE, Action.READ, Action.DELETE, Action.LIST],
    [Resource.USER]: [Action.READ, Action.UPDATE],
    [Resource.ADMIN]: [],
  },
  [Role.ADMIN]: {
    [Resource.SESSION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.REFLECTION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.FILE]: [Action.CREATE, Action.READ, Action.DELETE, Action.LIST],
    [Resource.USER]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.LIST],
    [Resource.ADMIN]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.LIST,
      Action.APPROVE,
    ],
  },
};

// Check if a user has permission to perform an action on a resource
export const hasPermission = (user: Express.User, resource: Resource, action: Action): boolean => {
  const role = user.role as Role;
  return permissions[role]?.[resource]?.includes(action) || false;
};

// Middleware to check if a user has permission to perform an action on a resource
export const checkPermission = (resource: Resource, action: Action) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if the user has permission to perform the action on the resource
      if (!hasPermission(req.user, resource, action)) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

// Middleware to check if a user has permission to access a specific resource by ID
export const checkResourcePermission = (
  resource: Resource,
  action: Action,
  getResourceUserId: (resourceId: string) => Promise<string | null>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID is required' });
      }

      // Get the user ID of the resource owner
      const resourceUserId = await getResourceUserId(resourceId);
      if (!resourceUserId) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Admin can access any resource
      if (req.user.role === Role.ADMIN) {
        return next();
      }

      // Check if the user is the owner of the resource
      if (resourceUserId === req.user.id.toString()) {
        return next();
      }

      // Check if the user has permission to perform the action on the resource
      if (!hasPermission(req.user, resource, action)) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }

      next();
    } catch (error) {
      console.error('Resource permission check error:', error);
      res.status(500).json({ error: 'Error checking resource permissions' });
    }
  };
};
