import { Router } from 'express';
import { isAuthenticated, isCoach, isClient } from '../middleware/auth.js';
import { sessionController } from '../controllers/sessionController.js';

const router = Router();

// Create a new session (coach only)
router.post('/', isCoach, sessionController.createSession);

// Get a specific session
router.get('/:id', isAuthenticated, sessionController.getSession);

// Get all sessions for a coach
router.get('/coach/all', isCoach, sessionController.getCoachSessions);

// Get all sessions for a client
router.get('/client/all', isClient, sessionController.getClientSessions);

// Get upcoming sessions
router.get('/upcoming', isAuthenticated, sessionController.getUpcomingSessions);

// Get past sessions
router.get('/past', isAuthenticated, sessionController.getPastSessions);

// Update a session
router.put('/:id', isAuthenticated, sessionController.updateSession);

// Delete a session (coach only)
router.delete('/:id', isCoach, sessionController.deleteSession);

// Send reminder for a session (coach only)
router.post('/:id/send-reminder', isCoach, sessionController.sendReminder);

export default router;
