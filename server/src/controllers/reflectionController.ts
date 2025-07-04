// @ts-nocheck
import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase, serverTables } from '../lib/supabase';
import type { Reflection, ReflectionInsert, ReflectionUpdate } from '../../../shared/types/database';
import { reflectionNotificationService } from '../services/reflectionNotificationService';

// Validation schema for reflection creation
const createReflectionSchema = z.object({
  content: z.string().min(1, 'Reflection content is required'),
  session_id: z.string().uuid().optional(),
  mood: z.enum(['positive', 'neutral', 'negative', 'mixed']).optional(),
});

// Validation schema for reflection updates
const updateReflectionSchema = z.object({
  content: z.string().min(1).optional(),
  session_id: z.string().uuid().optional(),
  mood: z.enum(['positive', 'neutral', 'negative', 'mixed']).optional(),
});

// Validation schema for query parameters
const getReflectionsQuerySchema = z.object({
  session_id: z.string().uuid().optional(),
  mood: z.enum(['positive', 'neutral', 'negative', 'mixed']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  page: z.coerce.number().min(1).optional().default(1),
});

export const reflectionController = {
  // Create a new reflection
  createReflection: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Validate request body
      try {
        const validatedData = createReflectionSchema.parse(req.body);
        
        // If session_id is provided, verify the session exists and user has access
        if (validatedData.session_id) {
          const { data: session, error: sessionError } = await serverTables.sessions()
            .select('id, client_id, coach_id, status')
            .eq('id', validatedData.session_id)
            .single();

          if (sessionError || !session) {
            res.status(404).json({ error: 'Session not found' });
            return;
          }

          // Check authorization - only the client can create reflections for their session
          if (req.user.role !== 'admin' && session.client_id !== req.user.id) {
            res.status(403).json({ error: 'Only clients can create reflections for their own sessions' });
            return;
          }
        }

        const reflectionData: ReflectionInsert = {
          content: validatedData.content,
          user_id: req.user.id,
          session_id: validatedData.session_id || null,
          mood: validatedData.mood || null,
        };

        const { data: reflection, error } = await serverTables.reflections()
          .insert(reflectionData)
          .select('*, users!reflections_user_id_fkey(name, email), sessions!reflections_session_id_fkey(date, status)')
          .single();

        if (error) {
          console.error('Error creating reflection:', error);
          res.status(500).json({ error: 'Failed to create reflection', details: error.message });
          return;
        }

        // Send notification to coach about the new reflection (async, don't wait)
        if (reflection) {
          reflectionNotificationService.notifyCoachOfReflection({
            reflectionId: reflection.id,
            clientId: reflection.user_id,
            sessionId: reflection.session_id || undefined,
            content: reflection.content,
            mood: reflection.mood || undefined,
          }).catch(error => {
            // Log error but don't fail the request - notification is not critical
            console.error('Failed to send reflection notification:', error);
          });
        }

        res.status(201).json({
          message: 'Reflection created successfully',
          reflection,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Invalid reflection data', details: error.errors });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error creating reflection:', error);
      res.status(500).json({ error: 'Failed to create reflection' });
    }
  },

  // Get reflections for the authenticated user
  getReflections: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Validate query parameters
      try {
        const validatedQuery = getReflectionsQuerySchema.parse(req.query);
        const { session_id, mood, limit, page } = validatedQuery;

        // Build query for reflections table
        let query = serverTables.reflections()
          .select('*, users!reflections_user_id_fkey(name, email), sessions!reflections_session_id_fkey(date, status)')
          .order('created_at', { ascending: false });

        // Filter by user role
        if (req.user.role === 'client') {
          query = query.eq('user_id', req.user.id);
        } else if (req.user.role === 'coach') {
          // Coaches can see reflections from their sessions
          query = query
            .select('*, users!reflections_user_id_fkey(name, email), sessions!inner(date, status, coach_id)')
            .eq('sessions.coach_id', req.user.id);
        }
        // Admin can see all reflections (no additional filtering)

        // Apply optional filters
        if (session_id) {
          query = query.eq('session_id', session_id);
        }
        if (mood) {
          query = query.eq('mood', mood);
        }

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        
        const { data: reflections, error, count } = await query
          .range(from, to)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching reflections:', error);
          res.status(500).json({ error: 'Failed to fetch reflections', details: error.message });
          return;
        }

        // Return reflections with pagination info
        res.json({
          reflections: reflections || [],
          pagination: {
            total: count || 0,
            page,
            limit,
            pages: Math.ceil((count || 0) / limit),
          },
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error getting reflections:', error);
      res.status(500).json({ error: 'Failed to get reflections' });
    }
  },

  // Get a specific reflection by ID
  getReflection: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const reflectionId = req.params.id;

      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reflectionId)) {
        res.status(400).json({ error: 'Invalid reflection ID format' });
        return;
      }

      const { data: reflection, error } = await serverTables.reflections()
        .select('*, users!reflections_user_id_fkey(name, email), sessions!reflections_session_id_fkey(date, status, coach_id)')
        .eq('id', reflectionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          res.status(404).json({ error: 'Reflection not found' });
          return;
        }
        console.error('Error fetching reflection:', error);
        res.status(500).json({ error: 'Failed to fetch reflection' });
        return;
      }

      if (!reflection) {
        res.status(404).json({ error: 'Reflection not found' });
        return;
      }

      // Check authorization - users can see their own reflections, coaches can see reflections from their sessions
      if (
        req.user.role !== 'admin' &&
        reflection.user_id !== req.user.id &&
        !(req.user.role === 'coach' && reflection.sessions?.coach_id === req.user.id)
      ) {
        res.status(403).json({ error: 'Not authorized to view this reflection' });
        return;
      }

      res.json({ reflection });
    } catch (error) {
      console.error('Error getting reflection:', error);
      res.status(500).json({ error: 'Failed to get reflection' });
    }
  },

  // Update a reflection
  updateReflection: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const reflectionId = req.params.id;

      // Validate request body
      try {
        const validatedData = updateReflectionSchema.parse(req.body);

        // First, get the existing reflection to check authorization
        const { data: existingReflection, error: fetchError } = await serverTables.reflections()
          .select('*')
          .eq('id', reflectionId)
          .single();

        if (fetchError || !existingReflection) {
          res.status(404).json({ error: 'Reflection not found' });
          return;
        }

        // Check authorization - only the reflection owner can update it
        if (req.user.role !== 'admin' && existingReflection.user_id !== req.user.id) {
          res.status(403).json({ error: 'Not authorized to update this reflection' });
          return;
        }

        // If session_id is being updated, verify the session exists and user has access
        if (validatedData.session_id) {
          const { data: session, error: sessionError } = await serverTables.sessions()
            .select('id, client_id, coach_id, status')
            .eq('id', validatedData.session_id)
            .single();

          if (sessionError || !session) {
            res.status(404).json({ error: 'Session not found' });
            return;
          }

          // Check authorization for the session
          if (req.user.role !== 'admin' && session.client_id !== req.user.id) {
            res.status(403).json({ error: 'Cannot link reflection to sessions you do not own' });
            return;
          }
        }

        // Prepare update data
        const updateData: ReflectionUpdate = {};
        if (validatedData.content) updateData.content = validatedData.content;
        if (validatedData.session_id !== undefined) updateData.session_id = validatedData.session_id;
        if (validatedData.mood !== undefined) updateData.mood = validatedData.mood;
        
        updateData.updated_at = new Date().toISOString();

        const { data: reflection, error } = await serverTables.reflections()
          .update(updateData)
          .eq('id', reflectionId)
          .select('*, users!reflections_user_id_fkey(name, email), sessions!reflections_session_id_fkey(date, status)')
          .single();

        if (error) {
          console.error('Error updating reflection:', error);
          res.status(500).json({ error: 'Failed to update reflection' });
          return;
        }

        res.json({
          message: 'Reflection updated successfully',
          reflection,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Invalid reflection data', details: error.errors });
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error updating reflection:', error);
      res.status(500).json({ error: 'Failed to update reflection' });
    }
  },

  // Delete a reflection
  deleteReflection: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const reflectionId = req.params.id;

      // First, get the existing reflection to check authorization
      const { data: existingReflection, error: fetchError } = await serverTables.reflections()
        .select('*')
        .eq('id', reflectionId)
        .single();

      if (fetchError || !existingReflection) {
        res.status(404).json({ error: 'Reflection not found' });
        return;
      }

      // Check authorization - only the reflection owner can delete it
      if (req.user.role !== 'admin' && existingReflection.user_id !== req.user.id) {
        res.status(403).json({ error: 'Not authorized to delete this reflection' });
        return;
      }

      const { error } = await serverTables.reflections()
        .delete()
        .eq('id', reflectionId);

      if (error) {
        console.error('Error deleting reflection:', error);
        res.status(500).json({ error: 'Failed to delete reflection' });
        return;
      }

      res.json({ message: 'Reflection deleted successfully' });
    } catch (error) {
      console.error('Error deleting reflection:', error);
      res.status(500).json({ error: 'Failed to delete reflection' });
    }
  },

  // Get reflections for a specific session
  getSessionReflections: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.sessionId;

      // First, verify the session exists and user has access
      const { data: session, error: sessionError } = await serverTables.sessions()
        .select('id, client_id, coach_id, status')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Check authorization
      if (
        req.user.role !== 'admin' &&
        session.client_id !== req.user.id &&
        session.coach_id !== req.user.id
      ) {
        res.status(403).json({ error: 'Not authorized to view reflections for this session' });
        return;
      }

      const { data: reflections, error } = await serverTables.reflections()
        .select('*, users!reflections_user_id_fkey(name, email)')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching session reflections:', error);
        res.status(500).json({ error: 'Failed to fetch session reflections' });
        return;
      }

      res.json({ 
        session: {
          id: session.id,
          client_id: session.client_id,
          coach_id: session.coach_id,
          status: session.status,
        },
        reflections: reflections || [] 
      });
    } catch (error) {
      console.error('Error getting session reflections:', error);
      res.status(500).json({ error: 'Failed to get session reflections' });
    }
  },

  // Get reflections by mood
  getReflectionsByMood: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const mood = req.params.mood;

      // Validate mood
      if (!['positive', 'neutral', 'negative', 'mixed'].includes(mood)) {
        res.status(400).json({ error: 'Invalid mood. Must be one of: positive, neutral, negative, mixed' });
        return;
      }

      let query = serverTables.reflections()
        .select('*, users!reflections_user_id_fkey(name, email), sessions!reflections_session_id_fkey(date, status)')
        .eq('mood', mood);

      // Filter by user role
      if (req.user.role === 'client') {
        query = query.eq('user_id', req.user.id);
      } else if (req.user.role === 'coach') {
        // Coaches can see reflections from their sessions
        query = query
          .select('*, users!reflections_user_id_fkey(name, email), sessions!inner(date, status, coach_id)')
          .eq('sessions.coach_id', req.user.id);
      }
      // Admin can see all reflections (no additional filtering)

      const { data: reflections, error } = await query
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reflections by mood:', error);
        res.status(500).json({ error: 'Failed to fetch reflections by mood' });
        return;
      }

      res.json({ 
        mood,
        reflections: reflections || [] 
      });
    } catch (error) {
      console.error('Error getting reflections by mood:', error);
      res.status(500).json({ error: 'Failed to get reflections by mood' });
    }
  },

  // Get reflection statistics
  getReflectionStats: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      let baseQuery = serverTables.reflections().select('mood, created_at');

      // Filter by user role
      if (req.user.role === 'client') {
        baseQuery = baseQuery.eq('user_id', req.user.id);
      } else if (req.user.role === 'coach') {
        // Coaches can see stats from their sessions
        baseQuery = baseQuery
          .select('mood, created_at, sessions!inner(coach_id)')
          .eq('sessions.coach_id', req.user.id);
      }
      // Admin can see all stats (no additional filtering)

      const { data: reflections, error } = await baseQuery;

      if (error) {
        console.error('Error fetching reflection stats:', error);
        res.status(500).json({ error: 'Failed to fetch reflection statistics' });
        return;
      }

      // Calculate statistics
      const stats = {
        total: reflections?.length || 0,
        byMood: {
          positive: 0,
          neutral: 0,
          negative: 0,
          mixed: 0,
          unspecified: 0,
        },
        thisMonth: 0,
        thisWeek: 0,
      };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      reflections?.forEach((reflection) => {
        // Count by mood
        if (reflection.mood) {
          stats.byMood[reflection.mood as keyof typeof stats.byMood]++;
        } else {
          stats.byMood.unspecified++;
        }

        // Count by time period
        const createdAt = new Date(reflection.created_at);
        if (createdAt >= startOfMonth) {
          stats.thisMonth++;
        }
        if (createdAt >= startOfWeek) {
          stats.thisWeek++;
        }
      });

      res.json({ stats });
    } catch (error) {
      console.error('Error getting reflection stats:', error);
      res.status(500).json({ error: 'Failed to get reflection statistics' });
    }
  },

  // Get reflection form template for a session
  getReflectionForm: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.sessionId;

      // Verify the session exists and user has access
      const { data: session, error: sessionError } = await serverTables.sessions()
        .select('id, client_id, coach_id, status')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Check authorization - only the client can access the reflection form
      if (req.user.role !== 'admin' && session.client_id !== req.user.id) {
        res.status(403).json({ error: 'Not authorized to access this reflection form' });
        return;
      }

      // Return a basic reflection form template
      const formTemplate = {
        sessionId: sessionId,
        fields: [
          {
            id: 'content',
            type: 'textarea',
            label: 'Reflection Content',
            placeholder: 'Share your thoughts about this session...',
            required: true,
          },
          {
            id: 'mood',
            type: 'select',
            label: 'How are you feeling?',
            options: [
              { value: 'positive', label: 'Positive' },
              { value: 'neutral', label: 'Neutral' },
              { value: 'negative', label: 'Negative' },
              { value: 'mixed', label: 'Mixed' },
            ],
            required: false,
          },
        ],
      };

      res.json({ form: formTemplate });
    } catch (error) {
      console.error('Error getting reflection form:', error);
      res.status(500).json({ error: 'Failed to get reflection form' });
    }
  },

  // Save/create reflection for a session (alias for createReflection)
  saveReflection: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const sessionId = req.params.sessionId;

      // Add session_id to the request body
      req.body.session_id = sessionId;

      // Check if reflection already exists for this session
      const { data: existingReflection, error: fetchError } = await serverTables.reflections()
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', req.user.id)
        .single();

      if (existingReflection) {
        // Update existing reflection
        req.params.id = existingReflection.id;
        return reflectionController.updateReflection(req, res);
      } else {
        // Create new reflection
        return reflectionController.createReflection(req, res);
      }
    } catch (error) {
      console.error('Error saving reflection:', error);
      res.status(500).json({ error: 'Failed to save reflection' });
    }
  },

  // Get all reflections for a client
  getClientReflections: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Only clients can access their own reflections, or admins can access any client's reflections
      if (req.user.role !== 'client' && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized to access client reflections' });
        return;
      }

      let query = serverTables.reflections()
        .select('*, users!reflections_user_id_fkey(name, email), sessions!reflections_session_id_fkey(date, status)')
        .order('created_at', { ascending: false });

      // Filter by client
      if (req.user.role === 'client') {
        query = query.eq('user_id', req.user.id);
      }
      // Admin can see all client reflections (no additional filtering)

      const { data: reflections, error } = await query;

      if (error) {
        console.error('Error fetching client reflections:', error);
        res.status(500).json({ error: 'Failed to fetch client reflections' });
        return;
      }

      res.json({ reflections: reflections || [] });
    } catch (error) {
      console.error('Error getting client reflections:', error);
      res.status(500).json({ error: 'Failed to get client reflections' });
    }
  },

  // Get all reflections for a coach (from their sessions)
  getCoachReflections: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Only coaches can access reflections from their sessions, or admins can access any coach's reflections
      if (req.user.role !== 'coach' && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized to access coach reflections' });
        return;
      }

      let query = serverTables.reflections()
        .select('*, users!reflections_user_id_fkey(name, email), sessions!inner(date, status, coach_id)')
        .order('created_at', { ascending: false });

      // Filter by coach
      if (req.user.role === 'coach') {
        query = query.eq('sessions.coach_id', req.user.id);
      }
      // Admin can see all coach reflections (no additional filtering)

      const { data: reflections, error } = await query;

      if (error) {
        console.error('Error fetching coach reflections:', error);
        res.status(500).json({ error: 'Failed to fetch coach reflections' });
        return;
      }

      res.json({ reflections: reflections || [] });
    } catch (error) {
      console.error('Error getting coach reflections:', error);
      res.status(500).json({ error: 'Failed to get coach reflections' });
    }
  },

  // Get reflection history with advanced filtering
  getReflectionHistory: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const {
        startDate,
        endDate,
        mood,
        sessionId,
        limit = 50,
        page = 1,
      } = req.query;

      let query = serverTables.reflections()
        .select('*, users!reflections_user_id_fkey(name, email), sessions!reflections_session_id_fkey(date, status)')
        .order('created_at', { ascending: false });

      // Filter by user role
      if (req.user.role === 'client') {
        query = query.eq('user_id', req.user.id);
      } else if (req.user.role === 'coach') {
        query = query
          .select('*, users!reflections_user_id_fkey(name, email), sessions!inner(date, status, coach_id)')
          .eq('sessions.coach_id', req.user.id);
      }
      // Admin can see all reflections (no additional filtering)

      // Apply filters
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      if (mood) {
        query = query.eq('mood', mood);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      // Apply pagination
      const limitNum = Math.min(Number(limit), 100);
      const pageNum = Math.max(Number(page), 1);
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      const { data: reflections, error, count } = await query
        .range(from, to);

      if (error) {
        console.error('Error fetching reflection history:', error);
        res.status(500).json({ error: 'Failed to fetch reflection history' });
        return;
      }

      res.json({
        reflections: reflections || [],
        pagination: {
          total: count || 0,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil((count || 0) / limitNum),
        },
      });
    } catch (error) {
      console.error('Error getting reflection history:', error);
      res.status(500).json({ error: 'Failed to get reflection history' });
    }
  },

  // Get reflection analytics and insights
  getReflectionAnalytics: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      let baseQuery = serverTables.reflections()
        .select('mood, created_at, content, sessions!reflections_session_id_fkey(date)');

      // Filter by user role
      if (req.user.role === 'client') {
        baseQuery = baseQuery.eq('user_id', req.user.id);
      } else if (req.user.role === 'coach') {
        baseQuery = baseQuery
          .select('mood, created_at, content, sessions!inner(date, coach_id)')
          .eq('sessions.coach_id', req.user.id);
      }
      // Admin can see all analytics (no additional filtering)

      const { data: reflections, error } = await baseQuery;

      if (error) {
        console.error('Error fetching reflection analytics:', error);
        res.status(500).json({ error: 'Failed to fetch reflection analytics' });
        return;
      }

      // Calculate analytics
      const analytics = {
        total: reflections?.length || 0,
        moodDistribution: {
          positive: 0,
          neutral: 0,
          negative: 0,
          mixed: 0,
          unspecified: 0,
        },
        timeAnalysis: {
          thisWeek: 0,
          thisMonth: 0,
          last30Days: 0,
          last90Days: 0,
        },
        trends: {
          averageLength: 0,
          mostCommonMood: 'unspecified',
          reflectionFrequency: 0,
        },
      };

      if (reflections && reflections.length > 0) {
        const now = new Date();
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        let totalLength = 0;
        const moodCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0, unspecified: 0 };

        reflections.forEach((reflection) => {
          // Count by mood
          if (reflection.mood) {
            moodCounts[reflection.mood as keyof typeof moodCounts]++;
            analytics.moodDistribution[reflection.mood as keyof typeof analytics.moodDistribution]++;
          } else {
            moodCounts.unspecified++;
            analytics.moodDistribution.unspecified++;
          }

          // Count by time period
          const createdAt = new Date(reflection.created_at);
          if (createdAt >= startOfWeek) analytics.timeAnalysis.thisWeek++;
          if (createdAt >= startOfMonth) analytics.timeAnalysis.thisMonth++;
          if (createdAt >= last30Days) analytics.timeAnalysis.last30Days++;
          if (createdAt >= last90Days) analytics.timeAnalysis.last90Days++;

          // Calculate length
          if (reflection.content) {
            totalLength += reflection.content.length;
          }
        });

        // Calculate trends
        analytics.trends.averageLength = Math.round(totalLength / reflections.length);
        analytics.trends.mostCommonMood = Object.entries(moodCounts)
          .reduce((a, b) => moodCounts[a[0] as keyof typeof moodCounts] > moodCounts[b[0] as keyof typeof moodCounts] ? a : b)[0];
        analytics.trends.reflectionFrequency = Math.round((analytics.timeAnalysis.last30Days / 30) * 10) / 10;
      }

      res.json({ analytics });
    } catch (error) {
      console.error('Error getting reflection analytics:', error);
      res.status(500).json({ error: 'Failed to get reflection analytics' });
    }
  },

  // Search reflections with full-text capabilities
  searchReflections: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { q: searchQuery, mood, limit = 20, page = 1 } = req.query;

      if (!searchQuery || typeof searchQuery !== 'string') {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      let query = serverTables.reflections()
        .select('*, users!reflections_user_id_fkey(name, email), sessions!reflections_session_id_fkey(date, status)')
        .textSearch('content', searchQuery)
        .order('created_at', { ascending: false });

      // Filter by user role
      if (req.user.role === 'client') {
        query = query.eq('user_id', req.user.id);
      } else if (req.user.role === 'coach') {
        query = query
          .select('*, users!reflections_user_id_fkey(name, email), sessions!inner(date, status, coach_id)')
          .eq('sessions.coach_id', req.user.id);
      }
      // Admin can see all reflections (no additional filtering)

      // Apply optional mood filter
      if (mood && ['positive', 'neutral', 'negative', 'mixed'].includes(mood as string)) {
        query = query.eq('mood', mood);
      }

      // Apply pagination
      const limitNum = Math.min(Number(limit), 50);
      const pageNum = Math.max(Number(page), 1);
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      const { data: reflections, error, count } = await query
        .range(from, to);

      if (error) {
        console.error('Error searching reflections:', error);
        res.status(500).json({ error: 'Failed to search reflections' });
        return;
      }

      res.json({
        query: searchQuery,
        reflections: reflections || [],
        pagination: {
          total: count || 0,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil((count || 0) / limitNum),
        },
      });
    } catch (error) {
      console.error('Error searching reflections:', error);
      res.status(500).json({ error: 'Failed to search reflections' });
    }
  },

  // Get recent reflections for dashboard
  getRecentReflections: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const limit = 5; // Get 5 most recent reflections for dashboard

      let query = serverTables.reflections()
        .select('id, content, mood, created_at, sessions!reflections_session_id_fkey(date)')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by user role
      if (req.user.role === 'client') {
        query = query.eq('user_id', req.user.id);
      } else if (req.user.role === 'coach') {
        // Coaches can see reflections from their sessions
        query = query
          .select('id, content, mood, created_at, sessions!inner(date, coach_id)')
          .eq('sessions.coach_id', req.user.id);
      }
      // Admin can see all reflections (no additional filtering)

      const { data: reflections, error } = await query;

      if (error) {
        console.error('Error fetching recent reflections:', error);
        res.status(500).json({ error: 'Failed to fetch recent reflections', details: error.message });
        return;
      }

      // Format reflections for dashboard
      const formattedReflections = (reflections || []).map(reflection => ({
        id: reflection.id,
        title: reflection.mood ? `${getMoodEmoji(reflection.mood)} Reflection` : 'Personal Reflection',
        date: new Date(reflection.created_at).toISOString().split('T')[0],
        mood: getMoodEmoji(reflection.mood),
        preview: reflection.content ? reflection.content.substring(0, 100) + (reflection.content.length > 100 ? '...' : '') : 'No content available'
      }));

      res.json(formattedReflections);
    } catch (error) {
      console.error('Error getting recent reflections:', error);
      res.status(500).json({ error: 'Failed to get recent reflections' });
    }
  },
};

// Helper function to get mood emoji
function getMoodEmoji(mood: string | null): string {
  switch (mood) {
    case 'positive': return '😊';
    case 'negative': return '😔';
    case 'mixed': return '🤔';
    case 'neutral': return '😐';
    default: return '📝';
  }
}
