import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { APIError } from './error.js';

// Validator middleware options
interface ValidatorOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
}

// Create a validator middleware
export const validatorMiddleware = (schema: Schema, options: ValidatorOptions = {}) => {
  const validatorOptions = {
    abortEarly: options.abortEarly ?? false,
    stripUnknown: options.stripUnknown ?? true,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, validatorOptions);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new APIError(400, 'Validation Error', errors);
    }

    next();
  };
};

// Create a validator middleware for query parameters
export const queryValidator = (schema: Schema, options?: ValidatorOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query, options);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new APIError(400, 'Validation Error', errors);
    }

    next();
  };
};

// Create a validator middleware for URL parameters
export const paramsValidator = (schema: Schema, options?: ValidatorOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params, options);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new APIError(400, 'Validation Error', errors);
    }

    next();
  };
};

// Create a validator middleware for headers
export const headersValidator = (schema: Schema, options?: ValidatorOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.headers, options);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new APIError(400, 'Validation Error', errors);
    }

    next();
  };
};
