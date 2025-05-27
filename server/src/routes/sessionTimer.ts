import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import {
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  adjustDuration,
  getTimingData,
  getDurationAnalytics,
} from '../controllers/sessionTimerController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Timer control routes
router.post('/start', asyncHandler(startTimer));
router.post('/stop', asyncHandler(stopTimer));
router.post('/pause', asyncHandler(pauseTimer));
router.post('/resume', asyncHandler(resumeTimer));

// Duration adjustment route
router.put('/adjust', asyncHandler(adjustDuration));

// Get timing data for a specific session
router.get('/:id/timing', asyncHandler(getTimingData));

// Analytics route
router.get('/analytics', asyncHandler(getDurationAnalytics));

export default router; 