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

  if (process.env.NODE_ENV !== 'test') { // Skip for test environment or adjust as needed
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
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    if (logger && typeof logger.error === 'function') {
      logger.error(`FATAL ERROR: Invalid NODE_ENV: ${process.env.NODE_ENV}`);
    } else {
      console.error(`FATAL ERROR: Invalid NODE_ENV: ${process.env.NODE_ENV}`);
    }
  }

  // Example: Validate SMTP settings if email is crucial
  // if (process.env.ENABLE_EMAIL === 'true') {
  //   const smtpVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  //   smtpVars.forEach(varName => {
  //     if (!process.env[varName]) {
  //       console.error(`FATAL ERROR: Email enabled, but SMTP variable ${varName} is not set.`);
  //       process.exit(1);
  //     }
  //   });
  // }
};

validateEnvVariables(); // Call validation at startup

const app: Application = express();
const port = parseInt(process.env.PORT || "5000", 10);
app.set('port', port);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coach/clients', coachRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/coach-notes', coachNoteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

// Global Error Handler (Must be defined AFTER all other app.use() and routes calls)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Use the logger for error reporting
  logger.error(err.message, err, { 
    path: req.path,
    method: req.method,
    ip: req.ip,
    // Add other relevant request context if needed
  });

  const statusCode = (err as any).status || 500;
  const responseMessage = process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal Server Error' : err.message;
  
  res.status(statusCode).json({ error: responseMessage });
});

// Default route for unhandled paths (optional, place before error handler if used)
// app.use((req, res) => {
//   res.status(404).json({ error: 'Not Found' });
// });

// Create HTTP server
const server = http.createServer(app);

// Listen on specified port
if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    logger.info(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Client URL (server expects): ${process.env.CLIENT_URL}`);
      // VITE_API_URL is a client-side variable, usually not logged on server startup this way.
      // It's what the client uses to talk to this server.
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
    console.error(
      `Server error: ${error.message}`,
      { code: error.code, syscall: error.syscall }
    );
  }
});

export default app;
