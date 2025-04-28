import { Request, Response } from 'express';
import { User, IUser } from '../models/User.js';
import { z } from 'zod';

// Validation schema for profile update
const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  language: z.enum(['he', 'en']).optional(),
  timezone: z.string().optional(),
});

export const authController = {
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

      const user = await User.findById(userId)
        .select('_id name email role language timezone createdAt updatedAt');

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