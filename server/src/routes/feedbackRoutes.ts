import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { SessionFeedback } from '../models/SessionFeedback.js';
import { FeedbackTemplate } from '../models/FeedbackTemplate.js';
import { FeedbackAnalytics } from '../models/FeedbackAnalytics.js';
import { CoachingSession } from '../models/CoachingSession.js';
import { isAuthenticated, isCoach, isClient } from '../middlewares/auth.js';
import { cacheResponse, clearCache } from '../middleware/cache.js';
import { feedbackTriggerService } from '../services/feedbackTriggerService.js';


const router = express.Router();

// Cache configuration for feedback
const FEEDBACK_CACHE_TTL = 300; // 5 minutes
const FEEDBACK_CACHE_PREFIX = 'feedback';
const ANALYTICS_CACHE_TTL = 900; // 15 minutes
const ANALYTICS_CACHE_PREFIX = 'feedback_analytics';













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