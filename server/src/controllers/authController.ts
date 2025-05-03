import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { Role } from '../models/Role';
import { z } from 'zod';
import { validateInviteToken, invalidateInviteToken } from '../utils/tokenHelpers';
import bcrypt from 'bcryptjs';

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

export const authController = {
  // Register a client with an invitation token
  registerWithInvite: async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;
      
      if (!token) {
        res.status(400).json({ message: 'Invitation token is required' });
        return;
      }
      
      // Validate invitation token
      const inviteToken = await validateInviteToken(token);
      
      if (!inviteToken) {
        res.status(400).json({ message: 'Invalid or expired invitation token' });
        return;
      }
      
      // Validate request body
      try {
        clientRegisterSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: 'Invalid registration data', errors: error.errors });
          return;
        }
        throw error;
      }
      
      const { firstName, lastName, email, password } = req.body;
      
      // Verify email matches the invited email
      if (email.toLowerCase() !== inviteToken.email.toLowerCase()) {
        res.status(400).json({ message: 'Email does not match the invitation' });
        return;
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: 'A user with this email already exists' });
        return;
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Get client role
      const clientRole = await Role.findOne({ name: 'client' });
      
      if (!clientRole) {
        res.status(500).json({ message: 'Client role not found' });
        return;
      }
      
      // Create user
      const user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: clientRole._id,
        coachId: inviteToken.coachId,
        isActive: true,
        isApproved: true
      });
      
      // Invalidate the used token
      await invalidateInviteToken(token);
      
      // Return success response with non-sensitive user data
      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: 'client'
        }
      });
    } catch (error) {
      console.error('Error registering client with invite:', error);
      res.status(500).json({ message: 'Error processing registration' });
    }
  },

  // Update user profile
  updateProfile: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;
      const data = profileUpdateSchema.parse(req.body);

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: data },
        { new: true, select: '_id name email role language timezone createdAt updatedAt' }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid profile data', errors: error.errors });
      }
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  },

  // Get current user
  getCurrentUser: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;

      const user = await User.findById(userId).select(
        '_id name email role language timezone createdAt updatedAt'
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ message: 'Failed to fetch current user' });
    }
  },
};
