// @ts-nocheck
import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Reflection, IReflectionAnswer, IReflectionQuestion } from '../models/Reflection';
import {
  ReflectionTemplates,
  ReflectionTemplateType,
  IReflectionTemplate,
} from '../models/ReflectionTemplate';
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

function maskReflectionForUser(reflection: any, user: { id: string; role: string }) {
  if (!user) return reflection;
  const isClient = reflection.clientId?._id?.toString?.() === user.id || reflection.clientId?.toString?.() === user.id;
  const isAdmin = user.role === 'admin';
  const isCoach = reflection.coachId?._id?.toString?.() === user.id || reflection.coachId?.toString?.() === user.id;
  const coachCanView = isCoach && reflection.sharedWithCoach;
  if (isClient || isAdmin || coachCanView) {
    return reflection;
  }
  // Else redact answers
  const obj = JSON.parse(JSON.stringify(reflection));
  if (Array.isArray(obj.answers)) {
    obj.answers = obj.answers.map((ans: any) => ({ ...ans, value: '[REDACTED]', followUpAnswer: undefined }));
  }
  return obj;
}

export const reflectionController = {
  // Get reflection form template for a session
  async getReflectionForm(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.sessionId;
      const templateType = (req.query.template as ReflectionTemplateType) || 'standard';

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
          sessionStatus: session.status,
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

      res.json(maskReflectionForUser(reflection, req.user));
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
          sessionStatus: session.status,
        });
      }

      // Find existing reflection or create new one
      let reflection = await Reflection.findOne({ sessionId, clientId: req.user.id });

      if (reflection) {
        // Update existing reflection
        reflection.answers = validatedData.answers as IReflectionAnswer[];
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
        message:
          validatedData.status === 'submitted'
            ? 'Reflection submitted successfully'
            : 'Reflection saved as draft',
        reflection: maskReflectionForUser(reflection, req.user),
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
      if (req.user.role !== 'admin' && reflection.clientId.toString() !== req.user.id.toString()) {
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
        reflections: reflections.map(r => maskReflectionForUser(r, req.user)),
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
        reflections: reflections.map(r => maskReflectionForUser(r, req.user)),
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

  // Create a new reflection
  async createReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Validate request body
      const validatedData = saveReflectionSchema.parse(req.body);
      const { sessionId } = req.body;

      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: 'Valid session ID is required' });
      }

      // Check if session exists and verify it's completed
      const session = await CoachingSession.findById(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only clients can create reflections for their own sessions
      if (req.user.role !== 'admin' && session.clientId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Only clients can create their own reflections' });
      }

      // Only allow reflections for completed sessions
      if (session.status !== 'completed') {
        return res.status(400).json({
          error: 'Reflections can only be created for completed sessions',
          sessionStatus: session.status,
        });
      }

      // Check if reflection already exists
      const existingReflection = await Reflection.findOne({ sessionId, clientId: req.user.id });
      if (existingReflection) {
        return res.status(409).json({ error: 'Reflection already exists for this session' });
      }

      // Create new reflection
      const reflection = new Reflection({
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

      // Populate related data for response
      await reflection.populate('clientId', 'firstName lastName email');
      await reflection.populate('coachId', 'firstName lastName email');

      res.status(201).json({
        message:
          validatedData.status === 'submitted'
            ? 'Reflection submitted successfully'
            : 'Reflection created as draft',
        reflection: maskReflectionForUser(reflection, req.user),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
      } else {
        console.error('Error creating reflection:', error);
        res.status(500).json({ error: 'Failed to create reflection' });
      }
    }
  },

  // Get all reflections with optional filtering
  async getReflections(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const sessionId = req.query.sessionId as string;

      // Build query based on user role
      const query: any = {};

      if (req.user.role === 'client') {
        query.clientId = req.user.id;
      } else if (req.user.role === 'coach') {
        query.coachId = req.user.id;
        query.status = 'submitted'; // Coaches only see submitted reflections
      }
      // Admins can see all reflections (no additional filter)

      // Add session filter if provided
      if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
        query.sessionId = sessionId;
      }

      const reflections = await Reflection.find(query)
        .populate({
          path: 'sessionId',
          select: 'date status notes',
        })
        .populate('clientId', 'firstName lastName email')
        .populate('coachId', 'firstName lastName email')
        .sort({ submittedAt: -1, lastSavedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Reflection.countDocuments(query);

      res.json({
        reflections: reflections.map(r => maskReflectionForUser(r, req.user)),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error getting reflections:', error);
      res.status(500).json({ error: 'Failed to get reflections' });
    }
  },

  // Get all reflections for a specific session
  async getSessionReflections(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params.sessionId;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID format' });
      }

      // Check if session exists and user has access
      const session = await CoachingSession.findById(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check authorization
      if (
        req.user.role !== 'admin' &&
        session.clientId.toString() !== req.user.id.toString() &&
        session.coachId.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({ error: 'Not authorized to access this session' });
      }

      // Build query based on user role
      const query: any = { sessionId };

      if (req.user.role === 'coach') {
        query.status = 'submitted'; // Coaches only see submitted reflections
      }

      const reflections = await Reflection.find(query)
        .populate('clientId', 'firstName lastName email')
        .populate('coachId', 'firstName lastName email')
        .sort({ submittedAt: -1, lastSavedAt: -1 });

      res.json({ reflections: reflections.map(r => maskReflectionForUser(r, req.user)) });
    } catch (error) {
      console.error('Error getting session reflections:', error);
      res.status(500).json({ error: 'Failed to get session reflections' });
    }
  },

  // Update an existing reflection
  async updateReflection(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const reflectionId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(reflectionId)) {
        return res.status(400).json({ error: 'Invalid reflection ID format' });
      }

      // Validate request body
      const validatedData = saveReflectionSchema.parse(req.body);

      // Find the reflection
      const reflection = await Reflection.findById(reflectionId);

      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Only clients can update their own reflections (and admins)
      if (req.user.role !== 'admin' && reflection.clientId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this reflection' });
      }

      // Don't allow updates to submitted reflections unless admin
      if (reflection.status === 'submitted' && req.user.role !== 'admin') {
        return res.status(400).json({ error: 'Cannot update submitted reflections' });
      }

      // Update reflection
      reflection.answers = validatedData.answers as IReflectionAnswer[];
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

      // Populate related data for response
      await reflection.populate('clientId', 'firstName lastName email');
      await reflection.populate('coachId', 'firstName lastName email');

      res.json({
        message:
          validatedData.status === 'submitted'
            ? 'Reflection submitted successfully'
            : 'Reflection updated successfully',
        reflection: maskReflectionForUser(reflection, req.user),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
      } else {
        console.error('Error updating reflection:', error);
        res.status(500).json({ error: 'Failed to update reflection' });
      }
    }
  },

  // Share reflection with coach
  async shareWithCoach(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const reflectionId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(reflectionId)) {
        return res.status(400).json({ error: 'Invalid reflection ID format' });
      }

      // Find the reflection
      const reflection = await Reflection.findById(reflectionId);

      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Only clients can share their own reflections
      if (req.user.role !== 'admin' && reflection.clientId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Not authorized to share this reflection' });
      }

      // Can only share submitted reflections
      if (reflection.status !== 'submitted') {
        return res.status(400).json({ error: 'Only submitted reflections can be shared' });
      }

      // Update reflection to mark as shared
      reflection.sharedWithCoach = true;
      reflection.sharedAt = new Date();
      await reflection.save();

      res.json({
        message: 'Reflection shared with coach successfully',
        reflection: maskReflectionForUser(reflection, req.user),
      });
    } catch (error) {
      console.error('Error sharing reflection:', error);
      res.status(500).json({ error: 'Failed to share reflection' });
    }
  },

  // Enhanced reflection history with advanced filtering and search
  async getReflectionHistory(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const {
        page = 1,
        limit = 20,
        search,
        status,
        dateFrom,
        dateTo,
        category,
        sortBy = 'submittedAt',
        sortOrder = 'desc',
        clientId,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build base query based on user role
      const query: any = {};

      if (req.user.role === 'client') {
        query.clientId = req.user.id;
      } else if (req.user.role === 'coach') {
        query.coachId = req.user.id;
        query.status = 'submitted'; // Coaches only see submitted reflections
        if (clientId) {
          query.clientId = clientId;
        }
      } else if (req.user.role === 'admin') {
        // Admins can filter by clientId if provided
        if (clientId) {
          query.clientId = clientId;
        }
      }

      // Add status filter
      if (status && status !== 'all') {
        query.status = status;
      }

      // Add date range filter
      if (dateFrom || dateTo) {
        query.submittedAt = {};
        if (dateFrom) {
          query.submittedAt.$gte = new Date(dateFrom as string);
        }
        if (dateTo) {
          query.submittedAt.$lte = new Date(dateTo as string);
        }
      }

      // Add text search across reflection answers
      if (search) {
        query.$or = [
          { 'answers.value': { $regex: search, $options: 'i' } },
          { 'answers.followUpAnswer': { $regex: search, $options: 'i' } },
        ];
      }

      // Add category filter (search in answer questionIds)
      if (category) {
        query['answers.questionId'] = { $regex: `^${category}`, $options: 'i' };
      }

      // Build sort object
      const sortObj: any = {};
      if (sortBy === 'submittedAt' || sortBy === 'lastSavedAt' || sortBy === 'createdAt') {
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
      } else {
        sortObj.submittedAt = -1; // Default sort
      }

      // Execute query with aggregation for better performance
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'coachingsessions',
            localField: 'sessionId',
            foreignField: '_id',
            as: 'session',
            pipeline: [{ $project: { date: 1, status: 1, notes: 1 } }],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'clientId',
            foreignField: '_id',
            as: 'client',
            pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'coachId',
            foreignField: '_id',
            as: 'coach',
            pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }],
          },
        },
        { $sort: sortObj },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limitNum }],
            count: [{ $count: 'total' }],
          },
        },
      ];

      const [result] = await Reflection.aggregate(pipeline);
      const reflections = result.data;
      const total = result.count[0]?.total || 0;

      res.json({
        reflections: reflections.map(r => maskReflectionForUser(r, req.user)),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        filters: {
          search,
          status,
          dateFrom,
          dateTo,
          category,
          sortBy,
          sortOrder,
        },
      });
    } catch (error) {
      console.error('Error getting reflection history:', error);
      res.status(500).json({ error: 'Failed to get reflection history' });
    }
  },

  // Reflection analytics and insights
  async getReflectionAnalytics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { clientId, dateFrom, dateTo } = req.query;

      // Build base query based on user role
      const matchQuery: any = {};

      if (req.user.role === 'client') {
        matchQuery.clientId = new mongoose.Types.ObjectId(req.user.id);
      } else if (req.user.role === 'coach') {
        matchQuery.coachId = new mongoose.Types.ObjectId(req.user.id);
        matchQuery.status = 'submitted';
        if (clientId) {
          matchQuery.clientId = new mongoose.Types.ObjectId(clientId as string);
        }
      } else if (req.user.role === 'admin') {
        if (clientId) {
          matchQuery.clientId = new mongoose.Types.ObjectId(clientId as string);
        }
      }

      // Add date range filter
      if (dateFrom || dateTo) {
        matchQuery.submittedAt = {};
        if (dateFrom) {
          matchQuery.submittedAt.$gte = new Date(dateFrom as string);
        }
        if (dateTo) {
          matchQuery.submittedAt.$lte = new Date(dateTo as string);
        }
      }

      const pipeline = [
        { $match: matchQuery },
        {
          $facet: {
            // Overall statistics
            overview: [
              {
                $group: {
                  _id: null,
                  totalReflections: { $sum: 1 },
                  submittedReflections: {
                    $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] },
                  },
                  draftReflections: {
                    $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] },
                  },
                  avgCompletionTime: { $avg: '$actualCompletionMinutes' },
                  earliestReflection: { $min: '$submittedAt' },
                  latestReflection: { $max: '$submittedAt' },
                },
              },
            ],

            // Monthly trends
            monthlyTrends: [
              {
                $group: {
                  _id: {
                    year: { $year: '$submittedAt' },
                    month: { $month: '$submittedAt' },
                  },
                  count: { $sum: 1 },
                  avgCompletionTime: { $avg: '$actualCompletionMinutes' },
                },
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } },
              { $limit: 12 }, // Last 12 months
            ],

            // Category analysis
            categoryInsights: [
              { $unwind: '$answers' },
              {
                $group: {
                  _id: {
                    $substr: ['$answers.questionId', 0, { $indexOfBytes: ['$answers.questionId', '_'] }],
                  },
                  count: { $sum: 1 },
                  averageScaleValue: {
                    $avg: {
                      $cond: [
                        { $type: '$answers.value' },
                        { $cond: [{ $eq: [{ $type: '$answers.value' }, 'number'] }, '$answers.value', null] },
                        null,
                      ],
                    },
                  },
                },
              },
              { $sort: { count: -1 } },
            ],

            // Completion time analysis
            completionTimeStats: [
              {
                $group: {
                  _id: null,
                  avgTime: { $avg: '$actualCompletionMinutes' },
                  minTime: { $min: '$actualCompletionMinutes' },
                  maxTime: { $max: '$actualCompletionMinutes' },
                  medianTime: { $median: '$actualCompletionMinutes' },
                },
              },
            ],

            // Weekly pattern analysis
            weeklyPatterns: [
              {
                $group: {
                  _id: { $dayOfWeek: '$submittedAt' },
                  count: { $sum: 1 },
                  avgCompletionTime: { $avg: '$actualCompletionMinutes' },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ];

      const [analytics] = await Reflection.aggregate(pipeline);

      // Process and format the results
      const overview = analytics.overview[0] || {
        totalReflections: 0,
        submittedReflections: 0,
        draftReflections: 0,
        avgCompletionTime: 0,
        earliestReflection: null,
        latestReflection: null,
      };

      const monthlyTrends = analytics.monthlyTrends.map((trend: any) => ({
        month: `${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}`,
        count: trend.count,
        avgCompletionTime: Math.round(trend.avgCompletionTime || 0),
      }));

      const categoryInsights = analytics.categoryInsights.map((category: any) => ({
        category: category._id,
        responses: category.count,
        averageScore: category.averageScaleValue ? Math.round(category.averageScaleValue * 10) / 10 : null,
      }));

      const weeklyPatterns = analytics.weeklyPatterns.map((pattern: any) => ({
        dayOfWeek: pattern._id,
        count: pattern.count,
        avgCompletionTime: Math.round(pattern.avgCompletionTime || 0),
      }));

      const completionStats = analytics.completionTimeStats[0] || {
        avgTime: 0,
        minTime: 0,
        maxTime: 0,
        medianTime: 0,
      };

      res.json({
        overview: {
          ...overview,
          completionRate: overview.totalReflections > 0 
            ? Math.round((overview.submittedReflections / overview.totalReflections) * 100)
            : 0,
          avgCompletionTime: Math.round(overview.avgCompletionTime || 0),
        },
        trends: {
          monthly: monthlyTrends,
          weekly: weeklyPatterns,
        },
        insights: {
          categories: categoryInsights,
          completionTime: {
            average: Math.round(completionStats.avgTime || 0),
            minimum: Math.round(completionStats.minTime || 0),
            maximum: Math.round(completionStats.maxTime || 0),
            median: Math.round(completionStats.medianTime || 0),
          },
        },
      });
    } catch (error) {
      console.error('Error generating reflection analytics:', error);
      res.status(500).json({ error: 'Failed to generate reflection analytics' });
    }
  },

  // Search reflections with full-text search capabilities
  async searchReflections(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { q: searchQuery, limit = 10, categories, dateFrom, dateTo } = req.query;

      if (!searchQuery) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      // Build base query based on user role
      const baseQuery: any = {};

      if (req.user.role === 'client') {
        baseQuery.clientId = new mongoose.Types.ObjectId(req.user.id);
      } else if (req.user.role === 'coach') {
        baseQuery.coachId = new mongoose.Types.ObjectId(req.user.id);
        baseQuery.status = 'submitted';
      }

      // Build search pipeline
      const pipeline = [
        { $match: baseQuery },
        
        // Add text search across answers
        {
          $match: {
            $or: [
              { 'answers.value': { $regex: searchQuery, $options: 'i' } },
              { 'answers.followUpAnswer': { $regex: searchQuery, $options: 'i' } },
            ],
          },
        },

        // Add category filter if provided
        ...(categories
          ? [
              {
                $match: {
                  'answers.questionId': {
                    $in: (categories as string).split(',').map(cat => new RegExp(`^${cat}`, 'i')),
                  },
                },
              },
            ]
          : []),

        // Add date range filter
        ...(dateFrom || dateTo
          ? [
              {
                $match: {
                  submittedAt: {
                    ...(dateFrom && { $gte: new Date(dateFrom as string) }),
                    ...(dateTo && { $lte: new Date(dateTo as string) }),
                  },
                },
              },
            ]
          : []),

        // Add relevance scoring based on match quality
        {
          $addFields: {
            relevanceScore: {
              $sum: [
                // Score for exact matches in answers
                {
                  $size: {
                    $filter: {
                      input: '$answers',
                      cond: {
                        $regexMatch: {
                          input: { $toString: '$$this.value' },
                          regex: searchQuery,
                          options: 'i',
                        },
                      },
                    },
                  },
                },
                // Score for partial matches
                {
                  $multiply: [
                    0.5,
                    {
                      $size: {
                        $filter: {
                          input: '$answers',
                          cond: {
                            $regexMatch: {
                              input: { $toString: '$$this.value' },
                              regex: `.*${searchQuery}.*`,
                              options: 'i',
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              ],
            },
          },
        },

        // Sort by relevance and date
        { $sort: { relevanceScore: -1, submittedAt: -1 } },

        // Limit results
        { $limit: parseInt(limit as string) },

        // Populate related data
        {
          $lookup: {
            from: 'coachingsessions',
            localField: 'sessionId',
            foreignField: '_id',
            as: 'session',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'clientId',
            foreignField: '_id',
            as: 'client',
          },
        },

        // Project only needed fields
        {
          $project: {
            _id: 1,
            submittedAt: 1,
            status: 1,
            relevanceScore: 1,
            matchingAnswers: {
              $filter: {
                input: '$answers',
                cond: {
                  $or: [
                    {
                      $regexMatch: {
                        input: { $toString: '$$this.value' },
                        regex: searchQuery,
                        options: 'i',
                      },
                    },
                    {
                      $regexMatch: {
                        input: { $ifNull: ['$$this.followUpAnswer', ''] },
                        regex: searchQuery,
                        options: 'i',
                      },
                    },
                  ],
                },
              },
            },
            session: { $arrayElemAt: ['$session', 0] },
            client: { $arrayElemAt: ['$client', 0] },
          },
        },
      ];

      const results = await Reflection.aggregate(pipeline);

      res.json({
        query: searchQuery,
        results: results.map((result: any) => ({
          reflectionId: result._id,
          sessionDate: result.session?.date,
          submittedAt: result.submittedAt,
          relevanceScore: result.relevanceScore,
          matches: result.matchingAnswers.length,
          preview: result.matchingAnswers.slice(0, 2).map((answer: any) => ({
            questionId: answer.questionId,
            value: typeof answer.value === 'string' ? answer.value.substring(0, 200) : answer.value,
            followUpAnswer: answer.followUpAnswer ? answer.followUpAnswer.substring(0, 200) : null,
          })),
          client: req.user.role !== 'client' ? {
            name: `${result.client?.firstName} ${result.client?.lastName}`,
            email: result.client?.email,
          } : null,
        })),
        total: results.length,
      });
    } catch (error) {
      console.error('Error searching reflections:', error);
      res.status(500).json({ error: 'Failed to search reflections' });
    }
  },
};
