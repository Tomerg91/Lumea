import express from 'express';
import { isAuthenticated, isCoach } from '../middleware/auth.js';
import { resourceController } from '../controllers/resourceController.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Create a new resource (coach only)
router.post('/', isCoach, resourceController.createResource);

// Get all resources
router.get('/', resourceController.getResources);

// Get a specific resource
router.get('/:id', resourceController.getResource);

// Update a resource (coach only)
router.put('/:id', isCoach, resourceController.updateResource);

// Delete a resource (coach only)
router.delete('/:id', isCoach, resourceController.deleteResource);

// Assign resource to clients (coach only)
router.post('/:id/assign', isCoach, resourceController.assignResource);

export default router; 