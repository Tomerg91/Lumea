import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AvailabilityService, CreateAvailabilityData, UpdateAvailabilityData } from '../services/availabilityService';
import { isAuthenticated, isCoach } from '../middlewares/auth';
import { cacheResponse, clearCache } from '../middleware/cache';

const router = express.Router();

// Cache configuration
const AVAILABILITY_CACHE_TTL = 300; // 5 minutes
const AVAILABILITY_CACHE_PREFIX = 'availability';

/**
 * GET /api/availability/:coachId
 * Get coach availability settings
 */
router.get(
  '/:coachId',
  isAuthenticated,
  [
    param('coachId').isMongoId().withMessage('Invalid coach ID'),
  ],
  cacheResponse({ ttl: AVAILABILITY_CACHE_TTL, keyPrefix: AVAILABILITY_CACHE_PREFIX }),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { coachId } = req.params;
      
      // Check authorization - coach can view their own, admin can view any
      if (req.user?.id !== coachId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this availability',
        });
      }

      const availability = await AvailabilityService.getCoachAvailability(coachId);
      
      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability settings not found',
        });
      }

      res.status(200).json({
        success: true,
        data: availability,
      });
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch availability settings',
      });
    }
  }
);

/**
 * POST /api/availability
 * Create or update coach availability settings
 */
router.post(
  '/',
  isAuthenticated,
  isCoach,
  [
    body('timezone').optional().isString().withMessage('Timezone must be a string'),
    body('recurringAvailability').optional().isArray().withMessage('Recurring availability must be an array'),
    body('recurringAvailability.*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6'),
    body('recurringAvailability.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:mm format'),
    body('recurringAvailability.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:mm format'),
    body('bufferSettings.beforeSession').optional().isInt({ min: 0, max: 60 }).withMessage('Before session buffer must be 0-60 minutes'),
    body('bufferSettings.afterSession').optional().isInt({ min: 0, max: 60 }).withMessage('After session buffer must be 0-60 minutes'),
    body('bufferSettings.betweenSessions').optional().isInt({ min: 0, max: 120 }).withMessage('Between sessions buffer must be 0-120 minutes'),
    body('defaultSessionDuration').optional().isInt({ min: 15, max: 240 }).withMessage('Default session duration must be 15-240 minutes'),
    body('allowedDurations').optional().isArray().withMessage('Allowed durations must be an array'),
    body('advanceBookingDays').optional().isInt({ min: 1, max: 365 }).withMessage('Advance booking days must be 1-365'),
    body('lastMinuteBookingHours').optional().isInt({ min: 1, max: 168 }).withMessage('Last minute booking hours must be 1-168'),
    body('autoAcceptBookings').optional().isBoolean().withMessage('Auto accept bookings must be boolean'),
    body('requireApproval').optional().isBoolean().withMessage('Require approval must be boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const coachId = req.user?.id;
      if (!coachId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const availabilityData: CreateAvailabilityData = {
        coachId,
        ...req.body,
      };

      const availability = await AvailabilityService.createOrUpdateAvailability(availabilityData);

      // Clear cache
      await clearCache(`${AVAILABILITY_CACHE_PREFIX}:*`);

      res.status(200).json({
        success: true,
        message: 'Availability settings updated successfully',
        data: availability,
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update availability settings',
      });
    }
  }
);

/**
 * PUT /api/availability/:coachId/recurring
 * Update recurring availability
 */
router.put(
  '/:coachId/recurring',
  isAuthenticated,
  isCoach,
  [
    param('coachId').isMongoId().withMessage('Invalid coach ID'),
    body('recurringAvailability').isArray().withMessage('Recurring availability must be an array'),
    body('recurringAvailability.*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6'),
    body('recurringAvailability.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:mm format'),
    body('recurringAvailability.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:mm format'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { coachId } = req.params;
      const { recurringAvailability } = req.body;

      // Check authorization
      if (req.user?.id !== coachId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this availability',
        });
      }

      const availability = await AvailabilityService.updateRecurringAvailability(coachId, recurringAvailability);

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability settings not found',
        });
      }

      // Clear cache
      await clearCache(`${AVAILABILITY_CACHE_PREFIX}:*`);

      res.status(200).json({
        success: true,
        message: 'Recurring availability updated successfully',
        data: availability,
      });
    } catch (error) {
      console.error('Error updating recurring availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update recurring availability',
      });
    }
  }
);

/**
 * POST /api/availability/:coachId/date-override
 * Add date override (vacation, sick day, etc.)
 */
