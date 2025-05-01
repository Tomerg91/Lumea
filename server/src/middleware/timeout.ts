import { Request, Response, NextFunction } from 'express';
import { APIError } from './error.js';

// Timeout middleware options
interface TimeoutOptions {
  timeout?: number;
  errorMessage?: string;
}

// Create a timeout middleware
export const timeoutMiddleware = (options: TimeoutOptions = {}) => {
  const timeout = options.timeout || 30000; // Default timeout: 30 seconds
  const errorMessage = options.errorMessage || 'Request timeout';

  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout
    req.setTimeout(timeout, () => {
      throw new APIError(408, errorMessage);
    });

    // Clear timeout on response finish
    res.on('finish', () => {
      req.setTimeout(0);
    });

    next();
  };
};

// Create a timeout middleware for specific routes
export const routeTimeout = (timeout: number, errorMessage?: string) => {
  return timeoutMiddleware({
    timeout,
    errorMessage,
  });
};

// Create a timeout middleware for long-running operations
export const longOperationTimeout = () => {
  return timeoutMiddleware({
    timeout: 300000, // 5 minutes
    errorMessage: 'Operation timeout',
  });
};
