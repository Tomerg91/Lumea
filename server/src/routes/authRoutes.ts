import express from 'express';
import { authController } from '../controllers/authController.js';

const router = express.Router();

// POST /api/signup/:token - Register a client with an invitation token
router.post('/signup/:token', authController.registerWithInvite);

export default router;
