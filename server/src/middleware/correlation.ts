import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';

// Correlation middleware options
interface CorrelationOptions {
  headerName?: string;
  generateId?: () => string;
}

// Create a correlation middleware
export const correlation = (options: CorrelationOptions = {}) => {
  const {
    headerName = 'X-Correlation-ID',
    generateId = () => uuidv4(),
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Get correlation ID from header or generate new one
    const correlationId = req.headers[headerName.toLowerCase()] || generateId();

    // Set correlation ID in request and response
    req.headers[headerName.toLowerCase()] = correlationId;
    res.setHeader(headerName, correlationId);

    // Add correlation ID to logger context
    logger.defaultMeta = {
      ...logger.defaultMeta,
      correlationId,
    };

    // Log request with correlation ID
    logger.debug('Request correlated', {
      correlationId,
      method: req.method,
      url: req.url,
    });

    next();
  };
};

// Create a correlation middleware for API routes
export const apiCorrelation = () => {
  return correlation({
    headerName: 'X-API-Correlation-ID',
  });
};

// Create a correlation middleware for file uploads
export const uploadCorrelation = () => {
  return correlation({
    headerName: 'X-Upload-Correlation-ID',
  });
};

// Create a correlation middleware for webhooks
export const webhookCorrelation = () => {
  return correlation({
    headerName: 'X-Webhook-Correlation-ID',
  });
}; 