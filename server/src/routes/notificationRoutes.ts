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