import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { SessionFeedback } from '../models/SessionFeedback';
import { FeedbackTemplate } from '../models/FeedbackTemplate';
import { FeedbackAnalytics } from '../models/FeedbackAnalytics';
import { CoachingSession } from '../models/CoachingSession';
import { isAuthenticated, isCoach, isClient } from '../middlewares/auth';
import { cacheResponse, clearCache } from '../middleware/cache';
import { feedbackTriggerService } from '../services/feedbackTriggerService';
import mongoose from 'mongoose';

const router = express.Router();

// Cache configuration for feedback
const FEEDBACK_CACHE_TTL = 300; // 5 minutes
const FEEDBACK_CACHE_PREFIX = 'feedback';
const ANALYTICS_CACHE_TTL = 900; // 15 minutes
const ANALYTICS_CACHE_PREFIX = 'feedback_analytics';

/**
 * POST /api/feedback/session/:sessionId
 * Submit feedback for a session
 */
router.post(
  '/session/:sessionId',
  isAuthenticated,
  clearCache(FEEDBACK_CACHE_PREFIX),
  clearCache(ANALYTICS_CACHE_PREFIX),
  [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
    body('feedbackType')
      .isIn(['coach', 'client'])
      .withMessage('Feedback type must be either coach or client'),
    body('ratings.overallSatisfaction')
      .isInt({ min: 1, max: 5 })
      .withMessage('Overall satisfaction must be between 1 and 5'),
    body('ratings.coachEffectiveness')
      .isInt({ min: 1, max: 5 })
      .withMessage('Coach effectiveness must be between 1 and 5'),
    body('ratings.sessionQuality')
      .isInt({ min: 1, max: 5 })
      .withMessage('Session quality must be between 1 and 5'),
    body('ratings.goalProgress')
      .isInt({ min: 1, max: 5 })
      .withMessage('Goal progress must be between 1 and 5'),
    body('ratings.communicationQuality')
      .isInt({ min: 1, max: 5 })
      .withMessage('Communication quality must be between 1 and 5'),
    body('ratings.wouldRecommend')
      .isInt({ min: 1, max: 5 })
      .withMessage('Would recommend must be between 1 and 5'),
    body('sessionGoalsMet')
      .isBoolean()
      .withMessage('Session goals met must be a boolean'),
    body('overallComments')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Overall comments must be 2000 characters or less'),
    body('sessionGoalsComments')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Session goals comments must be 1000 characters or less'),
    body('challengesFaced')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Challenges faced must be 1000 characters or less'),
    body('successHighlights')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Success highlights must be 1000 characters or less'),
    body('improvementSuggestions')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Improvement suggestions must be 1000 characters or less'),
    body('nextSessionFocus')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Next session focus must be 1000 characters or less'),
    body('privateNotes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Private notes must be 1000 characters or less'),
    body('anonymous')
      .optional()
      .isBoolean()
      .withMessage('Anonymous must be a boolean'),
    body('consentToShare')
      .optional()
      .isBoolean()
      .withMessage('Consent to share must be a boolean'),
    body('confidentialityLevel')
      .optional()
      .isIn(['standard', 'restricted', 'anonymous'])
      .withMessage('Confidentiality level must be standard, restricted, or anonymous'),
    body('answers')
      .optional()
      .isArray()
      .withMessage('Answers must be an array'),
    body('answers.*.questionId')
      .if(body('answers').exists())
      .notEmpty()
      .withMessage('Question ID is required for each answer'),
    body('answers.*.answer')
      .if(body('answers').exists())
      .notEmpty()
      .withMessage('Answer is required for each question'),
    body('responseTime')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Response time must be a positive integer'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Verify session exists and user has access
      const session = await CoachingSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      // Check authorization
      const { feedbackType } = req.body;
      const isAuthorized = 
        (feedbackType === 'coach' && session.coachId.toString() === userId) ||
        (feedbackType === 'client' && session.clientId.toString() === userId) ||
        req.user?.role === 'admin';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to submit this type of feedback for this session',
        });
      }

      // Check if feedback already exists
      const existingFeedback = await SessionFeedback.findOne({
        sessionId,
        feedbackType,
      });

      if (existingFeedback) {
        return res.status(409).json({
          success: false,
          message: 'Feedback already submitted for this session',
        });
      }

      // Calculate due date (48 hours from session completion)
      const dueDate = new Date(session.completedAt || session.date);
      dueDate.setHours(dueDate.getHours() + 48);

      // Create feedback
      const feedbackData = {
        ...req.body,
        sessionId,
        coachId: session.coachId,
        clientId: session.clientId,
        submittedBy: userId,
        status: 'submitted',
        submittedAt: new Date(),
        dueDate,
      };

      const feedback = new SessionFeedback(feedbackData);
      await feedback.save();

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        feedback,
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit feedback',
      });
    }
  }
);

