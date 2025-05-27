import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { sessionController } from '../controllers/sessionController';
import SessionService, { CancellationRequest, ReschedulingRequest } from '../services/sessionService';
import { CoachingSession } from '../models/CoachingSession';
import { isAuthenticated, isCoach } from '../middlewares/auth';
import { cacheResponse, clearCache } from '../middleware/cache';

const router = express.Router();

// Cache configuration for sessions
const SESSION_CACHE_TTL = 300; // 5 minutes
const SESSION_CACHE_PREFIX = 'sessions';

// GET /api/sessions - Get sessions for the authenticated coach
router.get(
  '/sessions',
  isAuthenticated,
  isCoach,
  cacheResponse({ ttl: SESSION_CACHE_TTL, keyPrefix: SESSION_CACHE_PREFIX }),
  sessionController.getSessions
);

// POST /api/sessions - Create a new session
// Clear the sessions cache when a new session is created
router.post(
  '/sessions',
  isAuthenticated,
  isCoach,
  clearCache(SESSION_CACHE_PREFIX),
  sessionController.createSession
);

/**
 * POST /api/sessions/:sessionId/cancel
 * Cancel a session with business rule validation
 */
router.post(
  '/:sessionId/cancel',
  isAuthenticated,
  [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
    body('reason')
      .isIn(['coach_emergency', 'client_request', 'illness', 'scheduling_conflict', 'technical_issues', 'weather', 'personal_emergency', 'other'])
      .withMessage('Invalid cancellation reason'),
    body('reasonText')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason text must be 500 characters or less'),
  ],
  async (req, res) => {
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
      const { reason, reasonText } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const cancellationRequest: CancellationRequest = {
        sessionId,
        reason,
        reasonText,
        cancelledBy: userId,
      };

      const cancelledSession = await SessionService.cancelSession(cancellationRequest);

      res.status(200).json({
        success: true,
        message: 'Session cancelled successfully',
        session: cancelledSession,
      });
    } catch (error) {
      console.error('Error cancelling session:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel session',
      });
    }
  }
);

/**
 * POST /api/sessions/:sessionId/reschedule
 * Reschedule a session with conflict detection
 */
router.post(
  '/:sessionId/reschedule',
  isAuthenticated,
  [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
    body('newDate')
      .isISO8601()
      .withMessage('Invalid date format')
      .custom((value) => {
        const date = new Date(value);
        if (date <= new Date()) {
          throw new Error('New date must be in the future');
        }
        return true;
      }),
    body('reason')
      .isLength({ min: 1, max: 500 })
      .withMessage('Reschedule reason is required and must be 500 characters or less'),
  ],
  async (req, res) => {
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
      const { newDate, reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const reschedulingRequest: ReschedulingRequest = {
        sessionId,
        newDate: new Date(newDate),
        reason,
        rescheduledBy: userId,
      };

      const rescheduledSession = await SessionService.rescheduleSession(reschedulingRequest);

      res.status(200).json({
        success: true,
        message: 'Session rescheduled successfully',
        session: rescheduledSession,
      });
    } catch (error) {
      console.error('Error rescheduling session:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reschedule session',
      });
    }
  }
);

/**
 * GET /api/sessions/:sessionId/available-slots
 * Get available time slots for rescheduling
 */
router.get(
  '/:sessionId/available-slots',
  isAuthenticated,
  [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
    query('fromDate').isISO8601().withMessage('Invalid from date format'),
    query('toDate').isISO8601().withMessage('Invalid to date format'),
    query('duration').optional().isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15 and 240 minutes'),
  ],
  async (req, res) => {
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
      const { fromDate, toDate, duration = 60 } = req.query;

      // Get session to find coach and client IDs
      const session = await CoachingSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      // Check authorization
      const userId = req.user?.id;
      const isAuthorized = 
        session.coachId.toString() === userId ||
        session.clientId.toString() === userId ||
        req.user?.role === 'admin';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view available slots for this session',
        });
      }

      const availableSlots = await SessionService.getAvailableSlots(
        session.coachId.toString(),
        session.clientId.toString(),
        sessionId,
        new Date(fromDate as string),
        new Date(toDate as string),
        parseInt(duration as string)
      );

      res.status(200).json({
        success: true,
        availableSlots,
        totalSlots: availableSlots.length,
      });
    } catch (error) {
      console.error('Error getting available slots:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available slots',
      });
    }
  }
);

