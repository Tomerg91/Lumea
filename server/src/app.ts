import express from 'express';
import morgan from 'morgan';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import createDatabaseIndexes from './utils/createIndexes';
import performanceMonitor from './middleware/performance';

// Import middleware
import configureSecurityMiddleware from './middleware/security';

// Import routes
import inviteRoutes from './routes/inviteRoutes';
import passwordResetRoutes from './routes/passwordResetRoutes';
import adminRoutes from './routes/admin';
import authRoutes from './routes/authRoutes';
import sessionRoutes from './routes/sessionRoutes';
import sessionTimerRoutes from './routes/sessionTimer';
import sessionTemplateRoutes from './routes/sessionTemplateRoutes';
import clientRoutes from './routes/clientRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import analyticsRoutes from './routes/analytics';
import healthRoutes from './routes/health';
import operationsRoutes from './routes/operations';
import supportRoutes from './routes/support';

// Import services
import { feedbackTriggerService } from './services/feedbackTriggerService';
import { QueueService } from './services/queueService';
import { BackupService } from './services/backupService';

// Load environment variables
dotenv.config();

// Validate environment variables
import { validateEnvironmentOrExit } from './utils/validateEnv';
validateEnvironmentOrExit();

// Create Express app
const app = express();

// Initialize services
let queueService: QueueService;
let backupService: BackupService;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/satyacoaching';

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    logger.info('Connected to MongoDB');

    // Create database indexes for better performance
    await createDatabaseIndexes();

    // Initialize queue service for background processing
    try {
      queueService = QueueService.getInstance();
      await queueService.initialize();
      logger.info('Queue service initialized successfully');

      // Schedule recurring jobs
      await queueService.scheduleRecurringJobs();
      logger.info('Recurring background jobs scheduled');
    } catch (error) {
      logger.error('Failed to initialize queue service', { error: error instanceof Error ? error.message : error });
      // Continue without queue service for now
    }

    // Initialize backup service
    try {
      backupService = BackupService.getInstance();
      logger.info('Backup service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize backup service', { error: error instanceof Error ? error.message : error });
      // Continue without backup service for now
    }

    // Initialize feedback trigger service
    try {
      await feedbackTriggerService.initialize();
      logger.info('Feedback trigger service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize feedback trigger service', { error: error instanceof Error ? error.message : error });
      // Don't exit the app if feedback service fails to initialize
    }
  })
  .catch((error) => {
    logger.error('MongoDB connection error', { error: error instanceof Error ? error.message : error });
    process.exit(1);
  });

// Apply security middleware (includes helmet, cors, rate-limiting)
configureSecurityMiddleware(app);

// Apply performance monitoring middleware
app.use(
  performanceMonitor({
    slowThreshold: 500, // Log requests taking more than 500ms
  })
);

// Enhanced compression configuration
app.use(
  compression({
    level: 6, // Default is 6, higher = better compression but more CPU, adjust based on load testing
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress responses for old browsers without proper support
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression by default
      return compression.filter(req, res);
    },
  })
);

// Import logger
import logger, { morganStream } from './utils/logger';

// Request logging with Winston
app.use(morgan('combined', { stream: morganStream }));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/api', inviteRoutes);
app.use('/api', passwordResetRoutes);
app.use('/api', adminRoutes);
app.use('/api', authRoutes);
app.use('/api', sessionRoutes);
app.use('/api/sessions/timer', sessionTimerRoutes);
app.use('/api/session-templates', sessionTemplateRoutes);
app.use('/api', clientRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/support', supportRoutes);
app.use('/', healthRoutes); // Health checks at root level (no /api prefix)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack, 
    url: req.url, 
    method: req.method,
    userId: (req as any).user?.id
  });
  res.status(500).json({ message: 'Internal server error' });
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  // Shutdown services in order
  try {
    if (queueService) {
      await queueService.shutdown();
      logger.info('Queue service shut down successfully');
    }
  } catch (error) {
    logger.error('Error shutting down queue service', { error });
  }

  feedbackTriggerService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  
  // Shutdown services in order
  try {
    if (queueService) {
      await queueService.shutdown();
      logger.info('Queue service shut down successfully');
    }
  } catch (error) {
    logger.error('Error shutting down queue service', { error });
  }

  feedbackTriggerService.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
});

export default app;
