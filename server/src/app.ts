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
import clientRoutes from './routes/clientRoutes';
import feedbackRoutes from './routes/feedbackRoutes';

// Import services
import { feedbackTriggerService } from './services/feedbackTriggerService';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/satyacoaching';

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Create database indexes for better performance
    await createDatabaseIndexes();

    // Initialize feedback trigger service
    try {
      await feedbackTriggerService.initialize();
      console.log('Feedback trigger service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize feedback trigger service:', error);
      // Don't exit the app if feedback service fails to initialize
    }
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
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

app.use(morgan('dev')); // Request logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/api', inviteRoutes);
app.use('/api', passwordResetRoutes);
app.use('/api', adminRoutes);
app.use('/api', authRoutes);
app.use('/api', sessionRoutes);
app.use('/api', clientRoutes);
app.use('/api/feedback', feedbackRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  feedbackTriggerService.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  feedbackTriggerService.shutdown();
  process.exit(0);
});

export default app;
