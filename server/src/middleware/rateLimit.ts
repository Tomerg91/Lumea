import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { APIError } from './error.js';

// Create a limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  handler: (req: Request, res: Response) => {
    throw new APIError(429, 'Too many requests');
  },
});

// Create a limiter for API routes
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
  message: 'Too many requests, please try again later',
  handler: (req: Request, res: Response) => {
    throw new APIError(429, 'Too many requests');
  },
});

// Create a limiter for file upload routes
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per windowMs
  message: 'Too many file uploads, please try again later',
  handler: (req: Request, res: Response) => {
    throw new APIError(429, 'Too many requests');
  },
});
