import { Request, Response, NextFunction } from 'express';
import { MongoServerError } from 'mongodb';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import jwt from 'jsonwebtoken';

// Error codes for consistent client-side handling
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource Management
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Rate Limiting & Security
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  REQUEST_TOO_LARGE = 'REQUEST_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  
  // Server
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // Business Logic
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_OPERATION = 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION'
}

// Standardized error response interface
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    path?: string;
    method?: string;
    stack?: string; // Only in development
  };
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
}

// Enhanced custom error class
export class APIError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly errors?: Array<{ field?: string; message: string; code?: string }>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
    errors?: Array<{ field?: string; message: string; code?: string }>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.errors = errors;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, APIError);
  }

  // Factory methods for common error types
  static unauthorized(message: string = 'Authentication required', details?: any): APIError {
    return new APIError(ErrorCode.UNAUTHORIZED, message, 401, details);
  }

  static forbidden(message: string = 'Access denied', details?: any): APIError {
    return new APIError(ErrorCode.FORBIDDEN, message, 403, details);
  }

  static notFound(resource: string = 'Resource', details?: any): APIError {
    return new APIError(ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`, 404, details);
  }

  static validation(message: string, errors?: Array<{ field?: string; message: string; code?: string }>): APIError {
    return new APIError(ErrorCode.VALIDATION_ERROR, message, 400, undefined, errors);
  }

  static conflict(message: string = 'Resource already exists', details?: any): APIError {
    return new APIError(ErrorCode.RESOURCE_ALREADY_EXISTS, message, 409, details);
  }

  static rateLimit(message: string = 'Rate limit exceeded', details?: any): APIError {
    return new APIError(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429, details);
  }

  static internal(message: string = 'Internal server error', details?: any): APIError {
    return new APIError(ErrorCode.INTERNAL_SERVER_ERROR, message, 500, details, undefined, false);
  }
}

// Request ID generator for tracking
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Enhanced error logging with structured data
const logError = (error: Error, req: Request, requestId: string): void => {
  const logData = {
    requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof APIError && {
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        details: error.details
      })
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      },
      ip: req.ip,
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role
    },
    timestamp: new Date().toISOString()
  };

  // Log different levels based on error type
  if (error instanceof APIError && error.isOperational) {
    if (error.statusCode >= 500) {
      console.error('🔴 Server Error:', logData);
    } else if (error.statusCode >= 400) {
      console.warn('🟡 Client Error:', logData);
    } else {
      console.info('🔵 Request Error:', logData);
    }
  } else {
    console.error('💥 Unexpected Error:', logData);
  }
};

// Convert various error types to APIError
const convertToAPIError = (error: Error): APIError => {
  // Already an APIError
  if (error instanceof APIError) {
    return error;
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const errors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    return APIError.validation('Invalid input data', errors);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new APIError(ErrorCode.INVALID_TOKEN, 'Invalid authentication token', 401);
  }

  if (error.name === 'TokenExpiredError') {
    return new APIError(ErrorCode.TOKEN_EXPIRED, 'Authentication token has expired', 401);
  }

  // Multer file upload errors
  if (error instanceof MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return new APIError(ErrorCode.FILE_TOO_LARGE, 'File size exceeds limit', 400, { limit: error.message });
      case 'LIMIT_FILE_COUNT':
        return new APIError(ErrorCode.VALIDATION_ERROR, 'Too many files uploaded', 400);
      case 'LIMIT_FIELD_KEY':
        return new APIError(ErrorCode.VALIDATION_ERROR, 'Field name too long', 400);
      case 'LIMIT_FIELD_VALUE':
        return new APIError(ErrorCode.VALIDATION_ERROR, 'Field value too long', 400);
      case 'LIMIT_FIELD_COUNT':
        return new APIError(ErrorCode.VALIDATION_ERROR, 'Too many fields', 400);
      case 'LIMIT_UNEXPECTED_FILE':
        return new APIError(ErrorCode.INVALID_FILE_TYPE, 'Unexpected file field', 400);
      default:
        return new APIError(ErrorCode.VALIDATION_ERROR, error.message, 400);
    }
  }

  // MongoDB/Mongoose errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    const mongoError = error as MongoServerError;
    
    if (mongoError.code === 11000) {
      // Duplicate key error
      const duplicateField = Object.keys((mongoError as any).keyPattern || {})[0] || 'field';
      return new APIError(
        ErrorCode.DUPLICATE_KEY,
        `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists`,
        409,
        { field: duplicateField }
      );
    }
    
    return new APIError(ErrorCode.DATABASE_ERROR, 'Database operation failed', 500, undefined, undefined, false);
  }

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const validationError = error as any;
    const errors = Object.values(validationError.errors || {}).map((err: any) => ({
      field: err.path,
      message: err.message,
      code: err.kind
    }));
    return APIError.validation('Validation failed', errors);
  }

  // Mongoose cast errors
  if (error.name === 'CastError') {
    const castError = error as any;
    return APIError.validation(`Invalid ${castError.path}: ${castError.value}`);
  }

  // Connection errors
  if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
    return new APIError(ErrorCode.CONNECTION_ERROR, 'Service connection failed', 503, undefined, undefined, false);
  }

  // Timeout errors
  if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
    return new APIError(ErrorCode.TIMEOUT, 'Request timeout', 408);
  }

  // Default to internal server error for unknown errors
  return APIError.internal('An unexpected error occurred', { originalError: error.message });
};

// Main error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Generate request ID for tracking
  const requestId = generateRequestId();
  
  // Convert to standardized APIError
  const apiError = convertToAPIError(err);
  
  // Log the error with context
  logError(err, req, requestId);
  
  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      timestamp: new Date().toISOString(),
      requestId,
      path: req.path,
      method: req.method,
      ...(apiError.details && { details: apiError.details }),
      // Include stack trace only in development
      ...(process.env.NODE_ENV === 'development' && { stack: apiError.stack })
    },
    ...(apiError.errors && { errors: apiError.errors })
  };

  // Send error response
  res.status(apiError.statusCode).json(errorResponse);
};

// 404 Not Found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = generateRequestId();
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.RESOURCE_NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId,
      path: req.path,
      method: req.method
    }
  };

  console.warn('🟡 Route Not Found:', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(404).json(errorResponse);
};

// Async error wrapper to catch async errors in route handlers
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Success response helper
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    requestId?: string;
    timestamp: string;
  };
}

export const successResponse = <T>(
  data: T,
  message?: string,
  metadata?: Omit<SuccessResponse<T>['metadata'], 'timestamp'>
): SuccessResponse<T> => ({
  success: true,
  data,
  ...(message && { message }),
  ...(metadata && {
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
  })
});

// Legacy exports for backward compatibility
export const notFound = notFoundHandler;
