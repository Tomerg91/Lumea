import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { isAuthenticated, hasRole, isAdmin } from '../middleware/auth';

const router = Router();

// All analytics routes require authentication
router.use(isAuthenticated);

// Main analytics dashboard (comprehensive analytics)
router.get('/dashboard', hasRole('coach', 'admin'), analyticsController.getDashboard);

// Individual analytics metrics
router.get('/sessions', hasRole('coach', 'admin'), analyticsController.getSessionMetrics);
router.get('/client-engagement', hasRole('coach', 'admin'), analyticsController.getClientEngagement);
router.get('/coach-performance', hasRole('coach', 'admin'), analyticsController.getCoachPerformance);
router.get('/reflections', hasRole('coach', 'admin'), analyticsController.getReflectionAnalytics);
router.get('/coach-notes', hasRole('coach', 'admin'), analyticsController.getCoachNotesAnalytics);

// Legacy compatibility routes (keeping existing API contracts)
router.get('/session-metrics', hasRole('coach', 'admin'), analyticsController.getSessionMetrics);
router.get('/user-growth', hasRole('coach', 'admin'), analyticsController.getUserGrowth);
router.get('/peak-usage', hasRole('coach', 'admin'), analyticsController.getPeakUsage);

// Revenue route (not implemented for this coaching platform)
router.get('/revenue', isAdmin, analyticsController.getRevenue);

// Export functionality
router.post('/export', hasRole('coach', 'admin'), analyticsController.exportData);
router.get('/export', hasRole('coach', 'admin'), analyticsController.exportData);

export default router;