/**
 * GET /api/feedback/session/:sessionId
 * Get feedback for a session
 */
router.get(
  '/session/:sessionId',
  isAuthenticated,
  cacheResponse({ ttl: FEEDBACK_CACHE_TTL, keyPrefix: FEEDBACK_CACHE_PREFIX }),
  [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
    query('type').optional().isIn(['coach', 'client']).withMessage('Type must be coach or client'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { sessionId } = req.params;
      const { type } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Verify session exists and user has access
      const session = await CoachingSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      // Check authorization
      const isAuthorized = 
        session.coachId.toString() === userId ||
        session.clientId.toString() === userId ||
        req.user?.role === 'admin';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view feedback for this session',
        });
      }

      // Build query
      const query: any = { sessionId };
      if (type) {
        query.feedbackType = type;
      }

      const feedbacks = await SessionFeedback.find(query)
        .populate('submittedBy', 'name email')
        .populate('templateId', 'name description')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        feedbacks,
        count: feedbacks.length,
      });
    } catch (error) {
      console.error('Error getting session feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session feedback',
      });
    }
  }
);

/**
 * GET /api/feedback/coach/:coachId/analytics
 * Get feedback analytics for a coach
 */
router.get(
  '/coach/:coachId/analytics',
  isAuthenticated,
  cacheResponse({ ttl: ANALYTICS_CACHE_TTL, keyPrefix: ANALYTICS_CACHE_PREFIX }),
  [
    param('coachId').isMongoId().withMessage('Invalid coach ID'),
    query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid period'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { coachId } = req.params;
      const { period = 'monthly', startDate, endDate } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Check authorization - coaches can view their own analytics, admins can view any
      const isAuthorized = coachId === userId || req.user?.role === 'admin';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view these analytics',
        });
      }

      // Build date filter
      const dateFilter: any = { coachId };
      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string),
        };
      }

      // Get feedback data
      const feedbacks = await SessionFeedback.find(dateFilter)
        .populate('sessionId', 'date duration')
        .sort({ createdAt: -1 });

      // Calculate analytics
      const totalFeedbacks = feedbacks.length;
      const submittedFeedbacks = feedbacks.filter(f => f.status === 'submitted');
      const pendingFeedbacks = feedbacks.filter(f => f.status === 'pending');
      const overdueFeedbacks = feedbacks.filter(f => f.status === 'pending' && new Date() > f.dueDate);

      const responseRate = totalFeedbacks > 0 ? (submittedFeedbacks.length / totalFeedbacks) * 100 : 0;

      // Calculate average ratings
      const avgRatings = submittedFeedbacks.reduce((acc, feedback) => {
        acc.overallSatisfaction += feedback.ratings.overallSatisfaction;
        acc.coachEffectiveness += feedback.ratings.coachEffectiveness;
        acc.sessionQuality += feedback.ratings.sessionQuality;
        acc.goalProgress += feedback.ratings.goalProgress;
        acc.communicationQuality += feedback.ratings.communicationQuality;
        acc.wouldRecommend += feedback.ratings.wouldRecommend;
        return acc;
      }, {
        overallSatisfaction: 0,
        coachEffectiveness: 0,
        sessionQuality: 0,
        goalProgress: 0,
        communicationQuality: 0,
        wouldRecommend: 0,
      });

      const count = submittedFeedbacks.length || 1;
      Object.keys(avgRatings).forEach(key => {
        avgRatings[key as keyof typeof avgRatings] = avgRatings[key as keyof typeof avgRatings] / count;
      });

      const overallAverage = Object.values(avgRatings).reduce((sum, val) => sum + val, 0) / Object.keys(avgRatings).length;

      // Calculate response time average
      const responseTimes = submittedFeedbacks
        .filter(f => f.responseTime)
        .map(f => f.responseTime!);
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 3600 // Convert to hours
        : 0;

      // Calculate session goals met percentage
      const goalsMetCount = submittedFeedbacks.filter(f => f.sessionGoalsMet).length;
      const sessionGoalsMetPercentage = submittedFeedbacks.length > 0 
        ? (goalsMetCount / submittedFeedbacks.length) * 100 
        : 0;

      const analytics = {
        period,
        dateRange: { startDate, endDate },
        metrics: {
          totalFeedbacks,
          submittedCount: submittedFeedbacks.length,
          pendingCount: pendingFeedbacks.length,
          overdueCount: overdueFeedbacks.length,
          responseRate,
          averageResponseTime: avgResponseTime,
        },
        ratings: {
          ...avgRatings,
          overall: overallAverage,
        },
        sessionGoalsMetPercentage,
        sampleSize: submittedFeedbacks.length,
      };

      res.status(200).json({
        success: true,
        analytics,
      });
    } catch (error) {
      console.error('Error getting coach analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get coach analytics',
      });
    }
  }
);

