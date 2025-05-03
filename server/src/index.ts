import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import session from 'express-session';
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

config();

const app = express();
const port = process.env.PORT || 5000;
app.set('port', port);

app.use(
  cors({
    origin: [
      'http://localhost:8080',
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

if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET environment variable is not set. Using default secret.');
}
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-insecure-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

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
  res.json({ status: 'ok' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]:', err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// Create HTTP server
const server = http.createServer(app);

// Listen on specified port
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  
  // Log environment information in development only
  if (process.env.NODE_ENV === 'development') {
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`API URL: ${process.env.REACT_APP_API_URL || 'Not specified'}`);
  }
});
