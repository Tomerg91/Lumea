import { Request, Response } from 'express';
import { CoachingSession, ICoachingSession } from '../models/CoachingSession';
import { z } from 'zod';
import {
  getSessionById,
  getSessionsByCoachId,
  getSessionsByClientId,
  updateSession,
  deleteSession,
  updateSessionSchema,
} from '../storage.js';
import { User } from '../models/User.js';
import { IUser } from '../models/User.js';
import { getNumericUserId } from '../../utils';
import mongoose from 'mongoose';

// Validation schema for creating a session
const createSessionSchema = z.object({
  clientId: z.string().min(1),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  notes: z.string().optional(),
});

// Validation schema for query parameters
const getSessionsQuerySchema = z.object({
  clientId: z.string().optional(),
  limit: z.coerce.number().optional().default(10),
  page: z.coerce.number().optional().default(1),
});

export const sessionController = {
  // Get sessions for a coach, optionally filtered by clientId
  getSessions: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Validate query parameters
      try {
        const validatedQuery = getSessionsQuerySchema.parse(req.query);
        const { clientId, limit, page } = validatedQuery;

        // Build query based on coach ID and optional client ID
        const query: Record<string, unknown> = {
          coachId: req.user.id,
        };

        if (clientId) {
          query.clientId = clientId;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Query sessions
        const sessions = await CoachingSession.find(query)
          .sort({ date: -1 }) // Sort by date descending (newest first)
          .skip(skip)
          .limit(limit)
          .populate('clientId', 'firstName lastName email')
          .lean();

        // Get total count for pagination
        const total = await CoachingSession.countDocuments(query);

        // Return sessions with pagination info
        res.json({
          sessions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: 'Invalid query parameters', errors: error.errors });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error getting sessions:', error);
      res.status(500).json({ message: 'Failed to get sessions' });
    }
  },

  // Create a new session
  createSession: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Validate request body
      try {
        createSessionSchema.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: 'Invalid session data', errors: error.errors });
          return;
        }
        throw error;
      }

      const { clientId, date, notes } = req.body;

      // Create session
      const session = await CoachingSession.create({
        coachId: req.user.id,
        clientId,
        date: new Date(date),
        notes: notes || '',
      });

      // Return created session
      res.status(201).json({
        message: 'Session created successfully',
        session,
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ message: 'Failed to create session' });
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
      const session = await CoachingSession.findById(sessionId);

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
      const session = await CoachingSession.findById(sessionId);

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
      const query: Record<string, unknown> = {
        dateTime: { $gte: now },
        status: 'scheduled',
      };

      if (req.user.role === 'coach') {
        query.coachId = req.user.id;
      } else if (req.user.role === 'client') {
        query.clientId = req.user.id;
      }

      const sessions = await CoachingSession.find(query)
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
      const query: Record<string, unknown> = {
        dateTime: { $lt: now },
        status: { $in: ['completed', 'cancelled'] },
      };

      if (req.user.role === 'coach') {
        query.coachId = req.user.id;
      } else if (req.user.role === 'client') {
        query.clientId = req.user.id;
      }

      const sessions = await CoachingSession.find(query)
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
      const session = await CoachingSession.findById(sessionId);

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
      await CoachingSession.findByIdAndUpdate(sessionId, {
        $set: { clientReflectionReminderSent: true },
      });

      res.json({ message: 'Reminder sent successfully' });
    } catch (error) {
      console.error('Error sending reminder:', error);
      res.status(500).json({ error: 'Failed to send reminder' });
    }
  },
};
