import { Request, Response, NextFunction } from 'express';
import { APIError } from './error.js';

/**
 * Middleware that enforces a human-friendly reason for accessing sensitive resources.
 * Checks req.resource.privacy.requireReasonForAccess or sensitiveContent flag.
 * Accepts reason via header `x-access-reason` or query/body `reasonForAccess`.
 */
export function requireAccessReason() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const resource: any = (req as any).resource;
    if (!resource) return next();
    const requires = resource.privacy?.requireReasonForAccess || resource.privacy?.sensitiveContent;
    if (!requires) return next();
    const reason = (req.headers['x-access-reason'] as string) || (req.query.reasonForAccess as string) || (req.body?.reasonForAccess as string);
    if (!reason || reason.trim().length < 5) {
      return next(APIError.validation('Access to this resource requires a reasonForAccess (min 5 chars) via header X-Access-Reason or param reasonForAccess'));
    }
    (req as any).accessReason = reason.trim();
    return next();
  };
} 