import express from 'express';
import { sessionController } from '../controllers/sessionController';
import { isAuthenticated, isCoach } from '../middlewares/auth';

const router = express.Router();

// GET /api/sessions - Get sessions for the authenticated coach
router.get('/sessions', isAuthenticated, isCoach, sessionController.getSessions);

// POST /api/sessions - Create a new session
router.post('/sessions', isAuthenticated, isCoach, sessionController.createSession);

export default router; 