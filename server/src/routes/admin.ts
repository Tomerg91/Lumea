import express from 'express';
import { isAdmin } from '../middleware/auth.js';
import { analyticsController } from '../controllers/analyticsController.js';
import { adminController } from '../controllers/adminController.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(isAdmin);

// Pending coaches
router.get('/pending-coaches', adminController.getPendingCoaches);
router.post('/coaches/:id/approve', adminController.approveCoach);
router.delete('/coaches/:id', adminController.rejectCoach);

// Platform stats
router.get('/stats', adminController.getStats);

// Announcements
router.post('/announcements', adminController.sendAnnouncement);

// Analytics routes
router.get('/analytics/revenue', analyticsController.getRevenue);
router.get('/analytics/user-growth', analyticsController.getUserGrowth);
router.get('/analytics/session-metrics', analyticsController.getSessionMetrics);
router.get('/analytics/coach-performance', analyticsController.getCoachPerformance);
// router.get('/analytics/popular-topics', analyticsController.getPopularTopics); // Commented out - Function definition is commented out
router.get('/analytics/peak-usage', analyticsController.getPeakUsage);
router.post('/analytics/export', analyticsController.exportData);

export default router;