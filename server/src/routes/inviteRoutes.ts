import express from 'express';
import { inviteClient, getMyClients } from '../controllers/inviteController';
import { isAuthenticated } from '../middlewares/auth';

const router = express.Router();

// POST /api/invite-client - Invite a client (coach only)
router.post('/invite-client', isAuthenticated, inviteClient);

// GET /api/my-clients - Get a coach's clients (coach only)
router.get('/my-clients', isAuthenticated, getMyClients);

export default router;
