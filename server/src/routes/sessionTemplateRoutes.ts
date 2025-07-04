import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { SessionTemplate } from '../models/SessionTemplate.js';
import { TemplateSession } from '../models/TemplateSession.js';
import { CoachingSession } from '../models/CoachingSession.js';
import { isAuthenticated, isCoach } from '../middlewares/auth.js';
import { cacheResponse, clearCache } from '../middleware/cache.js';
import { sessionTemplateSchemas } from '../schemas/validation.js';

import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Cache configuration for session templates
const TEMPLATE_CACHE_TTL = 600; // 10 minutes
const TEMPLATE_CACHE_PREFIX = 'session-templates';



















export default router; 