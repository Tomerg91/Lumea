import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { sessionController } from '../controllers/sessionController.js';
import SessionService, { CancellationRequest, ReschedulingRequest } from '../services/sessionService.js';

import { isAuthenticated, isCoach } from '../middlewares/auth.js';
import { cacheResponse, clearCache } from '../middleware/cache.js';

const router = express.Router();

// Cache configuration for sessions
const SESSION_CACHE_TTL = 300; // 5 minutes
const SESSION_CACHE_PREFIX = 'sessions';

// GET /api/sessions - Get sessions for the authenticated coach
router.get(
  '/sessions',
  isAuthenticated,
  isCoach,
  cacheResponse({ ttl: SESSION_CACHE_TTL, keyPrefix: SESSION_CACHE_PREFIX }),
  sessionController.getSessions
);

// POST /api/sessions - Create a new session
// Clear the sessions cache when a new session is created
router.post(
  '/sessions',
  isAuthenticated,
  isCoach,
  clearCache(SESSION_CACHE_PREFIX),
  sessionController.createSession
);

















export default router;
