import { Request, Response } from 'express';
import { User, IUser } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Reflection } from '../models/Reflection.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const userController = {
  // Export user data
  async exportData(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;

      // Fetch user's sessions
      const sessions = await Session.find({
        $or: [{ coachId: userId }, { clientId: userId }],
      })
        .populate('coachId', 'name email')
        .populate('clientId', 'name email')
        .lean();

      // Fetch user's reflections
      const reflections = await Reflection.find({
        userId,
      }).lean();

      // Prepare data for export
      const exportData = {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
        sessions,
        reflections,
      };

      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="satya_coaching_data.json"');

      // Send the data
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting user data:', error);
      res.status(500).json({ error: 'Failed to export user data' });
    }
  },

  // Update current user's profile
  async updateCurrentUserProfile(req: Request, res: Response) {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { name, bio } = req.body;

    // Basic validation
    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ message: 'Invalid name format' });
    }
    if (bio !== undefined && typeof bio !== 'string') {
      return res.status(400).json({ message: 'Invalid bio format' });
    }

    try {
      const dataToUpdate: { name?: string; bio?: string } = {};
      if (name !== undefined) dataToUpdate.name = name;
      if (bio !== undefined) dataToUpdate.bio = bio;

      if (Object.keys(dataToUpdate).length === 0) {
        // If only bio was provided, and it's commented out, this might trigger.
        // For now, if only name is updatable, this means name was not provided.
        return res.status(400).json({ message: 'No updateable fields provided (name is required if bio is disabled)' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          bio: true,
        },
      });

      // Construct payload similar to AuthenticatedUserPayload
      const responsePayload = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name || undefined,
        role: updatedUser.role as 'client' | 'coach' | 'admin',
        bio: updatedUser.bio || undefined,
      };

      res.json(responsePayload);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Error updating profile' });
    }
  },
};
