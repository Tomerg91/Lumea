import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

// Response time middleware options
interface ResponseTimeOptions {
  logSlowRequests?: boolean;
  slowRequestThreshold?: number;
}

// Create a response time middleware
export const responseTime = (options: ResponseTimeOptions = {}) => {
  const {
    logSlowRequests = true,
    slowRequestThreshold = 1000, // 1 second
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Start time
    const start = process.hrtime();

    // Add response time header
    res.on('finish', () => {
      // Calculate response time
      const [seconds, nanoseconds] = process.hrtime(start);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;

      // Set response time header
      res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);

      // Log slow requests
      if (logSlowRequests && responseTime > slowRequestThreshold) {
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          responseTime: `${responseTime.toFixed(2)}ms`,
          threshold: `${slowRequestThreshold}ms`,
        });
      }
    });

    next();
  };
};

// Create a response time middleware for API routes
export const apiResponseTime = () => {
  return responseTime({
    logSlowRequests: true,
    slowRequestThreshold: 500, // 500ms
  });
};

// Create a response time middleware for file uploads
export const uploadResponseTime = () => {
  return responseTime({
    logSlowRequests: true,
    slowRequestThreshold: 2000, // 2 seconds
  });
};
