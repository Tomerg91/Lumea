import { Request, Response, NextFunction } from 'express';
import { APIError } from './error.js';

/**
 * Attribute-based access-control (ABAC) policy definition.
 * Every policy receives the current user context + resource attributes and
 * returns true if access should be granted.
 */
export type ABACPolicy = (ctx: ABACContext) => Promise<boolean> | boolean;

export interface ABACContext {
  req: Request;
  // Authenticated user (may be undefined for anonymous)
  user?: {
    id: string;
    role: string;
    organizationId?: string;
    permissions?: string[];
  };
  // Resource attributes relevant for the check (ownerId, privacy flags, etc.)
  resource?: Record<string, any>;
}

// ----------------------------------------------------------------------------
// Central registry for policies so routes can reference by name
// ----------------------------------------------------------------------------
const policyRegistry = new Map<string, ABACPolicy>();

export function registerPolicy(name: string, policy: ABACPolicy) {
  policyRegistry.set(name, policy);
}

export function getPolicy(name: string): ABACPolicy | undefined {
  return policyRegistry.get(name);
}

/**
 * ABAC middleware factory.
 * Usage: app.get('/api/secret', abac('canViewSecret'), handler)
 */
export function abac(policyName: string | ABACPolicy) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as ABACContext['user'];
      const resource = (req as any).resource as ABACContext['resource'];
      const ctx: ABACContext = { req, user, resource };

      // Policy lookup or direct function
      const policyFn: ABACPolicy | undefined =
        typeof policyName === 'string' ? getPolicy(policyName) : policyName;

      if (!policyFn) {
        throw APIError.internal(`ABAC policy '${policyName}' not found`);
      }

      const allowed = await policyFn(ctx);
      if (!allowed) {
        return next(APIError.forbidden('Access denied by ABAC policy'));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// ----------------------------------------------------------------------------
// Default/common policies
// ----------------------------------------------------------------------------

// Allow if user is admin
registerPolicy('isAdmin', ({ user }) => user?.role === 'admin');

// Allow if user owns the resource (req.resource.ownerId) or admin
registerPolicy('isOwnerOrAdmin', ({ user, resource }) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return resource?.ownerId?.toString() === user.id;
});

// Placeholder for PHI consent check – can be expanded later
registerPolicy('hasPHIConsent', async ({ user, resource }) => {
  if (!user) return false;
  // If resource marks consentRequired, deny unless user has consent
  if (!resource?.consentRequired) return true;
  // Simplified: check resource.consentingUserIds array
  return (resource.consentingUserIds as string[] | undefined)?.includes(user.id);
}); 