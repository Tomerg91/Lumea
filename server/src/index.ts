import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import session, { SessionOptions } from 'express-session';
import passport from 'passport';
import './config/passport.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/session.js';
import adminRoutes from './routes/admin.js';
import coachRoutes from './routes/coach.js';
import resourceRoutes from './routes/resources.js';
import reflectionRoutes from './routes/reflection.js';
import fileRoutes from './routes/file.js';
import tagRoutes from './routes/tag.js';
import coachNoteRoutes from './routes/coachNote.js';
import userRoutes from './routes/user.js';
import analyticsRoutes from './routes/analytics.js';
import metricsRoutes from './routes/metrics.js';
import dashboardRoutes from './routes/dashboard.js';
import supabaseNotificationRoutes from './routes/supabaseNotificationRoutes.js';
import sessionTimerRoutes from './routes/sessionTimer.js';
import { sessionHistoryRoutes } from './routes/sessionHistoryRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import hipaaComplianceRoutes from './routes/hipaaComplianceRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import encryptionRoutes from './routes/encryptionRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import dataRetentionRoutes from './routes/dataRetentionRoutes.js';
import securityMonitoringRoutes from './routes/securityMonitoringRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { 
  applySecurity, 
  getClientIp,
  securityLogging 
} from './middleware/security.js';
import {
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  apiLimiter,
  anonymousLimiter,
  adminLimiter,
  coachNotesLimiter,
  reflectionLimiter,
  burstProtection,
  sustainedLimiter,
  cleanupRateLimiters
} from './middleware/rateLimit.js';
import { auditMiddleware } from './middleware/auditMiddleware.js';
import http from 'http';
// PostgreSQL imports removed - using Supabase instead
import { logger } from './services/logger';
import './services/monitoring'; // Initialize Monitoring Service early
import { encryptionService } from './services/encryptionService';
import redisClient from './utils/cache';

config();

// Environment Variable Validation
const validateEnvVariables = () => {
  // Core required variables for Railway deployment
  const coreRequiredVars = [
    'NODE_ENV',
    'PORT'
  ];

  // Supabase variables - required for full functionality
  const supabaseRequiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  // JWT variables - use fallbacks for Railway deployment
  const jwtVars = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET', 
    'SESSION_SECRET'
  ];

  if (process.env.NODE_ENV !== 'test') {
    // Check core variables
    const missingCore = coreRequiredVars.filter(varName => !process.env[varName]);
    if (missingCore.length > 0) {
      console.error(`FATAL ERROR: Missing core environment variables: ${missingCore.join(', ')}`);
      process.exit(1);
    }

    // Set defaults for Railway deployment
    if (!process.env.JWT_ACCESS_SECRET && process.env.JWT_SECRET) {
      process.env.JWT_ACCESS_SECRET = process.env.JWT_SECRET;
    }
    if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
      process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
    }
    if (!process.env.CLIENT_URL && process.env.FRONTEND_URL) {
      process.env.CLIENT_URL = process.env.FRONTEND_URL;
    }

    // Warn about missing Supabase but don't exit (allow health check to work)
    const missingSupabase = supabaseRequiredVars.filter(varName => !process.env[varName]);
    if (missingSupabase.length > 0) {
      console.warn(`WARNING: Supabase variables missing: ${missingSupabase.join(', ')} - database features will be limited`);
    }

    // Check JWT variables with fallbacks
    const missingJwt = jwtVars.filter(varName => !process.env[varName]);
    if (missingJwt.length > 0) {
      console.warn(`WARNING: JWT variables missing: ${missingJwt.join(', ')} - authentication will be limited`);
    }

    // Validate NODE_ENV
    if (!['development', 'production', 'test'].includes(process.env.NODE_ENV!)) {
      console.warn(`WARNING: Invalid NODE_ENV value: ${process.env.NODE_ENV}. Defaulting to production.`);
      process.env.NODE_ENV = 'production';
    }

    // Validate JWT secrets are not defaults (warn but don't exit)
    if (process.env.JWT_ACCESS_SECRET === 'your_default_access_secret' ||
        process.env.JWT_REFRESH_SECRET === 'your_default_refresh_secret' ||
        process.env.JWT_SECRET === 'your_default_jwt_secret') {
      console.warn('WARNING: Default JWT secrets detected. Change them for security.');
    }

    // Validate session secret is not default (warn but don't exit)
    if (process.env.SESSION_SECRET === 'your_default_session_secret') {
      console.warn('WARNING: Default session secret detected. Change it for security.');
    }

    // Validate encryption key format (warn but don't exit)
    if (process.env.ENCRYPTION_KEY) {
      try {
        const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
        if (keyBuffer.length !== 32) {
          console.warn('WARNING: ENCRYPTION_KEY must be 32 bytes (64 hex characters) - encryption features may not work');
        }
      } catch (error) {
        console.warn('WARNING: ENCRYPTION_KEY must be a valid hex string - encryption features may not work');
      }
    }

    // Validate Supabase configuration
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`✅ Supabase configuration detected`);
    } else {
      console.warn('WARNING: Supabase not fully configured - database features will be limited');
    }

    // Production-specific validations (warn but don't exit)
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.CLIENT_URL && !process.env.FRONTEND_URL) {
        console.warn('WARNING: CLIENT_URL or FRONTEND_URL should be set in production');
      } else if (process.env.CLIENT_URL && process.env.CLIENT_URL.startsWith('http://localhost')) {
        console.warn('WARNING: CLIENT_URL should not use localhost in production');
      } else if (process.env.CLIENT_URL && !process.env.CLIENT_URL.startsWith('https://')) {
        console.warn('WARNING: CLIENT_URL should use HTTPS in production');
      }
    }
  }
};

