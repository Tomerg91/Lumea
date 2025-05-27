import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { APIError, ErrorCode } from './error.js';

// Validation target types
type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

// Validation options
interface ValidationOptions {
  stripUnknown?: boolean;
  abortEarly?: boolean;
  allowUnknown?: boolean;
}

// Validation error details
interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Format Zod errors into a more user-friendly format
const formatZodErrors = (error: ZodError): ValidationErrorDetail[] => {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    value: 'received' in err ? err.received : undefined,
  }));
};

// Create validation middleware for a specific target and schema
export const validate = (
  target: ValidationTarget,
  schema: ZodSchema,
  options: ValidationOptions = {}
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      
      // Parse and validate the data
      const validatedData = await schema.parseAsync(data);
      
      // Replace the original data with validated data
      req[target] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = formatZodErrors(error);
        throw APIError.validation('Validation failed', validationErrors);
      }
      
      // Re-throw non-validation errors
      throw error;
    }
  };
};

// Convenience functions for common validation targets
export const validateBody = (schema: ZodSchema, options?: ValidationOptions) => 
  validate('body', schema, options);

export const validateQuery = (schema: ZodSchema, options?: ValidationOptions) => 
  validate('query', schema, options);

export const validateParams = (schema: ZodSchema, options?: ValidationOptions) => 
  validate('params', schema, options);

export const validateHeaders = (schema: ZodSchema, options?: ValidationOptions) => 
  validate('headers', schema, options);

// Multi-target validation middleware
export const validateMultiple = (validations: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}, options?: ValidationOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: ValidationErrorDetail[] = [];
      
      // Validate each target if schema is provided
      for (const [target, schema] of Object.entries(validations)) {
        if (schema) {
          try {
            const data = req[target as ValidationTarget];
            const validatedData = await schema.parseAsync(data);
            req[target as ValidationTarget] = validatedData;
          } catch (error) {
            if (error instanceof ZodError) {
              const targetErrors = formatZodErrors(error).map(err => ({
                ...err,
                field: `${target}.${err.field}`,
              }));
              errors.push(...targetErrors);
            } else {
              throw error;
            }
          }
        }
      }
      
      // If there are validation errors, throw them
      if (errors.length > 0) {
        throw APIError.validation('Validation failed', errors);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// File upload validation middleware
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedMimeTypes?: string[];
  required?: boolean;
} = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = ['image/*', 'audio/*', 'video/*'],
    required = false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files;
      const file = req.file;
      
      // Check if file is required
      if (required && !file && (!files || Object.keys(files).length === 0)) {
        throw APIError.validation('File upload is required');
      }
      
      // Validate single file
      if (file) {
        validateSingleFile(file, maxSize, allowedMimeTypes);
      }
      
      // Validate multiple files
      if (files) {
        if (Array.isArray(files)) {
          files.forEach(f => validateSingleFile(f, maxSize, allowedMimeTypes));
        } else {
          Object.values(files).forEach(fileArray => {
            if (Array.isArray(fileArray)) {
              fileArray.forEach(f => validateSingleFile(f, maxSize, allowedMimeTypes));
            } else {
              validateSingleFile(fileArray, maxSize, allowedMimeTypes);
            }
          });
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper function to validate a single file
const validateSingleFile = (file: any, maxSize: number, allowedMimeTypes: string[]) => {
  // Check file size
  if (file.size > maxSize) {
    throw APIError.validation(`File size exceeds maximum allowed size of ${maxSize} bytes`);
  }
  
  // Check MIME type
  const isAllowed = allowedMimeTypes.some(allowedType => {
    if (allowedType.endsWith('/*')) {
      const baseType = allowedType.slice(0, -2);
      return file.mimetype.startsWith(baseType);
    }
    return file.mimetype === allowedType;
  });
  
  if (!isAllowed) {
    throw APIError.validation(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }
};

// Conditional validation middleware
export const validateIf = (
  condition: (req: Request) => boolean,
  validationMiddleware: (req: Request, res: Response, next: NextFunction) => void
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      validationMiddleware(req, res, next);
    } else {
      next();
    }
  };
};

// Custom validation middleware for business rules
export const validateBusinessRule = (
  validator: (req: Request) => Promise<boolean> | boolean,
  errorMessage: string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isValid = await validator(req);
      if (!isValid) {
        throw APIError.validation(errorMessage);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Rate limiting validation (check if user can perform action)
export const validateRateLimit = (
  key: (req: Request) => string,
  limit: number,
  windowMs: number,
  store: Map<string, { count: number; resetTime: number }> = new Map()
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const rateLimitKey = key(req);
      const now = Date.now();
      const entry = store.get(rateLimitKey);
      
      if (!entry || now > entry.resetTime) {
        // Reset or create new entry
        store.set(rateLimitKey, { count: 1, resetTime: now + windowMs });
        next();
      } else if (entry.count < limit) {
        // Increment count
        entry.count++;
        next();
      } else {
        // Rate limit exceeded
        throw APIError.rateLimit('Rate limit exceeded');
      }
    } catch (error) {
      next(error);
    }
  };
}; 