/**
 * GET /api/sessions/cancellation-stats/:userId
 * Get cancellation statistics for a user
 */
router.get(
  '/cancellation-stats/:userId',
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    query('role').isIn(['coach', 'client']).withMessage('Role must be either coach or client'),
    query('months').optional().isInt({ min: 1, max: 12 }).withMessage('Months must be between 1 and 12'),
  ],
  async (req: express.Request, res: express.Response) => {
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

      const { userId } = req.params;
      const { role, months = 6 } = req.query;

      // Check authorization - users can only view their own stats, or admins can view any
      const requestingUserId = req.user?.id;
      const isAuthorized = userId === requestingUserId || req.user?.role === 'admin';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view these statistics',
        });
      }

      const stats = await SessionService.getCancellationStats(
        userId,
        role as 'coach' | 'client',
        parseInt(months as string)
      );

      res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Error getting cancellation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cancellation statistics',
      });
    }
  }
);

/**
 * GET /api/sessions/notifications/pending
 * Get sessions that need confirmation or reminder notifications
 */
router.get(
  '/notifications/pending',
  [
    query('type').isIn(['confirmation', 'reminder']).withMessage('Type must be either confirmation or reminder'),
    query('lookAheadHours').optional().isInt({ min: 1, max: 168 }).withMessage('Look ahead hours must be between 1 and 168'),
  ],
  async (req: express.Request, res: express.Response) => {
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

      // Only allow admin access for notification management
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required for notification management',
        });
      }

      const { type, lookAheadHours = 24 } = req.query;

      const sessions = await SessionService.getSessionsNeedingNotification(
        type as 'confirmation' | 'reminder',
        parseInt(lookAheadHours as string)
      );

      res.status(200).json({
        success: true,
        sessions,
        count: sessions.length,
      });
    } catch (error) {
      console.error('Error getting sessions needing notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sessions needing notifications',
      });
    }
  }
);

/**
 * PUT /api/sessions/:sessionId/notification-sent
 * Mark notification as sent for a session
 */
router.put(
  '/:sessionId/notification-sent',
  [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
    body('type').isIn(['confirmation', 'reminder', 'cancellation']).withMessage('Type must be confirmation, reminder, or cancellation'),
  ],
  async (req: express.Request, res: express.Response) => {
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

      // Only allow admin access for notification management
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required for notification management',
        });
      }

      const { sessionId } = req.params;
      const { type } = req.body;

      await SessionService.markNotificationSent(sessionId, type);

      res.status(200).json({
        success: true,
        message: `${type} notification marked as sent`,
      });
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as sent',
      });
    }
  }
);

/**
 * GET /api/sessions/:sessionId
 * Get detailed session information including cancellation/rescheduling history
 */
router.get(
  '/:sessionId',
  [
    param('sessionId').isMongoId().withMessage('Invalid session ID'),
  ],
  async (req: express.Request, res: express.Response) => {
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

      const session = await CoachingSession.findById(sessionId)
        .populate('coachId clientId', 'firstName lastName email')
        .populate('cancellationInfo.cancelledBy', 'firstName lastName')
        .populate('reschedulingInfo.rescheduledBy', 'firstName lastName');

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      // Check authorization
      const userId = req.user?.id;
      const isAuthorized = 
        session.coachId.toString() === userId ||
        session.clientId.toString() === userId ||
        req.user?.role === 'admin';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this session',
        });
      }

      res.status(200).json({
        success: true,
        session,
      });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session',
      });
    }
  }
);

export default router;
