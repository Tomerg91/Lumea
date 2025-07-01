import express, { Request, Response } from 'express';
import { z } from 'zod';
import { body, query, param, validationResult } from 'express-validator';
import { NotificationService } from '../services/notificationService';
import { isAuthenticated } from '../middleware/auth';

import { notificationScheduler } from '../services/notificationSchedulerService';

const router = express.Router();

// Validation schemas
const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  reminderHoursBefore: z.number().min(1).max(168).optional(), // 1 hour to 1 week
  confirmationEnabled: z.boolean().optional(),
  sessionReminders: z.boolean().optional(),
  sessionCancellations: z.boolean().optional(),
  sessionRescheduling: z.boolean().optional(),
});



/**
 * PUT /api/notifications/:notificationId/read
 * Mark a specific notification as read
 */
router.put(
  '/:notificationId/read',
  isAuthenticated,
  [
    param('notificationId').isString().withMessage('Invalid notification ID'),
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

      const userId = req.user!.id;
      const { notificationId } = req.params;

      await NotificationService.markNotificationAsRead(notificationId, userId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
      });
    }
  }
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the authenticated user
 */
router.put(
  '/read-all',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      await NotificationService.markAllNotificationsAsRead(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
      });
    }
  }
);

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for the authenticated user
 */
router.get(
  '/unread-count',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const result = await NotificationService.getUserNotifications(userId, {
        status: 'sent', // Unread notifications have 'sent' status
        limit: 1, // We only need the count
      });

      res.status(200).json({
        success: true,
        count: result.total,
      });
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread notification count',
      });
    }
  }
);



/**
 * PUT /api/notifications/preferences
 * Update notification preferences for the authenticated user
 */
router.put(
  '/preferences',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Validate request body
      const validatedData = notificationPreferencesSchema.parse(req.body);

      // Get or create preferences for the user
      const preferences = await (NotificationPreferences as any).getOrCreateForUser(userId);
      
      // Update preferences with validated data
      Object.assign(preferences, validatedData);
      await preferences.save();
      
      res.status(200).json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: preferences,
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences',
      });
    }
  }
);

/**
 * POST /api/notifications/test
 * Send a test notification (admin only)
 */
router.post(
  '/test',
  isAuthenticated,
  [
    body('recipientId').isString().withMessage('Invalid recipient ID'),
    body('type').isIn(['session_cancelled', 'session_rescheduled', 'session_reminder', 'session_confirmation', 'cancellation_request', 'reschedule_request', 'reflection_submitted']).withMessage('Invalid notification type'),
    body('channels').isArray().withMessage('Channels must be an array'),
    body('channels.*').isIn(['email', 'in_app', 'sms', 'push']).withMessage('Invalid notification channel'),
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

      // Only allow admin access for test notifications
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required for test notifications',
        });
      }

      const { recipientId, type, channels, variables = {} } = req.body;

      const notifications = await NotificationService.createSessionNotification({
        recipientId,
        senderId: req.user!.id,
        type: type as NotificationType,
        channels: channels as NotificationChannel[],
        priority: 'low',
        variables: {
          ...variables,
          recipientName: 'Test User',
          sessionDate: new Date().toLocaleString(),
          duration: '60',
          coachName: 'Test Coach',
        },
      });

      res.status(200).json({
        success: true,
        message: 'Test notification sent successfully',
        data: notifications,
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
      });
    }
  }
);

// Admin routes for notification scheduler management
// GET /api/notifications/admin/scheduler/stats - Get scheduler statistics
router.get(
  '/admin/scheduler/stats',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const stats = notificationScheduler.getReminderStats();
      
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting scheduler stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get scheduler statistics',
      });
    }
  }
);

// GET /api/notifications/admin/scheduler/reminders - Get scheduled reminders
router.get(
  '/admin/scheduler/reminders',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const reminders = notificationScheduler.getScheduledReminders();
      
      res.status(200).json({
        success: true,
        data: reminders,
        count: reminders.length,
      });
    } catch (error) {
      console.error('Error getting scheduled reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get scheduled reminders',
      });
    }
  }
);

// POST /api/notifications/admin/scheduler/process - Force process reminders
router.post(
  '/admin/scheduler/process',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      await notificationScheduler.forceProcessReminders();
      
      res.status(200).json({
        success: true,
        message: 'Reminders processed successfully',
      });
    } catch (error) {
      console.error('Error processing reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process reminders',
      });
    }
  }
);

export default router; 