/**
 * GET /api/feedback/client/:clientId/analytics
 * Get feedback analytics for a client
 */
router.get(
  '/client/:clientId/analytics',
  isAuthenticated,
  cacheResponse({ ttl: ANALYTICS_CACHE_TTL, keyPrefix: ANALYTICS_CACHE_PREFIX }),
  [
    param('clientId').isMongoId().withMessage('Invalid client ID'),
    query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid period'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { clientId } = req.params;
      const { period = 'monthly', startDate, endDate } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Check authorization - clients can view their own analytics, coaches can view their clients', admins can view any
      const isAuthorized = clientId === userId || req.user?.role === 'admin';
      // TODO: Add check for coach viewing their client's analytics

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view these analytics',
        });
      }

      // Build date filter
      const dateFilter: any = { clientId };
      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string),
        };
      }

      // Get feedback data (only client feedback)
      const feedbacks = await SessionFeedback.find({
        ...dateFilter,
        feedbackType: 'client',
      })
        .populate('sessionId', 'date duration')
        .populate('coachId', 'name')
        .sort({ createdAt: -1 });

      // Calculate similar analytics as coach but from client perspective
      const totalFeedbacks = feedbacks.length;
      const submittedFeedbacks = feedbacks.filter(f => f.status === 'submitted');

      // Calculate average ratings
      const avgRatings = submittedFeedbacks.reduce((acc, feedback) => {
        acc.overallSatisfaction += feedback.ratings.overallSatisfaction;
        acc.coachEffectiveness += feedback.ratings.coachEffectiveness;
        acc.sessionQuality += feedback.ratings.sessionQuality;
        acc.goalProgress += feedback.ratings.goalProgress;
        acc.communicationQuality += feedback.ratings.communicationQuality;
        acc.wouldRecommend += feedback.ratings.wouldRecommend;
        return acc;
      }, {
        overallSatisfaction: 0,
        coachEffectiveness: 0,
        sessionQuality: 0,
        goalProgress: 0,
        communicationQuality: 0,
        wouldRecommend: 0,
      });

      const count = submittedFeedbacks.length || 1;
      Object.keys(avgRatings).forEach(key => {
        avgRatings[key as keyof typeof avgRatings] = avgRatings[key as keyof typeof avgRatings] / count;
      });

      const overallAverage = Object.values(avgRatings).reduce((sum, val) => sum + val, 0) / Object.keys(avgRatings).length;

      const analytics = {
        period,
        dateRange: { startDate, endDate },
        ratings: {
          ...avgRatings,
          overall: overallAverage,
        },
        totalFeedbacksSubmitted: submittedFeedbacks.length,
        sampleSize: submittedFeedbacks.length,
      };

      res.status(200).json({
        success: true,
        analytics,
      });
    } catch (error) {
      console.error('Error getting client analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get client analytics',
      });
    }
  }
);

