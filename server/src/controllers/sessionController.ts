import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createSession,
  getSessionById,
  getSessionsByCoachId,
  getSessionsByClientId,
  updateSession,
  deleteSession,
  createSessionSchema,
  updateSessionSchema,
} from '../storage.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { IUser } from '../models/User.js';
import { getNumericUserId } from '../../utils';

export const sessionController = {
  // Create a new session
  async createSession(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = createSessionSchema.parse({
        ...req.body,
        coachId: req.user.id,
      });

      const session = await createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
      }
    }
  },

  // Get a session by ID
  async getSession(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const session = await getSessionById(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (
        req.user.role !== 'admin' &&
        session.coachId.toString() !== req.user.id.toString() &&
        session.clientId.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({ error: 'Not authorized to view this session' });
      }

      res.json(session);
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  },

  // Get all sessions for a coach
  async getCoachSessions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = getNumericUserId(req);
      const sessions = await getSessionsByCoachId(userId.toString());
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching coach sessions:', error);
      res.status(500).json({ error: 'Failed to fetch coach sessions' });
    }
  },

  // Get all sessions for a client
  async getClientSessions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = getNumericUserId(req);
      const sessions = await getSessionsByClientId(userId.toString());
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching client sessions:', error);
      res.status(500).json({ error: 'Failed to fetch client sessions' });
    }
  },

  // Update a session
  async updateSession(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.id;
      const session = await Session.findById(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (req.user.role !== 'admin' && session.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this session' });
      }

      const validatedData = updateSessionSchema.parse(req.body);
      const updatedSession = await updateSession(sessionId, validatedData);

      res.json(updatedSession);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error updating session:', error);
        res.status(500).json({ error: 'Failed to update session' });
      }
    }
  },

  // Delete a session
  async deleteSession(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.id;
      const session = await Session.findById(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (req.user.role !== 'admin' && session.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to delete this session' });
      }

      await deleteSession(sessionId);
      res.json({ message: 'Session deleted successfully' });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  },

  // Get upcoming sessions
  async getUpcomingSessions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const now = new Date();
      const query: any = {
        dateTime: { $gte: now },
        status: 'scheduled',
      };

      if (req.user.role === 'coach') {
        query.coachId = req.user.id;
      } else if (req.user.role === 'client') {
        query.clientId = req.user.id;
      }

      const sessions = await Session.find(query)
        .sort({ dateTime: 1 })
        .populate('coachId', 'name email')
        .populate('clientId', 'name email');

      res.json(sessions);
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming sessions' });
    }
  },

  // Get past sessions
  async getPastSessions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const now = new Date();
      const query: any = {
        dateTime: { $lt: now },
        status: { $in: ['completed', 'cancelled'] },
      };

      if (req.user.role === 'coach') {
        query.coachId = req.user.id;
      } else if (req.user.role === 'client') {
        query.clientId = req.user.id;
      }

      const sessions = await Session.find(query)
        .sort({ dateTime: -1 })
        .populate('coachId', 'name email')
        .populate('clientId', 'name email');

      res.json(sessions);
    } catch (error) {
      console.error('Error fetching past sessions:', error);
      res.status(500).json({ error: 'Failed to fetch past sessions' });
    }
  },

  // Send reminder for a session
  async sendReminder(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.id;
      const session = await Session.findById(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (req.user.role !== 'admin' && session.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to send reminders for this session' });
      }

      // Get client details
      const client = await User.findById(session.clientId).select('name email');

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Log the reminder (in a real implementation, this would send an email)
      console.log(
        `Reminder triggered for session ${sessionId} with client ${client.name} (${client.email})`
      );

      // Update the session to mark that a reminder was sent
      await Session.findByIdAndUpdate(sessionId, {
        $set: { clientReflectionReminderSent: true },
      });

      res.json({ message: 'Reminder sent successfully' });
    } catch (error) {
      console.error('Error sending reminder:', error);
      res.status(500).json({ error: 'Failed to send reminder' });
    }
  },
};
