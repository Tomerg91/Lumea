import express from 'express';
import { approveCoach, getPendingCoaches } from '../controllers/adminController';
import { isAuthenticated } from '../middlewares/auth';

const router = express.Router();

// PATCH /api/coach/:id/approve - Approve a coach (admin only)
router.patch('/coach/:id/approve', isAuthenticated, approveCoach);

// GET /api/admin/pending-coaches - Get coaches pending approval (admin only)
router.get('/admin/pending-coaches', isAuthenticated, getPendingCoaches);

export default router;