/**
 * POST /api/feedback/templates
 * Create a new feedback template
 */
router.post(
  '/templates',
  isAuthenticated,
  isCoach,
  clearCache('feedback_templates'),
  [
    body('name')
      .isLength({ min: 1, max: 200 })
      .withMessage('Template name is required and must be 200 characters or less'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must be 1000 characters or less'),
    body('templateType')
      .isIn(['coach', 'client', 'combined'])
      .withMessage('Template type must be coach, client, or combined'),
    body('questions')
      .isArray({ min: 1 })
      .withMessage('At least one question is required'),
    body('questions.*.question')
      .isLength({ min: 1, max: 500 })
      .withMessage('Question text is required and must be 500 characters or less'),
    body('questions.*.type')
      .isIn(['rating', 'scale', 'text', 'multiple_choice', 'yes_no'])
      .withMessage('Question type must be rating, scale, text, multiple_choice, or yes_no'),
    body('category')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Category must be 100 characters or less'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Add question IDs and order
      const questions = req.body.questions.map((q: any, index: number) => ({
        ...q,
        id: new mongoose.Types.ObjectId().toString(),
        order: index,
      }));

      const templateData = {
        ...req.body,
        questions,
        createdBy: userId,
        status: 'active',
      };

      const template = new FeedbackTemplate(templateData);
      await template.save();

      res.status(201).json({
        success: true,
        message: 'Feedback template created successfully',
        template,
      });
    } catch (error) {
      console.error('Error creating feedback template:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create feedback template',
      });
    }
  }
);

/**
 * GET /api/feedback/templates
 * Get available feedback templates
 */
router.get(
  '/templates',
  isAuthenticated,
  cacheResponse({ ttl: FEEDBACK_CACHE_TTL, keyPrefix: 'feedback_templates' }),
  [
    query('type').optional().isIn(['coach', 'client', 'combined']).withMessage('Type must be coach, client, or combined'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    query('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { type, category, isPublic, isDefault } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Build query - user can see their own templates and public templates
      const query: any = {
        status: 'active',
        $or: [
          { createdBy: userId },
          { isPublic: true },
        ],
      };

      if (type) query.templateType = type;
      if (category) query.category = category;
      if (isPublic !== undefined) query.isPublic = isPublic === 'true';
      if (isDefault !== undefined) query.isDefault = isDefault === 'true';

      const templates = await FeedbackTemplate.find(query)
        .populate('createdBy', 'name')
        .sort({ isDefault: -1, usageCount: -1, createdAt: -1 });

      res.status(200).json({
        success: true,
        templates,
        count: templates.length,
      });
    } catch (error) {
      console.error('Error getting feedback templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get feedback templates',
      });
    }
  }
);

/**
 * POST /api/feedback/opt-out
 * Handle feedback notification opt-out
 */
router.post(
  '/opt-out',
  [
    body('token')
      .notEmpty()
      .withMessage('Opt-out token is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { token } = req.body;

      const success = await feedbackTriggerService.handleOptOut(token);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Successfully opted out of feedback notifications',
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired opt-out token',
        });
      }
    } catch (error) {
      console.error('Error handling opt-out:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process opt-out request',
      });
    }
  }
);

/**
 * GET /api/feedback/trigger-stats
 * Get feedback trigger service statistics
 */
router.get(
  '/trigger-stats',
  isAuthenticated,
  isCoach, // Only coaches can see trigger statistics
  async (req: Request, res: Response) => {
    try {
      const stats = feedbackTriggerService.getStatistics();

      res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Error getting feedback trigger stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get feedback trigger statistics',
      });
    }
  }
);

export default router; 