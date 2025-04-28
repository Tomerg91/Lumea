import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';

// Request ID middleware options
interface RequestIdOptions {
  headerName?: string;
  generateId?: () => string;
}

// Create a request ID middleware
export const requestId = (options: RequestIdOptions = {}) => {
  const {
    headerName = 'X-Request-ID',
    generateId = () => uuidv4(),
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Get request ID from header or generate new one
    const requestId = req.headers[headerName.toLowerCase()] || generateId();

    // Set request ID in request and response
    req.headers[headerName.toLowerCase()] = requestId;
    res.setHeader(headerName, requestId);

    // Add request ID to logger context
    logger.defaultMeta = {
      ...logger.defaultMeta,
      requestId,
    };

    // Log request with ID
    logger.debug('Request received', {
      requestId,
      method: req.method,
      url: req.url,
    });

    next();
  };
};

// Create a request ID middleware for API routes
export const apiRequestId = () => {
  return requestId({
    headerName: 'X-API-Request-ID',
  });
};

// Create a request ID middleware for file uploads
export const uploadRequestId = () => {
  return requestId({
    headerName: 'X-Upload-Request-ID',
  });
}; 