import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase, serverTables } from '../lib/supabase';
import type { User, UserUpdate } from '../../../shared/types/database';

// Validation schema for user profile updates
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  bio: z.string().optional(),
});

export const userController = {
  // Export user data
  exportData: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userId = req.user.id;

      // Fetch user's sessions using typed tables
      const { data: sessions, error: sessionsError } = await serverTables.sessions()
        .select(`
          *,
          coach:users!sessions_coach_id_fkey(id, name, email),
          client:users!sessions_client_id_fkey(id, name, email)
        `)
        .or(`coach_id.eq.${userId},client_id.eq.${userId}`);

      if (sessionsError) {
        console.error('Error fetching sessions for export:', sessionsError);
        res.status(500).json({ error: 'Failed to fetch sessions data' });
        return;
      }

      // Fetch user's reflections using typed tables
      const { data: reflections, error: reflectionsError } = await serverTables.reflections()
        .select('*')
        .eq('user_id', userId);

      if (reflectionsError) {
        console.error('Error fetching reflections for export:', reflectionsError);
        res.status(500).json({ error: 'Failed to fetch reflections data' });
        return;
      }

      // Fetch user's coach notes if they are a coach
      let coachNotes = null;
      if (req.user.role === 'coach') {
        const { data: notes, error: notesError } = await serverTables.coach_notes()
          .select('*')
          .eq('coach_id', userId);

        if (!notesError) {
          coachNotes = notes;
        }
      }

      // Fetch user's files
      const { data: files, error: filesError } = await serverTables.files()
        .select('*')
        .eq('uploaded_by', userId);

      // Prepare data for export
      const exportData = {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
        sessions: sessions || [],
        reflections: reflections || [],
        ...(coachNotes && { coachNotes }),
        files: files || [],
        exportedAt: new Date().toISOString(),
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
  updateCurrentUserProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const userId = req.user.id;

      // Validate request body
      try {
        const validatedData = updateProfileSchema.parse(req.body);
        const { name, bio } = validatedData;

        if (!name && bio === undefined) {
          res.status(400).json({ message: 'No updateable fields provided' });
          return;
        }

        // Prepare update data with proper typing
        const updateData: UserUpdate = {
          updated_at: new Date().toISOString(),
        };

        if (name !== undefined) updateData.name = name;
        if (bio !== undefined) updateData.bio = bio;

        const { data: updatedUser, error } = await serverTables.users()
          .update(updateData)
          .eq('id', userId)
          .select('id, email, name, role, bio')
          .single();

        if (error) {
          console.error('Error updating user profile:', error);
          res.status(500).json({ message: 'Error updating profile' });
          return;
        }

        if (!updatedUser) {
          res.status(404).json({ message: 'User not found' });
          return;
        }

        // Construct response payload
        const responsePayload = {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name || undefined,
          role: updatedUser.role,
          bio: updatedUser.bio || undefined,
        };

        res.json(responsePayload);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: 'Invalid profile data', details: error.errors });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Error updating profile' });
    }
  },

  // Get current user profile
  getCurrentUserProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const userId = req.user.id;

      const { data: user, error } = await serverTables.users()
        .select('id, email, name, role, bio, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Error fetching profile' });
        return;
      }

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
        bio: user.bio || undefined,
        memberSince: user.created_at,
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ message: 'Error getting profile' });
    }
  },

  // Delete current user account (GDPR compliance)
  deleteCurrentUser: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const userId = req.user.id;

      // Note: In a real implementation, you might want to:
      // 1. Anonymize rather than delete data
      // 2. Handle cascading deletes more carefully
      // 3. Send confirmation emails
      // 4. Log the deletion for audit purposes

      const { error } = await serverTables.users()
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({ message: 'Error deleting account' });
        return;
      }

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Error deleting user account:', error);
      res.status(500).json({ message: 'Error deleting account' });
    }
  },
};
