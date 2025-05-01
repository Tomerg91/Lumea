import express from 'express';
import { isCoach } from '../middleware/auth.js';
import { coachController } from '../controllers/coachController.js';

const router = express.Router();

// Apply coach middleware to all routes
router.use(isCoach);

// Clients
router.get('/clients', coachController.getClients);

export default router;
