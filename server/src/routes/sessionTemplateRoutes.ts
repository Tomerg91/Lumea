import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { SessionTemplate } from '../models/SessionTemplate';
import { TemplateSession } from '../models/TemplateSession';
import { CoachingSession } from '../models/CoachingSession';
import { isAuthenticated, isCoach } from '../middlewares/auth';
import { cacheResponse, clearCache } from '../middleware/cache';
import { sessionTemplateSchemas } from '../schemas/validation';

import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Cache configuration for session templates
const TEMPLATE_CACHE_TTL = 600; // 10 minutes
const TEMPLATE_CACHE_PREFIX = 'session-templates';



















export default router; 