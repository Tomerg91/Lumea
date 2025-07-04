import { Router } from 'express';
import { isAuthenticated, isCoach, isClient } from '../middleware/auth';
import { sessionController } from '../controllers/sessionController';

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

// Update session status (coach only)
router.put('/:id/status', isCoach, sessionController.updateSessionStatus);

// Delete a session (coach only)
router.delete('/:id', isCoach, sessionController.deleteSession);

// Cancel a session (coach only)
router.post('/:id/cancel', isCoach, sessionController.cancelSession);

// Reschedule a session (coach only)
router.post('/:id/reschedule', isCoach, sessionController.rescheduleSession);

// Get available time slots for rescheduling
router.get('/:id/available-slots', isAuthenticated, sessionController.getAvailableSlots);

export default router;
