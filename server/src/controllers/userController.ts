import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export const userController = {
  // Export user data
  async exportData(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;

      // Fetch user's sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          coach:coach_id!inner(id, name, email),
          client:client_id!inner(id, name, email)
        `)
        .or(`coach_id.eq.${userId},client_id.eq.${userId}`);

      if (sessionsError) {
        console.error('Error fetching sessions for export:', sessionsError);
        return res.status(500).json({ error: 'Failed to fetch sessions data' });
      }

      // Fetch user's reflections
      const { data: reflections, error: reflectionsError } = await supabase
        .from('reflections')
        .select('*')
        .eq('user_id', userId);

      if (reflectionsError) {
        console.error('Error fetching reflections for export:', reflectionsError);
        return res.status(500).json({ error: 'Failed to fetch reflections data' });
      }

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
      const dataToUpdate: { name?: string; bio?: string; updated_at?: string } = {};
      if (name !== undefined) dataToUpdate.name = name;
      if (bio !== undefined) dataToUpdate.bio = bio;

      if (Object.keys(dataToUpdate).length === 0) {
        return res
          .status(400)
          .json({ message: 'No updateable fields provided (name is required if bio is disabled)' });
      }

      // Add timestamp
      dataToUpdate.updated_at = new Date().toISOString();

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(dataToUpdate)
        .eq('id', userId)
        .select('id, email, name, role, bio')
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return res.status(500).json({ message: 'Error updating profile' });
      }

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
