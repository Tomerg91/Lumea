import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { getNumericUserId } from '../../utils';

// Admin role check middleware
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = getNumericUserId(req);

    // Check if the user is an admin
    const result = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    const user = result[0];

    // Compare as string to avoid TypeScript errors with role type
    if (!user || (user.role as string) !== 'admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Server error during admin verification' });
  }
};
