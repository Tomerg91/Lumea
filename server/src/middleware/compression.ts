import compression from 'compression';
import { Request, Response } from 'express';

// Compression options
const compressionOptions = {
  level: 6, // Default compression level
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
};

// Create the compression middleware
export const compressionMiddleware = compression(compressionOptions);