router.post(
  '/:coachId/date-override',
  isAuthenticated,
  isCoach,
  [
    param('coachId').isMongoId().withMessage('Invalid coach ID'),
    body('date').isISO8601().withMessage('Date must be in ISO format'),
    body('isAvailable').isBoolean().withMessage('Is available must be boolean'),
    body('timeSlots').optional().isArray().withMessage('Time slots must be an array'),
    body('timeSlots.*.startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:mm format'),
    body('timeSlots.*.endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:mm format'),
    body('reason').optional().isIn(['vacation', 'sick', 'personal', 'training', 'other']).withMessage('Invalid reason'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { coachId } = req.params;
      const dateOverride = {
        ...req.body,
        date: new Date(req.body.date),
      };

      // Check authorization
      if (req.user?.id !== coachId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this availability',
        });
      }

      const availability = await AvailabilityService.addDateOverride(coachId, dateOverride);

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability settings not found',
        });
      }

      // Clear cache
      await clearCache(`${AVAILABILITY_CACHE_PREFIX}:*`);

      res.status(200).json({
        success: true,
        message: 'Date override added successfully',
        data: availability,
      });
    } catch (error) {
      console.error('Error adding date override:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add date override',
      });
    }
  }
);

/**
 * DELETE /api/availability/:coachId/date-override/:date
 * Remove date override
 */
router.delete(
  '/:coachId/date-override/:date',
  isAuthenticated,
  isCoach,
  [
    param('coachId').isMongoId().withMessage('Invalid coach ID'),
    param('date').isISO8601().withMessage('Date must be in ISO format'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { coachId, date } = req.params;

      // Check authorization
      if (req.user?.id !== coachId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this availability',
        });
      }

      const availability = await AvailabilityService.removeDateOverride(coachId, new Date(date));

      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Availability settings not found',
        });
      }

      // Clear cache
      await clearCache(`${AVAILABILITY_CACHE_PREFIX}:*`);

      res.status(200).json({
        success: true,
        message: 'Date override removed successfully',
        data: availability,
      });
    } catch (error) {
      console.error('Error removing date override:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove date override',
      });
    }
  }
);

/**
 * GET /api/availability/:coachId/slots
 * Get available time slots for a coach
 */
router.get(
  '/:coachId/slots',
  isAuthenticated,
  [
    param('coachId').isMongoId().withMessage('Invalid coach ID'),
    query('startDate').isISO8601().withMessage('Start date must be in ISO format'),
    query('endDate').isISO8601().withMessage('End date must be in ISO format'),
    query('duration').optional().isInt({ min: 15, max: 240 }).withMessage('Duration must be 15-240 minutes'),
    query('excludeSessionId').optional().isMongoId().withMessage('Invalid session ID'),
  ],
  cacheResponse({ ttl: 60, keyPrefix: 'slots' }), // Shorter cache for slots
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { coachId } = req.params;
      const { startDate, endDate, duration, excludeSessionId } = req.query;

      const slots = await AvailabilityService.getAvailableSlots(
        coachId,
        new Date(startDate as string),
        new Date(endDate as string),
        duration ? parseInt(duration as string) : undefined,
        excludeSessionId as string
      );

      res.status(200).json({
        success: true,
        data: {
          slots,
          totalSlots: slots.length,
          availableSlots: slots.filter(slot => slot.isAvailable).length,
        },
      });
    } catch (error) {
      console.error('Error fetching available slots:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available slots',
      });
    }
  }
);

/**
 * GET /api/availability/:coachId/status
 * Get coach's current availability status
 */
router.get(
  '/:coachId/status',
  isAuthenticated,
  [
    param('coachId').isMongoId().withMessage('Invalid coach ID'),
  ],
  cacheResponse({ ttl: 60, keyPrefix: 'status' }), // Short cache for real-time status
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { coachId } = req.params;

      const status = await AvailabilityService.getCurrentAvailabilityStatus(coachId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error fetching availability status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch availability status',
      });
    }
  }
);

/**
 * POST /api/availability/:coachId/check-slot
 * Check if a specific time slot is available
 */
router.post(
  '/:coachId/check-slot',
  isAuthenticated,
  [
    param('coachId').isMongoId().withMessage('Invalid coach ID'),
    body('startTime').isISO8601().withMessage('Start time must be in ISO format'),
    body('duration').isInt({ min: 15, max: 240 }).withMessage('Duration must be 15-240 minutes'),
    body('excludeSessionId').optional().isMongoId().withMessage('Invalid session ID'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { coachId } = req.params;
      const { startTime, duration, excludeSessionId } = req.body;

      const result = await AvailabilityService.isSlotAvailable(
        coachId,
        new Date(startTime),
        duration,
        excludeSessionId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error checking slot availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check slot availability',
      });
    }
  }
);

/**
 * DELETE /api/availability/:coachId
 * Delete coach availability settings
 */
router.delete(
  '/:coachId',
  isAuthenticated,
  isCoach,
  [
    param('coachId').isMongoId().withMessage('Invalid coach ID'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { coachId } = req.params;

      // Check authorization
      if (req.user?.id !== coachId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this availability',
        });
      }

      const deleted = await AvailabilityService.deleteAvailability(coachId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Availability settings not found',
        });
      }

      // Clear cache
      await clearCache(`${AVAILABILITY_CACHE_PREFIX}:*`);

      res.status(200).json({
        success: true,
        message: 'Availability settings deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete availability settings',
      });
    }
  }
);

export default router; 