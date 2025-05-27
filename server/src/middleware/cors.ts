import cors from 'cors';
import { APIError, ErrorCode } from './error.js';

// Define the allowed origins
const allowedOrigins = [
  'http://localhost:3000', // Development client
  'http://localhost:5173', // Vite dev server
  'https://lumea.coaching', // Production domain
];

// CORS options
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(APIError.forbidden('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Create the CORS middleware
export const corsMiddleware = cors(corsOptions);
