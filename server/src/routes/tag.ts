import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { tagController } from '../controllers/tagController.js';

const router = express.Router();

// Create a new tag
router.post('/', isAuthenticated, tagController.createTag);

// Get a specific tag
router.get('/:id', isAuthenticated, tagController.getTag);

// Get all tags for the current user
router.get('/', isAuthenticated, tagController.getUserTags);

// Update a tag
router.put('/:id', isAuthenticated, tagController.updateTag);

// Delete a tag
router.delete('/:id', isAuthenticated, tagController.deleteTag);

export default router;
