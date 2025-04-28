import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import session from 'express-session';
import passport from 'passport';
// Remove LocalStrategy import if no longer used directly here
// import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt'; // Changed from bcryptjs
import { PrismaClient } from '@prisma/client'; // Removed unused User import

// Import the centralized Passport configuration
import './config/passport';

// Import Routes
import authRoutes from './routes/auth';
import sessionRoutes from './routes/sessions';
import adminRoutes from './routes/admin';
import clientRoutes from './routes/clients';
import resourceRoutes from './routes/resources'; // Added resource routes import

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

// Middleware
app.use(cors({
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
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Session configuration
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET environment variable is not set. Using default secret.');
}
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-insecure-secret-key', // Provide a fallback but warn
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true, // Recommended for security
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none', // Adjust for cross-site needs if any, 'lax' is safer default
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport AFTER session middleware
app.use(passport.initialize());
app.use(passport.session());

// --- Removed Passport Strategy Definition --- 
// The configuration is now handled by importing './config/passport'

// --- Removed Passport Serialization/Deserialization ---
// The configuration is now handled by importing './config/passport'

// Routes - Use the imported route handlers
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes); // Keep admin routes if needed
app.use('/api/coach/clients', clientRoutes); // Correct mount path for coach-specific client routes
app.use('/api/resources', resourceRoutes); // Added resource routes

// --- Removed duplicate/inline routes if any existed ---

// Basic health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]:', err.stack);
  // Add more specific error handling (e.g., Prisma errors) if needed
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
