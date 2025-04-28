import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { userController } from '../controllers/userController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Export user data
router.get('/export', userController.exportData);

export default router; 