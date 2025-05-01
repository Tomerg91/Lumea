import { Request, Response } from 'express';
import { User, IUser } from '../models/User.js';
import { Session } from '../models/Session.js';
import { Reflection } from '../models/Reflection.js';

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
};
