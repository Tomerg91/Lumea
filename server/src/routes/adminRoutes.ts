import express from 'express';
import { Router } from 'express';
// import { approveCoach, getPendingCoaches } from '../controllers/adminController'; // Old incorrect import
import { adminController } from '../controllers/adminController.js'; // Corrected import
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router: Router = express.Router();

// Middleware to ensure user is authenticated and is an admin
router.use(isAuthenticated);
router.use(isAdmin);

// Route to get all pending coach applications
router.get('/coaches/pending', adminController.getPendingCoaches);

// Route to approve a coach
router.patch('/coaches/:id/approve', adminController.approveCoach);

// Route to get platform statistics (example, if you add this to controller)
// router.get('/stats', adminController.getPlatformStats);

export default router;
