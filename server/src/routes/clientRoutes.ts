import express from 'express';
import { clientController } from '../controllers/clientController';
import { isAuthenticated, isCoach } from '../middlewares/auth';

const router = express.Router();

// GET /api/my-clients - Get clients for the authenticated coach
router.get('/my-clients', isAuthenticated, isCoach, clientController.getMyClients);

export default router; 