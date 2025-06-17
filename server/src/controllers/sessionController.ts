import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase, serverTables } from '../lib/supabase.js';
import type { Session, SessionInsert, SessionUpdate, SessionStatus } from '../../../shared/types/database';

// Validation schema for creating a session using Supabase field names
const createSessionSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format'),
  coach_id: z.string().uuid('Invalid coach ID format'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  notes: z.string().optional(),
  status: z.enum(['Upcoming', 'Completed', 'Cancelled', 'Rescheduled']).optional().default('Upcoming'),
});

// Validation schema for query parameters
const getSessionsQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  status: z.enum(['Upcoming', 'Completed', 'Cancelled', 'Rescheduled']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  page: z.coerce.number().min(1).optional().default(1),
});

// Validation schema for updating session status
const updateSessionStatusSchema = z.object({
  status: z.enum(['Upcoming', 'Completed', 'Cancelled', 'Rescheduled']),
});

// Validation schema for updating session details
const updateSessionDetailsSchema = z.object({
  client_id: z.string().uuid().optional(),
  coach_id: z.string().uuid().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }).optional(),
  notes: z.string().optional(),
  status: z.enum(['Upcoming', 'Completed', 'Cancelled', 'Rescheduled']).optional(),
});

export const sessionController = {
  // Get sessions for a coach, optionally filtered by client_id
  getSessions: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Validate query parameters
      try {
        const validatedQuery = getSessionsQuerySchema.parse(req.query);
        const { client_id, status, limit, page } = validatedQuery;

        // Build query for sessions table
        let query = serverTables.sessions()
          .select('*, users!sessions_client_id_fkey(name, email), users!sessions_coach_id_fkey(name, email)')
          .eq('coach_id', req.user.id);

        // Apply optional filters
        if (client_id) {
          query = query.eq('client_id', client_id);
        }
        if (status) {
          query = query.eq('status', status);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        
        const { data: sessions, error, count } = await query
          .range(from, to)
          .order('date', { ascending: false });

        if (error) {
          console.error('Error fetching sessions:', error);
          res.status(500).json({ message: 'Failed to fetch sessions', error: error.message });
          return;
        }

        // Return sessions with pagination info
        res.json({
          sessions: sessions || [],
          pagination: {
            total: count || 0,
            page,
            limit,
            pages: Math.ceil((count || 0) / limit),
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
        const validatedData = createSessionSchema.parse(req.body);
        
        // Ensure coach_id matches authenticated user (unless admin)
        if (req.user.role !== 'admin' && validatedData.coach_id !== req.user.id) {
          res.status(403).json({ message: 'Cannot create sessions for other coaches' });
          return;
        }

        const sessionData: SessionInsert = {
          client_id: validatedData.client_id,
          coach_id: validatedData.coach_id,
          date: new Date(validatedData.date).toISOString(),
          notes: validatedData.notes || null,
          status: validatedData.status,
          reminder_sent: false,
        };

        const { data: session, error } = await serverTables.sessions()
          .insert(sessionData)
          .select('*, users!sessions_client_id_fkey(name, email), users!sessions_coach_id_fkey(name, email)')
          .single();

        if (error) {
          console.error('Error creating session:', error);
          res.status(500).json({ message: 'Failed to create session', error: error.message });
          return;
        }

        // TODO: Schedule notifications for the new session
        // await notificationScheduler.scheduleSessionReminders(session);

        res.status(201).json({
          message: 'Session created successfully',
          session,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: 'Invalid session data', errors: error.errors });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ message: 'Failed to create session' });
    }
  },

  // Get a session by ID
  getSession: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.id;

      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
        res.status(400).json({ error: 'Invalid session ID format' });
        return;
      }

      const { data: session, error } = await serverTables.sessions()
        .select('*, users!sessions_client_id_fkey(id, name, email), users!sessions_coach_id_fkey(id, name, email)')
        .eq('id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.status(404).json({ error: 'Session not found' });
          return;
        }
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
        return;
      }

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Check authorization - coaches can see their sessions, clients can see their sessions
      if (
        req.user.role !== 'admin' &&
        session.coach_id !== req.user.id &&
        session.client_id !== req.user.id
      ) {
        res.status(403).json({ error: 'Not authorized to view this session' });
        return;
      }

      res.json({ session });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  },

  // Get sessions for a specific coach
  getCoachSessions: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const coachId = req.params.coachId;
      
      // Validate authorization
      if (req.user.role !== 'admin' && req.user.id !== coachId) {
        res.status(403).json({ error: 'Not authorized to view these sessions' });
        return;
      }

      const { data: sessions, error } = await serverTables.sessions()
        .select('*, users!sessions_client_id_fkey(name, email)')
        .eq('coach_id', coachId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching coach sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
        return;
      }

      res.json({ sessions: sessions || [] });
    } catch (error) {
      console.error('Error getting coach sessions:', error);
      res.status(500).json({ error: 'Failed to get coach sessions' });
    }
  },

  // Get sessions for a specific client
  getClientSessions: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const clientId = req.params.clientId;
      
      // Validate authorization
      if (req.user.role !== 'admin' && req.user.role !== 'coach' && req.user.id !== clientId) {
        res.status(403).json({ error: 'Not authorized to view these sessions' });
        return;
      }

      const { data: sessions, error } = await serverTables.sessions()
        .select('*, users!sessions_coach_id_fkey(name, email)')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching client sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
        return;
      }

      res.json({ sessions: sessions || [] });
    } catch (error) {
      console.error('Error getting client sessions:', error);
      res.status(500).json({ error: 'Failed to get client sessions' });
    }
  },

  // Update a session
  updateSession: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.id;

      // Validate request body
      try {
        const validatedData = updateSessionDetailsSchema.parse(req.body);
        
        // First, get the existing session to check authorization
        const { data: existingSession, error: fetchError } = await serverTables.sessions()
          .select('*')
          .eq('id', sessionId)
          .single();

        if (fetchError || !existingSession) {
          res.status(404).json({ error: 'Session not found' });
          return;
        }

        // Check authorization
        if (req.user.role !== 'admin' && existingSession.coach_id !== req.user.id) {
          res.status(403).json({ error: 'Not authorized to update this session' });
          return;
        }

        // Prepare update data
        const updateData: SessionUpdate = {};
        if (validatedData.client_id) updateData.client_id = validatedData.client_id;
        if (validatedData.coach_id) updateData.coach_id = validatedData.coach_id;
        if (validatedData.date) updateData.date = new Date(validatedData.date).toISOString();
        if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
        if (validatedData.status) updateData.status = validatedData.status;
        
        updateData.updated_at = new Date().toISOString();

        const { data: session, error } = await serverTables.sessions()
          .update(updateData)
          .eq('id', sessionId)
          .select('*, users!sessions_client_id_fkey(name, email), users!sessions_coach_id_fkey(name, email)')
          .single();

        if (error) {
          console.error('Error updating session:', error);
          res.status(500).json({ error: 'Failed to update session' });
          return;
        }

        res.json({
          message: 'Session updated successfully',
          session,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: 'Invalid session data', errors: error.errors });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  },

  // Delete a session
  deleteSession: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.id;

      // First, get the existing session to check authorization
      const { data: existingSession, error: fetchError } = await serverTables.sessions()
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError || !existingSession) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Check authorization
      if (req.user.role !== 'admin' && existingSession.coach_id !== req.user.id) {
        res.status(403).json({ error: 'Not authorized to delete this session' });
        return;
      }

      const { error } = await serverTables.sessions()
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
        return;
      }

      res.json({ message: 'Session deleted successfully' });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  },

  // Get upcoming sessions
  getUpcomingSessions: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const now = new Date().toISOString();
      
      let query = serverTables.sessions()
        .select('*, users!sessions_client_id_fkey(name, email), users!sessions_coach_id_fkey(name, email)')
        .eq('status', 'Upcoming')
        .gte('date', now)
        .order('date', { ascending: true });

      // Filter by user role
      if (req.user.role === 'coach') {
        query = query.eq('coach_id', req.user.id);
      } else if (req.user.role === 'client') {
        query = query.eq('client_id', req.user.id);
      }
      // Admin can see all sessions (no additional filtering)

      const { data: sessions, error } = await query;

      if (error) {
        console.error('Error fetching upcoming sessions:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming sessions' });
        return;
      }

      res.json({ sessions: sessions || [] });
    } catch (error) {
      console.error('Error getting upcoming sessions:', error);
      res.status(500).json({ error: 'Failed to get upcoming sessions' });
    }
  },

  // Get past sessions
  getPastSessions: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      let query = serverTables.sessions()
        .select('*, users!sessions_client_id_fkey(name, email), users!sessions_coach_id_fkey(name, email)')
        .in('status', ['Completed', 'Cancelled'])
        .order('date', { ascending: false });

      // Filter by user role
      if (req.user.role === 'coach') {
        query = query.eq('coach_id', req.user.id);
      } else if (req.user.role === 'client') {
        query = query.eq('client_id', req.user.id);
      }
      // Admin can see all sessions (no additional filtering)

      const { data: sessions, error } = await query;

      if (error) {
        console.error('Error fetching past sessions:', error);
        res.status(500).json({ error: 'Failed to fetch past sessions' });
        return;
      }

      res.json({ sessions: sessions || [] });
    } catch (error) {
      console.error('Error getting past sessions:', error);
      res.status(500).json({ error: 'Failed to get past sessions' });
    }
  },

  // Update session status
  updateSessionStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.id;

      // Validate request body
      try {
        const { status } = updateSessionStatusSchema.parse(req.body);

        // First, get the existing session to check authorization
        const { data: existingSession, error: fetchError } = await serverTables.sessions()
          .select('*')
          .eq('id', sessionId)
          .single();

        if (fetchError || !existingSession) {
          res.status(404).json({ error: 'Session not found' });
          return;
        }

        // Check authorization
        if (req.user.role !== 'admin' && existingSession.coach_id !== req.user.id) {
          res.status(403).json({ error: 'Not authorized to update this session' });
          return;
        }

        const { data: session, error } = await serverTables.sessions()
          .update({ 
            status, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', sessionId)
          .select('*, users!sessions_client_id_fkey(name, email), users!sessions_coach_id_fkey(name, email)')
          .single();

        if (error) {
          console.error('Error updating session status:', error);
          res.status(500).json({ error: 'Failed to update session status' });
          return;
        }

        res.json({
          message: 'Session status updated successfully',
          session,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: 'Invalid status data', errors: error.errors });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error updating session status:', error);
      res.status(500).json({ error: 'Failed to update session status' });
    }
  },
};
