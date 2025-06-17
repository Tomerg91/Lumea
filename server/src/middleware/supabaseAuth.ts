import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { Database, TypedSupabaseClient, DatabaseUser } from '../../../shared/types/database';

// Create typed Supabase client for middleware use
const supabaseUrl = process.env.SUPABASE_URL || 'https://humlrpbtrbjnpnsusils.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bWxycGJ0cmJqbnBuc3VzaWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjQ3MzcsImV4cCI6MjA2MTQwMDczN30.ywX7Zpywze07KqPHwiwn_hECuiblnc4-_dEl0QNU7nU';

const supabase: TypedSupabaseClient = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Define the user object that will be attached to req.user (based on database schema)
export interface SupabaseUser extends Omit<DatabaseUser, 'created_at' | 'updated_at'> {
  // Add any additional properties that might be needed
  [key: string]: unknown;
}

// Update Express Request type for compatibility
declare module 'express-serve-static-core' {
  interface Request {
    user?: SupabaseUser;
  }
}

/**
 * Middleware to verify Supabase JWT token and populate req.user
 */
export const supabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header found' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get additional user data from our users table with proper typing
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      // Continue with basic user data from auth
    }

    // Populate req.user with combined data using proper types
    req.user = {
      id: user.id,
      email: userData?.email || user.email || '',
      name: userData?.name || user.user_metadata?.name || '',
      role: userData?.role || user.user_metadata?.role || 'client',
      phone: userData?.phone || null,
      avatar_url: userData?.avatar_url || null,
      timezone: userData?.timezone || null,
      preferences: userData?.preferences || null,
      is_active: userData?.is_active ?? true,
      last_login_at: userData?.last_login_at || null,
      ...userData, // Include any additional fields from users table
    };

    next();
  } catch (error) {
    console.error('Supabase auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication service error' });
  }
};

/**
 * Middleware to check if user is authenticated (compatible with existing isAuthenticated middleware)
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

/**
 * Middleware to check if user has admin role
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

/**
 * Middleware to check if user has coach role
 */
export const isCoach = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'coach' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Coach access required' });
  }
  
  next();
};

/**
 * Middleware to check if user has client role
 */
export const isClient = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'client' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Client access required' });
  }
  
  next();
};

/**
 * Optional authentication middleware - doesn't fail if no user is present
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header, continue without user
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      // Get additional user data with proper typing
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: userData?.email || user.email || '',
        name: userData?.name || user.user_metadata?.name || '',
        role: userData?.role || user.user_metadata?.role || 'client',
        phone: userData?.phone || null,
        avatar_url: userData?.avatar_url || null,
        timezone: userData?.timezone || null,
        preferences: userData?.preferences || null,
        is_active: userData?.is_active ?? true,
        last_login_at: userData?.last_login_at || null,
        ...userData,
      };
    }

    next();
  } catch (error) {
    // On error, continue without user
    console.error('Optional auth error:', error);
    next();
  }
};

// Export the typed client for use in other middleware/controllers
export { supabase };
export type { TypedSupabaseClient, Database }; 