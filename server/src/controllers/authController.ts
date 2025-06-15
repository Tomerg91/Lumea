import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateInviteToken, invalidateInviteToken } from '../utils/tokenHelpers';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase.js';

// Validation schema for profile update
const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  language: z.enum(['he', 'en']).optional(),
  timezone: z.string().optional(),
});

// Validation schema for client registration with invite
const clientRegisterSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

// Zod schema for signup validation
const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(12, 'Password must be at least 12 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  role: z.enum(['client', 'coach']), // 'admin' role should not be assignable via public signup
});

// Define a type for the data validated by the schema
type SignupData = z.infer<typeof signupSchema>;

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = signupSchema.parse(req.body);

    // Check if user already exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
      }
    });

    if (authError) {
      console.error('Supabase auth creation error:', authError);
      return res.status(500).json({ message: 'Failed to create user account' });
    }

    // Create user record in our users table
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        name,
        email,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      console.error('User table creation error:', userError);
      // Clean up auth user if table insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ message: 'Failed to complete user registration' });
    }

    // For compatibility with existing session-based auth, we can create a session token
    // In a full Supabase migration, this would be replaced with Supabase Auth tokens
    const { password: _, ...userResponse } = newUser;
    return res.status(201).json(userResponse);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const validatedData = profileUpdateSchema.parse(req.body);
    
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ message: 'Failed to update profile' });
    }

    const { password: _, ...userResponse } = updatedUser;
    return res.json(userResponse);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Profile update error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const registerWithInvite = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password } = clientRegisterSchema.parse(req.body);
    const { token } = req.params;

    // Validate invite token
    const tokenValidation = await validateInviteToken(token);
    if (!tokenValidation) {
      return res.status(400).json({ message: 'Invalid or expired invite token' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const fullName = `${firstName} ${lastName}`;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        role: 'client',
      }
    });

    if (authError) {
      console.error('Supabase auth creation error:', authError);
      return res.status(500).json({ message: 'Failed to create user account' });
    }

    // Create user record in our users table
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        name: fullName,
        email,
        role: 'client',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      console.error('User table creation error:', userError);
      // Clean up auth user if table insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ message: 'Failed to complete user registration' });
    }

    // Invalidate the invite token
    await invalidateInviteToken(token);

    const { password: _, ...userResponse } = newUser;
    return res.status(201).json({
      message: 'Registration successful',
      user: userResponse
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Registration with invite error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
