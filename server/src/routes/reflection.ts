import express from 'express';
import { isAuthenticated } from '../middlewares/auth.js';
import { reflectionController } from '../controllers/reflectionController.js';

const router = express.Router();

// Create a new reflection
router.post('/', isAuthenticated, reflectionController.createReflection);

// Get recent reflections for dashboard
router.get('/recent', isAuthenticated, reflectionController.getRecentReflections);

// Get all reflections (with optional session filter via query param)
router.get('/', isAuthenticated, reflectionController.getReflections);

// Get a specific reflection
router.get('/:id', isAuthenticated, reflectionController.getReflection);

// Get all reflections for a session
router.get('/session/:sessionId', isAuthenticated, reflectionController.getSessionReflections);

// Update a reflection
router.put('/:id', isAuthenticated, reflectionController.updateReflection);

// Delete a reflection
router.delete('/:id', isAuthenticated, reflectionController.deleteReflection);

// TODO: Implement shareWithCoach method in reflectionController
// Share reflection with coach
// router.post('/:id/share', isAuthenticated, reflectionController.shareWithCoach);

export default router;
