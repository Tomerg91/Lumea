import { Request, Response, NextFunction } from 'express';
import { APIError } from './error.js';

// Limit middleware options
interface LimitOptions {
  maxSize?: number;
  errorMessage?: string;
}

// Create a limit middleware
export const limitMiddleware = (options: LimitOptions = {}) => {
  const maxSize = options.maxSize || 1024 * 1024; // Default: 1MB
  const errorMessage = options.errorMessage || 'Request entity too large';

  return (req: Request, res: Response, next: NextFunction) => {
    // Get content length
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    // Check if content length exceeds max size
    if (contentLength > maxSize) {
      throw new APIError(413, errorMessage);
    }

    // Track request size
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        req.destroy();
        throw new APIError(413, errorMessage);
      }
    });

    next();
  };
};

// Create a limit middleware for JSON requests
export const jsonLimit = () => {
  return limitMiddleware({
    maxSize: 1024 * 1024, // 1MB
    errorMessage: 'JSON request entity too large',
  });
};

// Create a limit middleware for file uploads
export const fileLimit = () => {
  return limitMiddleware({
    maxSize: 5 * 1024 * 1024, // 5MB
    errorMessage: 'File upload too large',
  });
};

// Create a limit middleware for form data
export const formLimit = () => {
  return limitMiddleware({
    maxSize: 2 * 1024 * 1024, // 2MB
    errorMessage: 'Form data too large',
  });
}; 