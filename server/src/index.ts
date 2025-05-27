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
import http from 'http';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { logger } from './services/logger';
import './services/monitoring'; // Initialize Monitoring Service early

config();

// Environment Variable Validation
const validateEnvVariables = () => {
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'CLIENT_URL',
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    // Add other critical variables, e.g., SMTP, Supabase, AWS keys if essential for startup
  ];

  if (process.env.NODE_ENV !== 'test') {
    // Skip for test environment or adjust as needed
    requiredEnvVars.forEach((varName) => {
      if (!process.env[varName]) {
        logger.error(`FATAL ERROR: Environment variable ${varName} is not set. Exiting.`);
        process.exit(1); // Exit if a required variable is missing
      }
    });
    if (!['development', 'production', 'test'].includes(process.env.NODE_ENV!)) {
      logger.error(`FATAL ERROR: Invalid NODE_ENV value: ${process.env.NODE_ENV}. Exiting.`);
      process.exit(1);
    }
    if (!process.env.SESSION_SECRET) {
      logger.error('FATAL ERROR: SESSION_SECRET is not defined. Exiting.');
      process.exit(1);
    }
  }

  // Validate specific values if necessary
  if (
    process.env.NODE_ENV !== 'development' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test'
  ) {
    if (logger && typeof logger.error === 'function') {
      logger.error(`FATAL ERROR: Invalid NODE_ENV: ${process.env.NODE_ENV}`);
    } else {
      console.error(`FATAL ERROR: Invalid NODE_ENV: ${process.env.NODE_ENV}`);
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
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if the origin is in the allowed list or is the configured CLIENT_URL
      if (allowedOrigins.includes(origin) || origin === process.env.CLIENT_URL) {
        return callback(null, true);
      }
      
      // In production, be more strict
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Not allowed by CORS'));
      }
      
      // In development, allow all localhost origins
      if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
        return callback(null, true);
      }
      
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

// Listen on specified port
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    logger.info(`🚀 Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
    logger.info(`🔒 Security middleware enabled`);
    logger.info(`⚡ Rate limiting configured`);
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Client URL (server expects): ${process.env.CLIENT_URL}`);
    }
  });
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
