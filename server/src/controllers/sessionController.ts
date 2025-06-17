import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase, serverTables } from '../lib/supabase.js';
import type { Session, SessionInsert, SessionUpdate, SessionStatus } from '../../../shared/types/database';
import { supabaseNotificationService } from '../services/supabaseNotificationService.js';

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

        // Schedule notifications for the new session
        if (session) {
          const scheduled = await supabaseNotificationService.scheduleSessionReminders({
            session_id: session.id,
            client_id: session.client_id,
            coach_id: session.coach_id,
            session_date: session.date,
          });
          
          if (scheduled) {
            console.log(`[SessionController] Reminders scheduled for session ${session.id}`);
          } else {
            console.warn(`[SessionController] Failed to schedule reminders for session ${session.id}`);
          }
        }

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

        // Handle notification updates if session date or status changed
        if (session) {
          if (validatedData.date && validatedData.date !== existingSession.date) {
            // If date changed, cancel old reminders and schedule new ones
            await supabaseNotificationService.cancelSessionReminders(sessionId);
            await supabaseNotificationService.scheduleSessionReminders({
              session_id: session.id,
              client_id: session.client_id,
              coach_id: session.coach_id,
              session_date: session.date,
            });
            console.log(`[SessionController] Rescheduled reminders for session ${session.id}`);
          }
          
          if (validatedData.status && ['Cancelled', 'Completed'].includes(validatedData.status)) {
            // Cancel reminders for cancelled or completed sessions
            await supabaseNotificationService.cancelSessionReminders(sessionId);
            console.log(`[SessionController] Cancelled reminders for ${validatedData.status.toLowerCase()} session ${session.id}`);
          }
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

      // Cancel any scheduled reminders for the deleted session
      await supabaseNotificationService.cancelSessionReminders(sessionId);
      console.log(`[SessionController] Cancelled reminders for deleted session ${sessionId}`);

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

        // Handle notification updates for status changes
        if (session && ['Cancelled', 'Completed'].includes(status)) {
          await supabaseNotificationService.cancelSessionReminders(sessionId);
          console.log(`[SessionController] Cancelled reminders for ${status.toLowerCase()} session ${sessionId}`);
        } else if (session && status === 'Upcoming' && existingSession.status !== 'Upcoming') {
          // If changing back to upcoming, reschedule reminders
          await supabaseNotificationService.scheduleSessionReminders({
            session_id: session.id,
            client_id: session.client_id,
            coach_id: session.coach_id,
            session_date: session.date,
          });
          console.log(`[SessionController] Rescheduled reminders for upcoming session ${sessionId}`);
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

  // Cancel a session with business rules
  cancelSession: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.id;
      const { reason, reasonText } = req.body;

      // Validate cancellation reason
      const validReasons = ['coach_emergency', 'client_request', 'illness', 'scheduling_conflict', 'technical_issues', 'weather', 'personal_emergency', 'other'];
      if (!reason || !validReasons.includes(reason)) {
        res.status(400).json({ error: 'Invalid cancellation reason' });
        return;
      }

      // Get the existing session to check authorization and timing
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
        res.status(403).json({ error: 'Not authorized to cancel this session' });
        return;
      }

      // Check if session is already cancelled or completed
      if (['Cancelled', 'Completed'].includes(existingSession.status)) {
        res.status(400).json({ error: `Session is already ${existingSession.status.toLowerCase()}` });
        return;
      }

      // Check minimum notice requirement (24 hours)
      const sessionDate = new Date(existingSession.date);
      const now = new Date();
      const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilSession < 24) {
        // Allow cancellation but note it's late
        console.warn(`Late cancellation for session ${sessionId}: ${hoursUntilSession.toFixed(1)} hours notice`);
      }

      // Update session status and add cancellation details
      const updateData = {
        status: 'Cancelled' as SessionStatus,
        notes: existingSession.notes 
          ? `${existingSession.notes}\n\nCancelled: ${reason}${reasonText ? ` - ${reasonText}` : ''}`
          : `Cancelled: ${reason}${reasonText ? ` - ${reasonText}` : ''}`,
        updated_at: new Date().toISOString(),
      };

      const { data: session, error } = await serverTables.sessions()
        .update(updateData)
        .eq('id', sessionId)
        .select('*, users!sessions_client_id_fkey(name, email), users!sessions_coach_id_fkey(name, email)')
        .single();

      if (error) {
        console.error('Error cancelling session:', error);
        res.status(500).json({ error: 'Failed to cancel session' });
        return;
      }

      // Cancel any scheduled reminders
      await supabaseNotificationService.cancelSessionReminders(sessionId);
      console.log(`[SessionController] Cancelled reminders for cancelled session ${sessionId}`);

      res.json({
        success: true,
        message: 'Session cancelled successfully',
        session,
      });
    } catch (error) {
      console.error('Error cancelling session:', error);
      res.status(500).json({ error: 'Failed to cancel session' });
    }
  },

  // Reschedule a session with conflict detection
  rescheduleSession: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.id;
      const { newDate, reason } = req.body;

      // Validate inputs
      if (!newDate || !reason) {
        res.status(400).json({ error: 'New date and reason are required' });
        return;
      }

      // Validate new date format and ensure it's in the future
      const newDateTime = new Date(newDate);
      if (isNaN(newDateTime.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      if (newDateTime <= new Date()) {
        res.status(400).json({ error: 'New date must be in the future' });
        return;
      }

      // Get the existing session to check authorization
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
        res.status(403).json({ error: 'Not authorized to reschedule this session' });
        return;
      }

      // Check if session can be rescheduled
      if (['Cancelled', 'Completed'].includes(existingSession.status)) {
        res.status(400).json({ error: `Cannot reschedule ${existingSession.status.toLowerCase()} session` });
        return;
      }

      // Check for scheduling conflicts (optional - basic implementation)
      const { data: conflictingSessions, error: conflictError } = await serverTables.sessions()
        .select('id')
        .eq('coach_id', existingSession.coach_id)
        .eq('date', newDateTime.toISOString())
        .eq('status', 'Upcoming')
        .neq('id', sessionId);

      if (conflictError) {
        console.error('Error checking for conflicts:', conflictError);
      } else if (conflictingSessions && conflictingSessions.length > 0) {
        res.status(400).json({ error: 'The requested time slot conflicts with another session' });
        return;
      }

      // Update session with new date and reschedule notes
      const updateData = {
        date: newDateTime.toISOString(),
        notes: existingSession.notes 
          ? `${existingSession.notes}\n\nRescheduled: ${reason}`
          : `Rescheduled: ${reason}`,
        status: 'Upcoming' as SessionStatus,
        updated_at: new Date().toISOString(),
      };

      const { data: session, error } = await serverTables.sessions()
        .update(updateData)
        .eq('id', sessionId)
        .select('*, users!sessions_client_id_fkey(name, email), users!sessions_coach_id_fkey(name, email)')
        .single();

      if (error) {
        console.error('Error rescheduling session:', error);
        res.status(500).json({ error: 'Failed to reschedule session' });
        return;
      }

      // Update reminders for the new date
      if (session) {
        await supabaseNotificationService.cancelSessionReminders(sessionId);
        await supabaseNotificationService.scheduleSessionReminders({
          session_id: session.id,
          client_id: session.client_id,
          coach_id: session.coach_id,
          session_date: session.date,
        });
        console.log(`[SessionController] Rescheduled reminders for session ${sessionId}`);
      }

      res.json({
        success: true,
        message: 'Session rescheduled successfully',
        session,
      });
    } catch (error) {
      console.error('Error rescheduling session:', error);
      res.status(500).json({ error: 'Failed to reschedule session' });
    }
  },

  // Get available time slots for rescheduling
  getAvailableSlots: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.id;
      const { fromDate, toDate, duration = 60 } = req.query;

      // Validate parameters
      if (!fromDate || !toDate) {
        res.status(400).json({ error: 'fromDate and toDate are required' });
        return;
      }

      // Get the session to find coach ID
      const { data: session, error: sessionError } = await serverTables.sessions()
        .select('coach_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Get existing sessions for the coach in the date range
      const { data: existingSessions, error: sessionsError } = await serverTables.sessions()
        .select('date')
        .eq('coach_id', session.coach_id)
        .eq('status', 'Upcoming')
        .gte('date', fromDate as string)
        .lte('date', toDate as string)
        .neq('id', sessionId);

      if (sessionsError) {
        console.error('Error fetching existing sessions:', sessionsError);
        res.status(500).json({ error: 'Failed to fetch existing sessions' });
        return;
      }

      // Generate available slots (simplified version)
      // In a real application, you'd integrate with the coach's calendar
      const startDate = new Date(fromDate as string);
      const endDate = new Date(toDate as string);
      const sessionDuration = parseInt(duration as string) || 60;
      const availableSlots = [];

      // Generate slots for business hours (9 AM - 6 PM)
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Skip weekends for simplicity
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        for (let hour = 9; hour < 18; hour++) {
          const slotStart = new Date(date);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + sessionDuration);

          // Check if this slot conflicts with existing sessions
          const hasConflict = existingSessions?.some(existingSession => {
            const existingDate = new Date(existingSession.date);
            return Math.abs(existingDate.getTime() - slotStart.getTime()) < sessionDuration * 60 * 1000;
          });

          if (!hasConflict && slotStart > new Date()) {
            availableSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
            });
          }
        }
      }

      res.json({
        success: true,
        availableSlots,
        totalSlots: availableSlots.length,
      });
    } catch (error) {
      console.error('Error getting available slots:', error);
      res.status(500).json({ error: 'Failed to get available slots' });
    }
  },
};
