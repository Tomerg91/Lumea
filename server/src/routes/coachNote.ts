import express from 'express';
import { isAuthenticated, isCoach } from '../middleware/auth.js';
import { coachNoteController } from '../controllers/coachNoteController.js';

const router = express.Router();

// Create a new coach note
router.post('/', isCoach, coachNoteController.createCoachNote);

// Get a specific coach note
router.get('/:id', isCoach, coachNoteController.getCoachNote);

// Get all coach notes for a session
router.get('/session/:sessionId', isCoach, coachNoteController.getSessionCoachNotes);

// Get all coach notes for the current coach
router.get('/', isCoach, coachNoteController.getCoachNotes);

// Update a coach note
router.put('/:id', isCoach, coachNoteController.updateCoachNote);

// Delete a coach note
router.delete('/:id', isCoach, coachNoteController.deleteCoachNote);

export default router; 