import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Reflection, IReflectionAnswer, IReflectionQuestion } from '../models/Reflection';
import { ReflectionTemplates, ReflectionTemplateType, IReflectionTemplate } from '../models/ReflectionTemplate';
import { CoachingSession } from '../models/CoachingSession';
import { User } from '../models/User';

// Validation schema for reflection answers
const reflectionAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
  followUpAnswer: z.string().optional(),
});

// Validation schema for saving/updating reflections
const saveReflectionSchema = z.object({
  answers: z.array(reflectionAnswerSchema),
  status: z.enum(['draft', 'submitted']).optional(),
  estimatedCompletionMinutes: z.number().optional(),
  actualCompletionMinutes: z.number().optional(),
});

export const reflectionController = {
  // Get reflection form template for a session
  async getReflectionForm(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.sessionId;
      const templateType = req.query.template as ReflectionTemplateType || 'standard';

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }

      // Check if session exists and user has access
      const session = await CoachingSession.findById(sessionId)
        .populate('clientId', 'firstName lastName email')
        .populate('coachId', 'firstName lastName email');

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check authorization - clients can only access their own sessions, coaches can access their sessions
      if (
        req.user.role !== 'admin' &&
        session.clientId._id.toString() !== req.user.id.toString() &&
        session.coachId._id.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({ error: 'Not authorized to access this session' });
      }

      // Only allow reflection forms for completed sessions
      if (session.status !== 'completed') {
        return res.status(400).json({ 
          error: 'Reflection forms are only available for completed sessions',
          sessionStatus: session.status 
        });
      }

      // Get the reflection template
      const template = ReflectionTemplates.getTemplate(templateType);
      
      // Also provide backward-compatible simple questions
      const questions = ReflectionTemplates.templateToQuestions(template);

      // Get available templates for template selection
      const availableTemplates = ReflectionTemplates.getAvailableTemplates();

      res.json({
        sessionId: session._id,
        sessionDate: session.date,
        client: {
          _id: (session.clientId as any)._id,
          firstName: (session.clientId as any).firstName,
          lastName: (session.clientId as any).lastName,
        },
        coach: {
          _id: (session.coachId as any)._id,
          firstName: (session.coachId as any).firstName,
          lastName: (session.coachId as any).lastName,
        },
        template, // Enhanced template with sections
        questions, // Backward-compatible flat questions
        availableTemplates, // List of available templates
        estimatedCompletionMinutes: template.estimatedMinutes,
      });
    } catch (error) {
      console.error('Error getting reflection form:', error);
      res.status(500).json({ error: 'Failed to get reflection form' });
    }
  },

  // Get existing reflection for a session
  async getReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.sessionId;

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }

      // Find the reflection
      const reflection = await Reflection.findOne({ sessionId })
        .populate('sessionId')
        .populate('clientId', 'firstName lastName email')
        .populate('coachId', 'firstName lastName email');

      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Check authorization - clients can access their own, coaches can access their clients'
      if (
        req.user.role !== 'admin' &&
        reflection.clientId._id.toString() !== req.user.id.toString() &&
        reflection.coachId._id.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({ error: 'Not authorized to access this reflection' });
      }

      res.json(reflection);
    } catch (error) {
      console.error('Error getting reflection:', error);
      res.status(500).json({ error: 'Failed to get reflection' });
    }
  },

  // Save or update reflection
  async saveReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.sessionId;

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }

      // Validate request body
      const validatedData = saveReflectionSchema.parse(req.body);

      // Check if session exists and verify it's completed
      const session = await CoachingSession.findById(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only clients can save reflections for their own sessions
      if (req.user.role !== 'admin' && session.clientId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Only clients can save their own reflections' });
      }

      // Only allow reflections for completed sessions
      if (session.status !== 'completed') {
        return res.status(400).json({ 
          error: 'Reflections can only be saved for completed sessions',
          sessionStatus: session.status 
        });
      }

      // Find existing reflection or create new one
      let reflection = await Reflection.findOne({ sessionId, clientId: req.user.id });

      if (reflection) {
        // Update existing reflection
        reflection.answers = validatedData.answers;
        reflection.status = validatedData.status || reflection.status;
        reflection.version += 1; // Increment version for concurrency control
        
        if (validatedData.estimatedCompletionMinutes) {
          reflection.estimatedCompletionMinutes = validatedData.estimatedCompletionMinutes;
        }
        
        if (validatedData.actualCompletionMinutes) {
          reflection.actualCompletionMinutes = validatedData.actualCompletionMinutes;
        }

        if (validatedData.status === 'submitted' && !reflection.submittedAt) {
          reflection.submittedAt = new Date();
        }

        await reflection.save();
      } else {
        // Create new reflection
        reflection = new Reflection({
          sessionId,
          clientId: req.user.id,
          coachId: session.coachId,
          answers: validatedData.answers,
          status: validatedData.status || 'draft',
          estimatedCompletionMinutes: validatedData.estimatedCompletionMinutes,
          actualCompletionMinutes: validatedData.actualCompletionMinutes,
          submittedAt: validatedData.status === 'submitted' ? new Date() : undefined,
        });

        await reflection.save();
      }

      // Populate related data for response
      await reflection.populate('clientId', 'firstName lastName email');
      await reflection.populate('coachId', 'firstName lastName email');

      res.json({
        message: validatedData.status === 'submitted' ? 'Reflection submitted successfully' : 'Reflection saved as draft',
        reflection,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
      } else {
        console.error('Error saving reflection:', error);
        res.status(500).json({ error: 'Failed to save reflection' });
      }
    }
  },

  // Delete reflection
  async deleteReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.sessionId;

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }

      // Find the reflection
      const reflection = await Reflection.findOne({ sessionId });

      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Only clients can delete their own reflections (and admins)
      if (
        req.user.role !== 'admin' &&
        reflection.clientId.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({ error: 'Not authorized to delete this reflection' });
      }

      // Don't allow deletion of submitted reflections
      if (reflection.status === 'submitted') {
        return res.status(400).json({ error: 'Cannot delete submitted reflections' });
      }

      await Reflection.findByIdAndDelete(reflection._id);

      res.json({ message: 'Reflection deleted successfully' });
    } catch (error) {
      console.error('Error deleting reflection:', error);
      res.status(500).json({ error: 'Failed to delete reflection' });
    }
  },

  // Get all reflections for a client (for their dashboard)
  async getClientReflections(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Only clients can access this endpoint (or admins with clientId param)
      let clientId = req.user.id;
      
      if (req.user.role === 'admin' && req.query.clientId) {
        clientId = req.query.clientId as string;
      } else if (req.user.role !== 'client') {
        return res.status(403).json({ error: 'Only clients can access their reflections' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Get reflections with populated session data
      const reflections = await Reflection.find({ clientId })
        .populate({
          path: 'sessionId',
          select: 'date status notes',
        })
        .populate('coachId', 'firstName lastName email')
        .sort({ submittedAt: -1, lastSavedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Reflection.countDocuments({ clientId });

      res.json({
        reflections,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error getting client reflections:', error);
      res.status(500).json({ error: 'Failed to get client reflections' });
    }
  },

  // Get all reflections for a coach (to view their clients' reflections)
  async getCoachReflections(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Only coaches can access this endpoint (or admins)
      if (req.user.role !== 'coach' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only coaches can access client reflections' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const clientId = req.query.clientId as string; // Optional filter by client

      // Build query
      const query: any = { coachId: req.user.id, status: 'submitted' }; // Only show submitted reflections
      if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
        query.clientId = clientId;
      }

      // Get reflections with populated data
      const reflections = await Reflection.find(query)
        .populate({
          path: 'sessionId',
          select: 'date status notes',
        })
        .populate('clientId', 'firstName lastName email')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Reflection.countDocuments(query);

      res.json({
        reflections,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error getting coach reflections:', error);
      res.status(500).json({ error: 'Failed to get coach reflections' });
    }
  },
};