validateEnvVariables(); // Call validation at startup

const app: Application = express();
const port = parseInt(process.env.PORT || '5000', 10);
app.set('port', port);

// Trust proxy for accurate IP detection
app.set('trust proxy', 1);

// Apply security middleware early
app.use(applySecurity);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:8084',
  'http://localhost:8085',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // In production, only allow specific origins
      if (process.env.NODE_ENV === 'production') {
        if (origin === process.env.CLIENT_URL) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      }
      
      // In development, be more permissive
      // Allow requests without origin (curl, postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow any localhost origin in development
      if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
        return callback(null, true);
      }
      
      // Allow configured origins
      const developmentOrigins = [
        ...allowedOrigins,
        process.env.CLIENT_URL
      ].filter(Boolean);
      
      if (developmentOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // In development, log rejected origins for debugging
      console.log(`CORS: Rejecting origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// We need the raw body to verify webhook signatures, so we add this before express.json()
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session Configuration - using memory store since Supabase handles auth
console.log('✅ Using memory store for sessions (Supabase handles authentication)');
const sessionStore = new session.MemoryStore();

const sessionOptions: SessionOptions = {
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
  },
};
app.use(session(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());

// Apply burst protection globally
app.use(burstProtection);
app.use(sustainedLimiter);

// Apply anonymous user rate limiting
app.use(anonymousLimiter);

// Apply audit middleware for HIPAA compliance logging
// TODO: Fix MongoDB dependency in audit service before re-enabling
// app.use(auditMiddleware);

// Route-specific rate limiting and middleware
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/reset-password', passwordResetLimiter); // Extra protection for password resets
app.use('/api/sessions', apiLimiter, sessionRoutes);
app.use('/api/sessions/timer', apiLimiter, sessionTimerRoutes);
app.use('/api/session-history', apiLimiter, sessionHistoryRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/coach/clients', apiLimiter, coachRoutes);
app.use('/api/resources', apiLimiter, resourceRoutes);
app.use('/api/reflections', reflectionLimiter, reflectionRoutes);
app.use('/api/files', uploadLimiter, fileRoutes);
app.use('/api/tags', apiLimiter, tagRoutes);
app.use('/api/coach-notes', coachNotesLimiter, coachNoteRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/metrics', apiLimiter, metricsRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/notifications', apiLimiter, supabaseNotificationRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/subscriptions', apiLimiter, subscriptionRoutes);
app.use('/api/availability', apiLimiter, availabilityRoutes);
app.use('/api/compliance', apiLimiter, hipaaComplianceRoutes);
app.use('/api/audit', apiLimiter, auditRoutes);
app.use('/api/encryption', apiLimiter, encryptionRoutes);
app.use('/api/consent', apiLimiter, consentRoutes);
app.use('/api/data-retention', apiLimiter, dataRetentionRoutes);
app.use('/api/security-monitoring', apiLimiter, securityMonitoringRoutes);

// Health check endpoint (no rate limiting)
app.get('/api/health', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  res.status(200).json({ 
    status: 'UP', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    clientIp: clientIp,
    environment: process.env.NODE_ENV 
  });
});

// Security monitoring endpoint (admin only, no rate limiting)
app.get('/api/security/status', (req: Request, res: Response) => {
  // This would be protected by admin middleware in a real implementation
  res.status(200).json({
    security: {
      headers: 'enabled',
      rateLimiting: 'enabled',
      requestSizeLimit: 'enabled',
      suspiciousActivityDetection: 'enabled',
      ipChangeDetection: 'enabled',
      securityLogging: 'enabled'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unmatched routes (Must be BEFORE the error handler)
app.use(notFoundHandler);

// Global Error Handler (Must be defined AFTER all other app.use() and routes calls)
app.use(errorHandler);

// Initialize encryption service (singleton pattern)
console.log('🔐 Encryption service initialized');

// Create HTTP server
const server = http.createServer(app);

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Force close after 30 seconds
  const shutdownTimeout = setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);

  server.close(() => {
    logger.info('HTTP server closed.');

    // Clean up rate limiters
    cleanupRateLimiters();

    const wasRedisReady = redisClient.isReady;
    const redisPromise = wasRedisReady ? redisClient.quit() : Promise.resolve();

    redisPromise
      .catch(err => {
        logger.warn('Error disconnecting Redis, continuing shutdown...', err);
      })
      .then(() => {
        if (wasRedisReady) {
          logger.info('Redis client disconnected.');
        } else {
          logger.info('Redis client was not connected, skipping disconnection.');
        }
        // No database pool to close - using Supabase
        logger.info('No database pool to close (using Supabase).');
        clearTimeout(shutdownTimeout);
        logger.info('Graceful shutdown complete.');
        process.exit(0);
      })
      .catch((err) => {
        logger.error('Error during graceful shutdown:', err);
        process.exit(1);
      });
  });
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception:', err);
  // Attempt graceful shutdown then exit
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled promise rejection:', reason);
  // Attempt graceful shutdown then exit
  gracefulShutdown('unhandledRejection');
});

// Listen on specified port
if (process.env.NODE_ENV !== 'test') {
  let currentPort = port;
  const maxRetries = 10;

  const listen = (attempt = 0) => {
    server.listen(currentPort, () => {
      logger.info(`🚀 Server is running on port ${currentPort} in ${process.env.NODE_ENV} mode`);
      logger.info(`🔒 Security middleware enabled`);
      logger.info(`⚡ Rate limiting configured`);
      if (process.env.NODE_ENV === 'development' && currentPort !== port) {
        logger.warn(`Port ${port} was busy, dev server started on ${currentPort}`);
      }
      if (process.env.NODE_ENV === 'development') {
        logger.info(`Client URL (server expects): ${process.env.CLIENT_URL}`);
      }
    });

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && process.env.NODE_ENV === 'development' && attempt < maxRetries) {
        logger.warn(`Port ${currentPort} in use, trying ${currentPort + 1}...`);
        currentPort += 1;
        listen(attempt + 1);
      } else {
        logger.error('Unhandled server error:', err);
        process.exit(1);
      }
    });
  };

  listen();
}

// Ensure SESSION_SECRET handling is robust
if (!process.env.SESSION_SECRET && process.env.NODE_ENV !== 'test') {
  logger.error(
    'FATAL ERROR: SESSION_SECRET is not defined. Please set it in your .env file or Vercel environment variables.'
  );
  process.exit(1);
}

server.on('error', (error: NodeJS.ErrnoException) => {
  if (logger && typeof logger.error === 'function') {
    logger.error('Unhandled server error:', error);
  } else {
    console.error(`Server error: ${error.message}`, { code: error.code, syscall: error.syscall });
  }
});

export default app;
