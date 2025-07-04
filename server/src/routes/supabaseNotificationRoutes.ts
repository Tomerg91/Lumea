import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { NotificationController } from '../controllers/notificationController.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Get notifications for the authenticated user
 */
router.get(
  '/',
  isAuthenticated,
  [
    query('status').optional().isIn(['pending', 'sent', 'delivered', 'failed', 'read']).withMessage('Invalid status'),
    query('type').optional().isIn([
      'session_cancelled', 
      'session_rescheduled', 
      'session_reminder', 
      'session_confirmation', 
      'cancellation_request', 
      'reschedule_request',
      'feedback_request',
      'reflection_submitted'
    ]).withMessage('Invalid notification type'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  ],
  async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    await NotificationController.getNotifications(req, res);
  }
);

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for the authenticated user
 */
router.get(
  '/unread-count',
  isAuthenticated,
  NotificationController.getUnreadCount
);

/**
 * PUT /api/notifications/:notificationId/read
 * Mark a specific notification as read
 */
router.put(
  '/:notificationId/read',
  isAuthenticated,
  [
    param('notificationId').isUUID().withMessage('Invalid notification ID'),
  ],
  async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    await NotificationController.markAsRead(req, res);
  }
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the authenticated user
 */
router.put(
  '/read-all',
  isAuthenticated,
  NotificationController.markAllAsRead
);

/**
 * POST /api/notifications/test
 * Send a test notification (admin only)
 */
router.post(
  '/test',
  isAuthenticated,
  [
    body('recipientId').isUUID().withMessage('Invalid recipient ID'),
    body('type').isIn([
      'session_cancelled', 
      'session_rescheduled', 
      'session_reminder', 
      'session_confirmation', 
      'cancellation_request', 
      'reschedule_request',
      'feedback_request',
      'reflection_submitted'
    ]).withMessage('Invalid notification type'),
    body('channels').isArray().withMessage('Channels must be an array'),
    body('channels.*').isIn(['email', 'in_app', 'sms', 'push']).withMessage('Invalid notification channel'),
  ],
  async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    await NotificationController.createTestNotification(req, res);
  }
);

export default router; 