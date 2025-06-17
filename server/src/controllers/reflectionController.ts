// @ts-nocheck
import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase, serverTables } from '../lib/supabase.js';
import type { Reflection, ReflectionInsert, ReflectionUpdate } from '../../../shared/types/database';

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
};
