import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add cache-control headers to static files
 * Caches files based on their type for different durations
 */
export const staticCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get the URL path to determine file type
  const path = req.path;

  // Set common cache headers
  res.setHeader('Vary', 'Accept-Encoding');

  // Different cache durations based on file type
  if (path.match(/\.(jpg|jpeg|png|gif|webp|ico|svg)$/i)) {
    // Images - cache for 7 days
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  } else if (path.match(/\.(css|js)$/i)) {
    // CSS and JS - cache for 1 day
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else if (path.match(/\.(woff|woff2|ttf|otf|eot)$/i)) {
    // Fonts - cache for 7 days
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  } else if (path.match(/\.(json|xml)$/i)) {
    // Data files - shorter cache
    res.setHeader('Cache-Control', 'public, max-age=3600');
  } else {
    // Default for other static files - cache for 4 hours
    res.setHeader('Cache-Control', 'public, max-age=14400');
  }

  next();
};

export default staticCacheMiddleware;
