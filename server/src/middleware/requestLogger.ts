import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

// Request logger middleware options
interface RequestLoggerOptions {
  logHeaders?: boolean;
  logBody?: boolean;
  logQuery?: boolean;
  logParams?: boolean;
}

// Create a request logger middleware
export const requestLogger = (options: RequestLoggerOptions = {}) => {
  const {
    logHeaders = false,
    logBody = false,
    logQuery = false,
    logParams = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Log request details
    const requestDetails: any = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    // Log headers if enabled
    if (logHeaders) {
      requestDetails.headers = req.headers;
    }

    // Log query parameters if enabled
    if (logQuery && Object.keys(req.query).length > 0) {
      requestDetails.query = req.query;
    }

    // Log URL parameters if enabled
    if (logParams && Object.keys(req.params).length > 0) {
      requestDetails.params = req.params;
    }

    // Log request body if enabled
    if (logBody && req.body && Object.keys(req.body).length > 0) {
      requestDetails.body = req.body;
    }

    // Log request
    logger.info('Incoming request', requestDetails);

    // Log response
    const originalSend = res.send;
    res.send = function (body) {
      logger.info('Outgoing response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: res.get('X-Response-Time'),
      });

      return originalSend.call(this, body);
    };

    next();
  };
};

// Create a request logger middleware for API routes
export const apiRequestLogger = () => {
  return requestLogger({
    logHeaders: true,
    logBody: true,
    logQuery: true,
    logParams: true,
  });
};

// Create a request logger middleware for file uploads
export const uploadRequestLogger = () => {
  return requestLogger({
    logHeaders: true,
    logBody: false,
    logQuery: true,
    logParams: true,
  });
}; 