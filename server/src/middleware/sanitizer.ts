import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';
import { APIError } from './error.js';

// HTML sanitization options
const sanitizeOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'ul',
    'ol',
    'li',
    'blockquote',
  ],
  allowedAttributes: {
    '*': ['class'],
  },
  allowedStyles: {
    '*': {
      color: [/^#[0-9a-fA-F]{6}$/],
      'text-align': [/^left$/, /^center$/, /^right$/],
    },
  },
};

// Sanitize HTML content
const sanitizeHtmlContent = (content: string): string => {
  return sanitizeHtml(content, sanitizeOptions);
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
    throw new APIError(400, 'Invalid request body');
  }
};

// Sanitize query parameters
export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.query) {
      // Sanitize string fields
      Object.keys(req.query).forEach((key) => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeHtmlContent(req.query[key] as string);
        }
      });
    }
    next();
  } catch (error) {
    throw new APIError(400, 'Invalid query parameters');
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
    throw new APIError(400, 'Invalid URL parameters');
  }
};
