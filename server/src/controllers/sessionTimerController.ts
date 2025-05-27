import { Request, Response } from 'express';
import { SessionTiming, ISessionTiming } from '../models/SessionTiming.js';
import { CoachingSession } from '../models/CoachingSession.js';
import { APIError, ErrorCode } from '../middleware/error.js';
import { validationSchemas } from '../schemas/validation.js';
import { Types } from 'mongoose';

// Start session timer
export const startTimer = async (req: Request, res: Response) => {
  try {
    const { sessionId } = validationSchemas.sessionTimer.startTimer.parse(req.body);
    
    // Verify session exists and user has permission
    const session = await CoachingSession.findById(sessionId);
    if (!session) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Session not found', 404);
    }
    
    // Check if user is the coach for this session
    if (session.coachId.toString() !== req.user?.id) {
      throw new APIError(ErrorCode.FORBIDDEN, 'Only the coach can start the session timer', 403);
    }
    
    // Check if session is in appropriate status
    if (session.status !== 'pending' && session.status !== 'in-progress') {
      throw new APIError(ErrorCode.VALIDATION_ERROR, 'Timer can only be started for pending or in-progress sessions', 400);
    }
    
    // Find or create timing record
    let timing = await SessionTiming.findOne({ sessionId });
    
    if (!timing) {
      timing = new SessionTiming({
        sessionId,
        timerStatus: 'running',
        startTime: new Date(),
        pauses: [],
        totalPausedTime: 0,
        actualDuration: 0,
        adjustments: [],
      });
    } else {
      // Check if timer is already running
      if (timing.timerStatus === 'running') {
        throw new APIError(ErrorCode.VALIDATION_ERROR, 'Timer is already running', 400);
      }
      
      // Resume from paused state or restart
      if (timing.timerStatus === 'paused') {
        // Resume from pause
        const lastPause = timing.pauses[timing.pauses.length - 1];
        if (lastPause && !lastPause.resumedAt) {
          lastPause.resumedAt = new Date();
          lastPause.pauseDuration = Math.floor((lastPause.resumedAt.getTime() - lastPause.pausedAt.getTime()) / 1000);
          timing.totalPausedTime += lastPause.pauseDuration;
        }
      } else {
        // Starting fresh
        timing.startTime = new Date();
        timing.pauses = [];
        timing.totalPausedTime = 0;
      }
      
      timing.timerStatus = 'running';
    }
    
    await timing.save();
    
    // Update session status to in-progress if it's pending
    if (session.status === 'pending') {
      session.status = 'in-progress';
      session['in-progressAt'] = new Date();
      session.timingId = timing._id as Types.ObjectId;
      await session.save();
    }
    
    res.json({
      success: true,
      message: 'Timer started successfully',
      data: {
        timingId: timing._id,
        sessionId: timing.sessionId,
        timerStatus: timing.timerStatus,
        startTime: timing.startTime,
        currentDuration: (timing as any).currentDuration,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to start timer', 500);
  }
};

// Stop session timer
export const stopTimer = async (req: Request, res: Response) => {
  try {
    const { sessionId } = validationSchemas.sessionTimer.stopTimer.parse(req.body);
    
    // Verify session exists and user has permission
    const session = await CoachingSession.findById(sessionId);
    if (!session) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Session not found', 404);
    }
    
    // Check if user is the coach for this session
    if (session.coachId.toString() !== req.user?.id) {
      throw new APIError(ErrorCode.FORBIDDEN, 'Only the coach can stop the session timer', 403);
    }
    
    // Find timing record
    const timing = await SessionTiming.findOne({ sessionId });
    if (!timing) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Timer not found for this session', 404);
    }
    
    // Check if timer is running or paused
    if (timing.timerStatus === 'stopped') {
      throw new APIError(ErrorCode.VALIDATION_ERROR, 'Timer is already stopped', 400);
    }
    
    // Stop the timer
    timing.endTime = new Date();
    const previousStatus = timing.timerStatus;
    timing.timerStatus = 'stopped';
    
    // If timer was paused, complete the last pause
    if (previousStatus === 'paused') {
      const lastPause = timing.pauses[timing.pauses.length - 1];
      if (lastPause && !lastPause.resumedAt) {
        lastPause.resumedAt = timing.endTime;
        lastPause.pauseDuration = Math.floor((lastPause.resumedAt.getTime() - lastPause.pausedAt.getTime()) / 1000);
        timing.totalPausedTime += lastPause.pauseDuration;
      }
    }
    
    await timing.save();
    
    // Update session status to completed
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();
    
    res.json({
      success: true,
      message: 'Timer stopped successfully',
      data: {
        timingId: timing._id,
        sessionId: timing.sessionId,
        timerStatus: timing.timerStatus,
        startTime: timing.startTime,
        endTime: timing.endTime,
        actualDuration: timing.actualDuration,
        totalDuration: (timing as any).getTotalDuration(),
        durationInMinutes: (timing as any).getDurationInMinutes(),
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to stop timer', 500);
  }
};

// Pause session timer
export const pauseTimer = async (req: Request, res: Response) => {
  try {
    const { sessionId } = validationSchemas.sessionTimer.pauseTimer.parse(req.body);
    
    // Verify session exists and user has permission
    const session = await CoachingSession.findById(sessionId);
    if (!session) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Session not found', 404);
    }
    
    // Check if user is the coach for this session
    if (session.coachId.toString() !== req.user?.id) {
      throw new APIError(ErrorCode.FORBIDDEN, 'Only the coach can pause the session timer', 403);
    }
    
    // Find timing record
    const timing = await SessionTiming.findOne({ sessionId });
    if (!timing) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Timer not found for this session', 404);
    }
    
    // Check if timer is running
    if (timing.timerStatus !== 'running') {
      throw new APIError(ErrorCode.VALIDATION_ERROR, 'Timer must be running to pause', 400);
    }
    
    // Pause the timer
    timing.timerStatus = 'paused';
    timing.pauses.push({
      pausedAt: new Date(),
    });
    
    await timing.save();
    
    res.json({
      success: true,
      message: 'Timer paused successfully',
      data: {
        timingId: timing._id,
        sessionId: timing.sessionId,
        timerStatus: timing.timerStatus,
        currentDuration: (timing as any).currentDuration,
        pauseCount: timing.pauses.length,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to pause timer', 500);
  }
};

// Resume session timer
export const resumeTimer = async (req: Request, res: Response) => {
  try {
    const { sessionId } = validationSchemas.sessionTimer.resumeTimer.parse(req.body);
    
    // Verify session exists and user has permission
    const session = await CoachingSession.findById(sessionId);
    if (!session) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Session not found', 404);
    }
    
    // Check if user is the coach for this session
    if (session.coachId.toString() !== req.user?.id) {
      throw new APIError(ErrorCode.FORBIDDEN, 'Only the coach can resume the session timer', 403);
    }
    
    // Find timing record
    const timing = await SessionTiming.findOne({ sessionId });
    if (!timing) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Timer not found for this session', 404);
    }
    
    // Check if timer is paused
    if (timing.timerStatus !== 'paused') {
      throw new APIError(ErrorCode.VALIDATION_ERROR, 'Timer must be paused to resume', 400);
    }
    
    // Resume the timer
    const lastPause = timing.pauses[timing.pauses.length - 1];
    if (lastPause && !lastPause.resumedAt) {
      lastPause.resumedAt = new Date();
      lastPause.pauseDuration = Math.floor((lastPause.resumedAt.getTime() - lastPause.pausedAt.getTime()) / 1000);
      timing.totalPausedTime += lastPause.pauseDuration;
    }
    
    timing.timerStatus = 'running';
    await timing.save();
    
    res.json({
      success: true,
      message: 'Timer resumed successfully',
      data: {
        timingId: timing._id,
        sessionId: timing.sessionId,
        timerStatus: timing.timerStatus,
        currentDuration: (timing as any).currentDuration,
        totalPausedTime: timing.totalPausedTime,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to resume timer', 500);
  }
};

// Adjust session duration manually
export const adjustDuration = async (req: Request, res: Response) => {
  try {
    const { sessionId, adjustedDuration, reason } = validationSchemas.sessionTimer.adjustDuration.parse(req.body);
    
    // Verify session exists and user has permission
    const session = await CoachingSession.findById(sessionId);
    if (!session) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Session not found', 404);
    }
    
    // Check if user is the coach for this session
    if (session.coachId.toString() !== req.user?.id) {
      throw new APIError(ErrorCode.FORBIDDEN, 'Only the coach can adjust session duration', 403);
    }
    
    // Find timing record
    const timing = await SessionTiming.findOne({ sessionId });
    if (!timing) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Timer not found for this session', 404);
    }
    
    // Check if session is completed
    if (timing.timerStatus !== 'stopped') {
      throw new APIError(ErrorCode.VALIDATION_ERROR, 'Duration can only be adjusted for completed sessions', 400);
    }
    
    // Record the adjustment
    const originalDuration = timing.adjustedDuration || timing.actualDuration;
    timing.adjustments.push({
      originalDuration,
      adjustedDuration,
      reason,
      adjustedBy: new Types.ObjectId(req.user!.id),
      adjustedAt: new Date(),
    });
    
    timing.adjustedDuration = adjustedDuration;
    await timing.save();
    
    res.json({
      success: true,
      message: 'Duration adjusted successfully',
      data: {
        timingId: timing._id,
        sessionId: timing.sessionId,
        originalDuration,
        adjustedDuration,
        totalDuration: (timing as any).getTotalDuration(),
        durationInMinutes: (timing as any).getDurationInMinutes(),
        adjustmentCount: timing.adjustments.length,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to adjust duration', 500);
  }
};

// Get timing data for a session
export const getTimingData = async (req: Request, res: Response) => {
  try {
    const { id: sessionId } = validationSchemas.sessionTimer.params.parse(req.params);
    
    // Verify session exists and user has permission
    const session = await CoachingSession.findById(sessionId);
    if (!session) {
      throw new APIError(ErrorCode.RESOURCE_NOT_FOUND, 'Session not found', 404);
    }
    
    // Check if user has access to this session (coach or client)
    if (session.coachId.toString() !== req.user?.id && session.clientId.toString() !== req.user?.id) {
      throw new APIError(ErrorCode.FORBIDDEN, 'Access denied to this session', 403);
    }
    
    // Find timing record
    const timing = await SessionTiming.findOne({ sessionId }).populate('adjustments.adjustedBy', 'firstName lastName');
    
    if (!timing) {
      // Return default timing data if no timer has been started
      return res.json({
        success: true,
        data: {
          sessionId,
          timerStatus: 'stopped',
          actualDuration: 0,
          totalDuration: 0,
          durationInMinutes: 0,
          hasTimer: false,
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        timingId: timing._id,
        sessionId: timing.sessionId,
        timerStatus: timing.timerStatus,
        startTime: timing.startTime,
        endTime: timing.endTime,
        actualDuration: timing.actualDuration,
        adjustedDuration: timing.adjustedDuration,
        totalDuration: (timing as any).getTotalDuration(),
        durationInMinutes: (timing as any).getDurationInMinutes(),
        currentDuration: (timing as any).currentDuration,
        totalPausedTime: timing.totalPausedTime,
        pauseCount: timing.pauses.length,
        adjustmentCount: timing.adjustments.length,
        adjustments: timing.adjustments,
        hasTimer: true,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to get timing data', 500);
  }
};

// Get duration analytics
export const getDurationAnalytics = async (req: Request, res: Response) => {
  try {
    const { coachId, clientId, startDate, endDate, limit, page, sortBy, sortOrder } = 
      validationSchemas.sessionTimer.analyticsQuery.parse(req.query);
    
    // Build query filters
    const sessionFilters: any = {};
    if (coachId) sessionFilters.coachId = coachId;
    if (clientId) sessionFilters.clientId = clientId;
    if (startDate || endDate) {
      sessionFilters.date = {};
      if (startDate) sessionFilters.date.$gte = new Date(startDate);
      if (endDate) sessionFilters.date.$lte = new Date(endDate);
    }
    
    // Check user permissions
    if (req.user?.role === 'coach') {
      sessionFilters.coachId = req.user.id;
    } else if (req.user?.role === 'client') {
      sessionFilters.clientId = req.user.id;
    }
    
    // Get sessions with timing data
    const sessions = await CoachingSession.find(sessionFilters)
      .populate('timingId')
      .populate('coachId', 'firstName lastName')
      .populate('clientId', 'firstName lastName')
      .sort({ [sortBy === 'date' ? 'date' : 'createdAt']: sortOrder === 'asc' ? 1 : -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    
    // Calculate analytics
    const analytics = sessions
      .filter(session => session.timingId)
      .map(session => {
        const timing = session.timingId as any;
        return {
          sessionId: session._id,
          date: session.date,
          coach: session.coachId,
          client: session.clientId,
          plannedDuration: session.duration, // in minutes
          actualDuration: timing.actualDuration, // in seconds
          adjustedDuration: timing.adjustedDuration, // in seconds
          totalDuration: timing.getTotalDuration(), // in seconds
          durationInMinutes: timing.getDurationInMinutes(),
          totalPausedTime: timing.totalPausedTime,
          pauseCount: timing.pauses?.length || 0,
          adjustmentCount: timing.adjustments?.length || 0,
          timerStatus: timing.timerStatus,
        };
      });
    
    // Calculate summary statistics
    const totalSessions = analytics.length;
    const totalDurationSeconds = analytics.reduce((sum, a) => sum + a.totalDuration, 0);
    const totalDurationMinutes = Math.round(totalDurationSeconds / 60);
    const averageDurationMinutes = totalSessions > 0 ? Math.round(totalDurationMinutes / totalSessions) : 0;
    
    const summary = {
      totalSessions,
      totalDurationMinutes,
      averageDurationMinutes,
      totalPauses: analytics.reduce((sum, a) => sum + a.pauseCount, 0),
      totalAdjustments: analytics.reduce((sum, a) => sum + a.adjustmentCount, 0),
    };
    
    res.json({
      success: true,
      data: {
        analytics,
        summary,
        pagination: {
          page,
          limit,
          total: totalSessions,
        },
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(ErrorCode.INTERNAL_ERROR, 'Failed to get duration analytics', 500);
  }
}; 