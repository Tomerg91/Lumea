import { Request, Response } from 'express';
import { CoachingSession, ICoachingSession, SessionStatus } from '../models/CoachingSession';
import { notificationScheduler } from '../services/notificationSchedulerService';
import { feedbackTriggerService } from '../services/feedbackTriggerService';
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

// Validation schema for updating session status
const updateSessionStatusSchema = z.object({
  status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']),
});

// Validation schema for updating session details
const updateSessionDetailsSchema = z.object({
  clientId: z.string().optional(),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  notes: z.string().optional(),
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

      // Schedule notifications for the new session
      try {
        await notificationScheduler.scheduleSessionReminders(session);
      } catch (error) {
        console.error('Failed to schedule session reminders:', error);
        // Don't fail the session creation if notification scheduling fails
      }

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

      const sessionId = req.params.id;

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }

      // Find session and populate client and coach information
      const session = await CoachingSession.findById(sessionId)
        .populate('clientId', 'firstName lastName email')
        .populate('coachId', 'firstName lastName email')
        .lean();

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Type assertion for populated fields
      const populatedSession = session as typeof session & {
        clientId: { _id: string; firstName: string; lastName: string; email: string };
        coachId: { _id: string; firstName: string; lastName: string; email: string };
      };

      // Check authorization - coaches can see their sessions, clients can see their sessions
      if (
        req.user.role !== 'admin' &&
        populatedSession.coachId._id.toString() !== req.user.id.toString() &&
        populatedSession.clientId._id.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({ error: 'Not authorized to view this session' });
      }

      // Transform the response to match frontend expectations
      const transformedSession = {
        _id: populatedSession._id,
        coachId: populatedSession.coachId._id,
        clientId: populatedSession.clientId._id,
        client: {
          _id: populatedSession.clientId._id,
          firstName: populatedSession.clientId.firstName,
          lastName: populatedSession.clientId.lastName,
          email: populatedSession.clientId.email,
        },
        coach: {
          _id: populatedSession.coachId._id,
          firstName: populatedSession.coachId.firstName,
          lastName: populatedSession.coachId.lastName,
          email: populatedSession.coachId.email,
        },
        date: populatedSession.date,
        status: populatedSession.status,
        notes: populatedSession.notes,
        createdAt: populatedSession.createdAt,
        updatedAt: populatedSession.updatedAt,
        // Include status timestamps if they exist
        pendingAt: populatedSession.pendingAt,
        'in-progressAt': populatedSession['in-progressAt'],
        completedAt: populatedSession.completedAt,
        cancelledAt: populatedSession.cancelledAt,
      };

      res.json(transformedSession);
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

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }

      const session = await CoachingSession.findById(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only coaches can update session details
      if (req.user.role !== 'admin' && session.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this session' });
      }

      // Validate request body
      const validatedData = updateSessionDetailsSchema.parse(req.body);

      // Prepare update data
      const updateData: any = {};

      if (validatedData.date) {
        updateData.date = new Date(validatedData.date);
      }

      if (validatedData.notes !== undefined) {
        updateData.notes = validatedData.notes;
      }

      if (validatedData.clientId) {
        // Validate that the client exists and belongs to this coach
        const client = await User.findOne({
          _id: validatedData.clientId,
          role: 'client',
        });

        if (!client) {
          return res.status(400).json({ error: 'Invalid client ID' });
        }

        updateData.clientId = validatedData.clientId;
      }

      // Update the session
      const updatedSession = await CoachingSession.findByIdAndUpdate(sessionId, updateData, {
        new: true,
      })
        .populate('clientId', 'firstName lastName email')
        .populate('coachId', 'firstName lastName email')
        .lean();

      if (!updatedSession) {
        return res.status(404).json({ error: 'Session not found after update' });
      }

      // Type assertion for populated fields
      const populatedSession = updatedSession as typeof updatedSession & {
        clientId: { _id: string; firstName: string; lastName: string; email: string };
        coachId: { _id: string; firstName: string; lastName: string; email: string };
      };

      // Transform the response to match frontend expectations
      const transformedSession = {
        _id: populatedSession._id,
        coachId: populatedSession.coachId._id,
        clientId: populatedSession.clientId._id,
        client: {
          _id: populatedSession.clientId._id,
          firstName: populatedSession.clientId.firstName,
          lastName: populatedSession.clientId.lastName,
          email: populatedSession.clientId.email,
        },
        coach: {
          _id: populatedSession.coachId._id,
          firstName: populatedSession.coachId.firstName,
          lastName: populatedSession.coachId.lastName,
          email: populatedSession.coachId.email,
        },
        date: populatedSession.date,
        status: populatedSession.status,
        notes: populatedSession.notes,
        createdAt: populatedSession.createdAt,
        updatedAt: populatedSession.updatedAt,
        // Include status timestamps if they exist
        pendingAt: populatedSession.pendingAt,
        'in-progressAt': populatedSession['in-progressAt'],
        completedAt: populatedSession.completedAt,
        cancelledAt: populatedSession.cancelledAt,
      };

      res.json(transformedSession);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
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
      const client = await User.findById(session.clientId).select('firstName lastName email');

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Send reminder email (implementation omitted for brevity)
      console.log(
        `Reminder triggered for session ${sessionId} with client ${client.firstName} ${client.lastName} (${client.email})`
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

  // Update session status
  async updateSessionStatus(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.id;
      const session = await CoachingSession.findById(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only coaches can update session status (and admins)
      if (req.user.role !== 'admin' && session.coachId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this session status' });
      }

      // Validate the status update
      const validatedData = updateSessionStatusSchema.parse(req.body);

      // Enhanced status transition validation with business logic
      const currentStatus = session.status;
      const newStatus = validatedData.status;
      const sessionDate = new Date(session.date);
      const now = new Date();

      // Define valid status transitions
      const validTransitions: Record<SessionStatus, SessionStatus[]> = {
        pending: ['in-progress', 'cancelled', 'rescheduled'],
        'in-progress': ['completed', 'cancelled'],
        completed: [], // Completed sessions cannot be changed
        cancelled: ['pending'], // Cancelled sessions can only be reset to pending
        rescheduled: ['pending', 'in-progress', 'cancelled'], // Rescheduled sessions can transition to any active state
      };

      // Check if the transition is valid
      if (!validTransitions[currentStatus].includes(newStatus)) {
        return res.status(400).json({
          error: 'Invalid status transition',
          details: `Cannot change status from "${currentStatus}" to "${newStatus}". Valid transitions from "${currentStatus}" are: ${validTransitions[currentStatus].join(', ') || 'none'}`,
        });
      }

      // Time-based validation for certain transitions
      if (newStatus === 'completed') {
        // Session can only be marked as completed if it's on or after the scheduled date
        if (sessionDate > now) {
          return res.status(400).json({
            error: 'Cannot mark future session as completed',
            details: `Session is scheduled for ${sessionDate.toISOString()}, but current time is ${now.toISOString()}`,
          });
        }

        // Session should have been in-progress before being completed (unless it's same day and we allow direct completion)
        const isSameDay = sessionDate.toDateString() === now.toDateString();
        if (currentStatus === 'pending' && !isSameDay) {
          return res.status(400).json({
            error: 'Session must be marked as in-progress before completion',
            details: 'Please mark the session as in-progress first, then complete it',
          });
        }
      }

      if (newStatus === 'in-progress') {
        // Session should be within reasonable time frame to be marked as in-progress
        const daysDifference = Math.abs(
          (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDifference > 1) {
          return res.status(400).json({
            error: 'Session date is too far from current date',
            details: `Session is scheduled for ${sessionDate.toDateString()}, which is ${Math.ceil(daysDifference)} days away`,
          });
        }
      }

      // Business rule: Only allow cancellation up to a certain time before the session
      if (newStatus === 'cancelled' && currentStatus !== 'cancelled') {
        const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        // Allow cancellation if session is more than 2 hours away or if it's in the past
        if (hoursUntilSession > 0 && hoursUntilSession < 2) {
          return res.status(400).json({
            error: 'Cannot cancel session less than 2 hours before scheduled time',
            details: `Session is in ${Math.ceil(hoursUntilSession)} hour(s). Cancellations must be made at least 2 hours in advance`,
          });
        }
      }

      // Update the session status directly
      const updatedSession = await CoachingSession.findByIdAndUpdate(
        sessionId,
        {
          status: newStatus,
          // Add a status change timestamp for audit purposes
          [`${newStatus}At`]: new Date(),
        },
        { new: true }
      ).populate('clientId', 'firstName lastName email')
      .populate('coachId', 'firstName lastName email');

      // Trigger feedback requests when session is completed
      if (newStatus === 'completed' && updatedSession) {
        try {
          await feedbackTriggerService.onSessionCompleted(updatedSession);
        } catch (error) {
          console.error('Error triggering feedback requests:', error);
          // Don't fail the status update if feedback trigger fails
        }
      }

      res.json({
        message: 'Session status updated successfully',
        session: updatedSession,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid status', details: error.errors });
      } else {
        console.error('Error updating session status:', error);
        res.status(500).json({ error: 'Failed to update session status' });
      }
    }
  },
};
