import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { IUser } from '../models/User.js';

export const coachController = {
  // Get coach's clients
  getClients: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const coachId = req.user.id;

      // Find sessions with this coach
      const sessions = await Session.find({ coachId })
        .select('clientId')
        .distinct('clientId');

      // Find clients who have sessions with this coach
      const clients = await User.find({
        _id: { $in: sessions },
        role: 'client',
        status: 'active',
      })
        .select('_id name email createdAt')
        .sort({ name: 1 });

      // Get session details for each client
      const clientsWithSessions = await Promise.all(
        clients.map(async (client) => {
          const clientSessions = await Session.find({
            coachId,
            clientId: client._id,
          })
            .select('_id status paymentStatus dateTime')
            .sort({ dateTime: -1 });

          return {
            ...client.toObject(),
            sessions: clientSessions,
          };
        })
      );

      res.json(clientsWithSessions);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  },
}; 