// @ts-nocheck
import express, { Request, Response } from 'express';
import { AuditService, SessionHistoryFilter } from '../services/auditService';
import { isAuthenticated } from '../middleware/auth';
import { Types } from 'mongoose';

const router = express.Router();

/**
 * GET /api/session-history
 * Get session history with filtering and pagination
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      actionBy,
      action,
      dateFrom,
      dateTo,
      systemGenerated,
      limit,
      offset,
    } = req.query;

    // Build filter object
    const filter: SessionHistoryFilter = {};

    if (sessionId && typeof sessionId === 'string') {
      filter.sessionId = sessionId;
    }

    if (actionBy && typeof actionBy === 'string') {
      filter.actionBy = actionBy;
    }

    if (action) {
      if (typeof action === 'string') {
        filter.action = action as any;
      } else if (Array.isArray(action)) {
        filter.action = action as any[];
      }
    }

    if (dateFrom && typeof dateFrom === 'string') {
      filter.dateFrom = new Date(dateFrom);
    }

    if (dateTo && typeof dateTo === 'string') {
      filter.dateTo = new Date(dateTo);
    }

    if (systemGenerated !== undefined) {
      filter.systemGenerated = systemGenerated === 'true';
    }

    if (limit && typeof limit === 'string') {
      filter.limit = parseInt(limit, 10);
    }

    if (offset && typeof offset === 'string') {
      filter.offset = parseInt(offset, 10);
    }

    // For coaches, filter to their sessions only
    if (req.user?.role === 'coach') {
      // This will be handled by the service layer when we add coach filtering
    }

    const result = await AuditService.getSessionHistory(filter);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching session history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch session history',
    });
  }
});

/**
 * GET /api/session-history/session/:sessionId
 * Get history for a specific session
 */
router.get('/session/:sessionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID',
      });
    }

    const filter: SessionHistoryFilter = {
      sessionId,
      limit: 100, // Get more history for a specific session
    };

    const result = await AuditService.getSessionHistory(filter);

    res.json({
      success: true,
      data: result.history,
      total: result.total,
    });
  } catch (error: any) {
    console.error('Error fetching session history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch session history',
    });
  }
});

/**
 * GET /api/session-history/analytics
 * Get session analytics and patterns
 */
router.get('/analytics', auth, async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, coachId } = req.query;

    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    let targetCoachId: string | undefined;

    if (dateFrom && typeof dateFrom === 'string') {
      fromDate = new Date(dateFrom);
    }

    if (dateTo && typeof dateTo === 'string') {
      toDate = new Date(dateTo);
    }

    // Handle coach filtering
    if (req.user?.role === 'coach') {
      // Coaches can only see their own analytics
      targetCoachId = req.user.id;
    } else if (coachId && typeof coachId === 'string') {
      // Admins can specify any coach
      targetCoachId = coachId;
    }

    const analytics = await AuditService.getSessionAnalytics(
      targetCoachId,
      fromDate,
      toDate
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error('Error generating session analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate session analytics',
    });
  }
});

/**
 * GET /api/session-history/user/:userId
 * Get activity history for a specific user
 */
router.get('/user/:userId', auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit, offset, dateFrom, dateTo } = req.query;

    if (!Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    // Authorization check - users can only see their own history unless admin
    if (req.user?.role !== 'admin' && req.user?.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const filter: SessionHistoryFilter = {
      actionBy: userId,
    };

    if (dateFrom && typeof dateFrom === 'string') {
      filter.dateFrom = new Date(dateFrom);
    }

    if (dateTo && typeof dateTo === 'string') {
      filter.dateTo = new Date(dateTo);
    }

    if (limit && typeof limit === 'string') {
      filter.limit = parseInt(limit, 10);
    }

    if (offset && typeof offset === 'string') {
      filter.offset = parseInt(offset, 10);
    }

    const result = await AuditService.getSessionHistory(filter);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching user session history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user session history',
    });
  }
});

/**
 * POST /api/session-history/manual
 * Manually create a history entry (admin only)
 */
router.post('/manual', auth, async (req: Request, res: Response) => {
  try {
    // Only admins can manually create history entries
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin required',
      });
    }

    const {
      sessionId,
      action,
      actionBy,
      description,
      previousValues,
      newValues,
      metadata,
      systemGenerated,
    } = req.body;

    if (!sessionId || !action || !actionBy || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, action, actionBy, description',
      });
    }

    const historyEntry = await AuditService.createHistoryEntry({
      sessionId,
      action,
      actionBy,
      description,
      previousValues,
      newValues,
      metadata,
      systemGenerated: systemGenerated || false,
    });

    res.status(201).json({
      success: true,
      data: historyEntry,
    });
  } catch (error: any) {
    console.error('Error creating manual history entry:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create history entry',
    });
  }
});

export { router as sessionHistoryRoutes }; 