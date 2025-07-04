import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { clientController } from '../controllers/clientController';
import { coachController } from '../controllers/coachController';

const router = express.Router();

// Apply authentication to all dashboard routes
router.use(isAuthenticated);

// Dashboard stats endpoint - routes to appropriate controller based on user role
router.get('/stats', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Route to appropriate controller based on user role
    if (req.user.role === 'client') {
      return await clientController.getDashboardStats(req, res);
    } else if (req.user.role === 'coach') {
      return await coachController.getDashboardStats(req, res);
    } else {
      return res.status(403).json({ error: 'Invalid user role for dashboard access' });
    }
  } catch (error) {
    console.error('Error in dashboard stats route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 