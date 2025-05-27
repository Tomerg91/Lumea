import { Request, Response, NextFunction } from 'express';
import { APIError, ErrorCode } from './error.js';

// Simple HTML sanitization - removes potentially dangerous content
export const sanitizeHtmlContent = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Basic HTML sanitization - removes script tags and dangerous attributes
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/data:/gi, '') // Remove data: URLs
    .replace(/vbscript:/gi, '') // Remove vbscript: URLs
    .trim();
};

// Remove potentially dangerous characters from input
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes, control characters, and other potentially dangerous content
  return input
    .replace(/\0/g, '') // Remove null bytes
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove all ASCII control characters
    .trim();
};

// Sanitize request body
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body) {
      // Sanitize string fields
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitizeHtmlContent(req.body[key]);
        }
      });
    }
    next();
  } catch (error) {
    throw new APIError(ErrorCode.VALIDATION_ERROR, 'Invalid request body', 400);
  }
};

// Sanitize query parameters
export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.query) {
      // Sanitize string fields
      Object.keys(req.query).forEach((key) => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeInput(req.query[key] as string);
        }
      });
    }
    next();
  } catch (error) {
    throw new APIError(ErrorCode.VALIDATION_ERROR, 'Invalid query parameters', 400);
  }
};

// Sanitize URL parameters
export const sanitizeParams = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params) {
      // Sanitize string fields
      Object.keys(req.params).forEach((key) => {
        if (typeof req.params[key] === 'string') {
          req.params[key] = sanitizeHtmlContent(req.params[key]);
        }
      });
    }
    next();
  } catch (error) {
    throw new APIError(ErrorCode.VALIDATION_ERROR, 'Invalid URL parameters', 400);
  }
};
