import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import session from 'express-session';
import passport from 'passport';
// Remove LocalStrategy import if no longer used directly here
// import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt'; // Changed from bcryptjs
import { PrismaClient } from '@prisma/client'; // Removed unused User import
import compression from 'compression';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';

// Import the centralized Passport configuration
import './config/passport';

// Import Middleware
import staticCacheMiddleware from './src/middleware/staticCache';
import { cacheMiddleware } from './src/utils/cache';

// Import Routes
import authRoutes from './routes/auth';
import sessionRoutes from './routes/sessions';
import adminRoutes from './routes/admin';
import clientRoutes from './routes/clients';
import resourceRoutes from './routes/resources'; // Added resource routes import
import metricsRoutes from './routes/metrics';

// Remove analyticsController import if not used here
// import { analyticsController } from './src/controllers/analyticsController';

declare module 'express-session' {
  interface SessionData {
    passport?: { user: string }; // Made passport optional as it might not exist pre-auth
  }
}

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Initialize Redis client for session storage
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis session store error:', err);
});

(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis for session storage');
  } catch (err) {
    console.error('Failed to connect to Redis for session storage:', err);
  }
})();

// Create Redis store for sessions
const redisSessionStore = new RedisStore({
  client: redisClient,
  prefix: 'session:',
});

// Add compression middleware
app.use(compression());

// Middleware
app.use(
  cors({
    // Allow multiple origins for development (client port might change)
    origin: [
      'http://localhost:8080', // Added the current frontend port
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://localhost:5178',
      'http://localhost:5179',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json());

// Session configuration
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET environment variable is not set. Using default secret.');
}
app.use(
  session({
    store: redisSessionStore,
    secret: process.env.SESSION_SECRET || 'fallback-insecure-secret-key', // Provide a fallback but warn
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true, // Recommended for security
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none', // Adjust for cross-site needs if any, 'lax' is safer default
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport AFTER session middleware
app.use(passport.initialize());
app.use(passport.session());

// Static files serving with cache headers
if (!process.env.PUBLIC_DIR) {
  console.warn('WARNING: PUBLIC_DIR not set. Using default "public" directory.');
}
const publicDir = process.env.PUBLIC_DIR || 'public';
app.use('/static', express.static(publicDir, {
  setHeaders: (res, path) => {
    staticCacheMiddleware(
      { path } as Request, 
      res as Response, 
      () => {}
    );
  }
}));

// Routes - Use the imported route handlers with caching for read operations
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes); // Keep admin routes if needed
app.use('/api/coach/clients', clientRoutes); // Correct mount path for coach-specific client routes
app.use('/api/resources', resourceRoutes); // Added resource routes
app.use('/api/metrics', metricsRoutes);

// --- Removed duplicate/inline routes if any existed ---

// Basic health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Global Error Handler]:', err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
};

app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
