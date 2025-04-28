import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Get revenue data
router.get('/revenue', analyticsController.getRevenue);

// Get user growth data
router.get('/user-growth', analyticsController.getUserGrowth);

// Get session metrics
router.get('/session-metrics', analyticsController.getSessionMetrics);

// Get coach performance
router.get('/coach-performance', analyticsController.getCoachPerformance);

// Get retention rates
// router.get('/retention-rates', analyticsController.getRetentionRates); // Commented out - function likely missing

// Get popular topics
// router.get('/popular-topics', analyticsController.getPopularTopics); // Commented out due to missing Session.title

// Get peak usage times
router.get('/peak-usage', analyticsController.getPeakUsage);

// Export analytics data
router.post('/export', analyticsController.exportData);

export default router; 