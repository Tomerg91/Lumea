import express from 'express';
import { clientController } from '../controllers/clientController';
import { isAuthenticated, isCoach } from '../middlewares/auth';
import { cacheResponse } from '../middleware/cache';

const router = express.Router();

// Cache configuration for clients
const CLIENT_CACHE_TTL = 300; // 5 minutes
const CLIENT_CACHE_PREFIX = 'clients';

// GET /api/my-clients - Get clients for the authenticated coach
router.get(
  '/my-clients', 
  isAuthenticated, 
  isCoach, 
  cacheResponse({ ttl: CLIENT_CACHE_TTL, keyPrefix: CLIENT_CACHE_PREFIX }),
  clientController.getMyClients
);

export default router; 