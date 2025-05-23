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
import memorystore from 'memorystore'; // Add memorystore import

const MemoryStore = memorystore(session); // Create MemoryStore constructor

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
import reflectionRoutes from './src/routes/reflections';

// Remove analyticsController import if not used here
// import { analyticsController } from './src/controllers/analyticsController';

declare module 'express-session' {
  interface SessionData {
    passport?: { user: string }; // Made passport optional as it might not exist pre-auth
  }
}

// Load environment variables
config();

// Initialize Redis client for session storage
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000, // Limit connection attempts to 5 seconds
    reconnectStrategy: false // Disable auto-reconnection attempts
  }
});

// Setup express app but don't start listening until session store is ready
const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Initialize server with appropriate session store
async function initializeServer() {
  let sessionStore;
  
  try {
    // Try to connect to Redis with a timeout
    console.log('Attempting to connect to Redis...');
    // Use Promise.race to implement timeout
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('Connected to Redis for session storage');
    
    // Create Redis store for sessions if connection is successful
    sessionStore = new RedisStore({
      client: redisClient,
      prefix: 'session:',
    });
  } catch (err) {
    console.log('Using MemoryStore for session storage - Redis unavailable');
    // Create MemoryStore instance as fallback
    sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // If Redis client is still connecting, quit it to prevent repeated errors
    try {
      await redisClient.quit();
    } catch (e) {
      // Ignore any errors when quitting the client
    }
  }

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
        'http://localhost:8081', // Add port 8081 which is used in our dev environment
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
      store: sessionStore, // Use the appropriate store
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
  app.use(
    '/static',
    express.static(publicDir, {
      setHeaders: (res, path) => {
        staticCacheMiddleware({ path } as unknown as Request, res as Response, () => {});
      },
    })
  );

  // Routes - Use the imported route handlers with caching for read operations
  app.use('/api/auth', authRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/admin', adminRoutes); // Keep admin routes if needed
  app.use('/api/coach/clients', clientRoutes); // Correct mount path for coach-specific client routes
  app.use('/api/resources', resourceRoutes); // Added resource routes
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/reflections', reflectionRoutes);

  // --- Removed duplicate/inline routes if any existed ---

  // Basic health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Error handling middleware
  const errorHandler: ErrorRequestHandler = (
    err: Error,
    _req: unknown,
    res: Response,
    _next: NextFunction
  ) => {
    console.error('[Global Error Handler]:', err.stack);
    res.status(500).json({ message: err.message || 'Internal server error' });
  };

  app.use(errorHandler);

  // Start server
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Start the server
initializeServer().catch(err => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
});
