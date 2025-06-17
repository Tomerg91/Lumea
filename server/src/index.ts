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
import availabilityRoutes from './routes/availabilityRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import hipaaComplianceRoutes from './routes/hipaaComplianceRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import advancedAuditRoutes from './routes/advancedAuditRoutes.js';
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
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { logger } from './services/logger';
import './services/monitoring'; // Initialize Monitoring Service early
import { encryptionService } from './services/encryptionService';

config();

// Environment Variable Validation
const validateEnvVariables = () => {
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'CLIENT_URL',
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
  ];

  if (process.env.NODE_ENV !== 'test') {
    // Check for missing required variables
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      console.error(`FATAL ERROR: Missing required environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }

    // Validate NODE_ENV
    if (!['development', 'production', 'test'].includes(process.env.NODE_ENV!)) {
      console.error(`FATAL ERROR: Invalid NODE_ENV value: ${process.env.NODE_ENV}. Must be development, production, or test.`);
      process.exit(1);
    }

    // Validate JWT secrets are not defaults
    if (process.env.JWT_ACCESS_SECRET === 'your_default_access_secret' ||
        process.env.JWT_REFRESH_SECRET === 'your_default_refresh_secret') {
      console.error('FATAL ERROR: Default JWT secrets detected. Change them immediately for security.');
      process.exit(1);
    }

    // Validate session secret is not default
    if (process.env.SESSION_SECRET === 'your_default_session_secret') {
      console.error('FATAL ERROR: Default session secret detected. Change it immediately for security.');
      process.exit(1);
    }

    // Validate encryption key format
    if (process.env.ENCRYPTION_KEY) {
      try {
        const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
        if (keyBuffer.length !== 32) {
          console.error('FATAL ERROR: ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
          process.exit(1);
        }
      } catch (error) {
        console.error('FATAL ERROR: ENCRYPTION_KEY must be a valid hex string');
        process.exit(1);
      }
    }

    // Validate DATABASE_URL format
    if (process.env.DATABASE_URL) {
      const dbUrl = process.env.DATABASE_URL;
      const isPostgreSQL = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
      const isMongoDB = dbUrl.startsWith('mongodb://') || dbUrl.startsWith('mongodb+srv://');
      
      if (!isPostgreSQL && !isMongoDB) {
        console.error('FATAL ERROR: DATABASE_URL must be a valid PostgreSQL or MongoDB connection string');
        process.exit(1);
      }
      
      // Log database type for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`Database type detected: ${isPostgreSQL ? 'PostgreSQL' : 'MongoDB'}`);
      }
    }

    // Production-specific validations
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.CLIENT_URL || process.env.CLIENT_URL.startsWith('http://localhost')) {
        console.error('FATAL ERROR: CLIENT_URL must be set to production domain in production environment');
        process.exit(1);
      }
      
      // Validate HTTPS in production
      if (!process.env.CLIENT_URL.startsWith('https://')) {
        console.error('FATAL ERROR: CLIENT_URL must use HTTPS in production environment');
        process.exit(1);
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

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session Configuration
const PgStore = connectPgSimple(session);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const sessionStore = new PgStore({
  pool: pool,
  tableName: 'user_sessions', // Or your preferred table name
  createTableIfMissing: true,
});

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
app.use(auditMiddleware);

// Route-specific rate limiting and middleware
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/reset-password', passwordResetLimiter); // Extra protection for password resets
app.use('/api/sessions', apiLimiter, sessionRoutes);
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
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/availability', apiLimiter, availabilityRoutes);
app.use('/api/compliance', apiLimiter, hipaaComplianceRoutes);
app.use('/api/audit', apiLimiter, auditRoutes);
app.use('/api/audit/advanced', apiLimiter, advancedAuditRoutes);
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
  
  server.close(() => {
    logger.info('HTTP server closed.');
    
    // Clean up rate limiters
    cleanupRateLimiters();
    
    // Close database connections
    pool.end(() => {
      logger.info('Database pool closed.');
      process.exit(0);
    });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
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
