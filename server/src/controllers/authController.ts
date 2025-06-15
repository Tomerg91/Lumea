import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { Role } from '../models/Role';
import { z } from 'zod';
import { validateInviteToken, invalidateInviteToken } from '../utils/tokenHelpers';
import bcrypt from 'bcryptjs';
import { db } from '../../db';
import { users, insertUserSchema, User as DrizzleUser } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import mongoose from 'mongoose';

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

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [newUser] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role,
    }).returning();

    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }
      
      const { password, ...userResponse } = newUser;
      return res.status(201).json(userResponse);
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    return next(error);
  }
};

// Other controller functions can be defined and exported here
// e.g. export const updateProfile = ...
