import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { config } from 'dotenv';
import { configurePassport } from './config/passport';
import sessionRoutes from './routes/session';
import reflectionRoutes from './routes/reflection';
import authRoutes from './routes/auth';
import fileRoutes from './routes/file';
import tagRoutes from './routes/tag';
import coachNoteRoutes from './routes/coachNote';
import adminRoutes from './routes/admin';
import coachRoutes from './routes/coach';
import userRoutes from './routes/user';
import resourceRoutes from './routes/resources';
import oauthRoutes from './routes/oauth';
import analyticsRoutes from './routes/analytics';
import { sessionHistoryRoutes } from './routes/sessionHistoryRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { notificationScheduler } from './services/notificationSchedulerService';

config();

const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lumea')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Initialize notification scheduler after database connection
    try {
      await notificationScheduler.initialize();
    } catch (error) {
      console.error('Failed to initialize notification scheduler:', error);
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/coach-notes', coachNoteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/session-history', sessionHistoryRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err instanceof Error ? err.stack : err);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  // Close the HTTP server
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      // Shutdown notification scheduler
      await notificationScheduler.shutdown();
      
      // Close database connection
      
      console.log('Database connection closed');
      
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force exit after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
