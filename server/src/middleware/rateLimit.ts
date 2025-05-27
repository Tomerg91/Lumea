import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { APIError, ErrorCode } from './error.js';

// Sliding window rate limiter using in-memory store
// In production, use Redis for distributed rate limiting
class SlidingWindowStore {
  private store = new Map<string, number[]>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  incr(key: string, windowMs: number): Promise<{ totalCount: number; resetTime: Date }> {
    return new Promise((resolve) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      let timestamps = this.store.get(key) || [];
      
      // Remove timestamps outside the window
      timestamps = timestamps.filter(timestamp => timestamp > windowStart);
      
      // Add current timestamp
      timestamps.push(now);
      
      // Store updated timestamps
      this.store.set(key, timestamps);
      
      resolve({
        totalCount: timestamps.length,
        resetTime: new Date(now + windowMs)
      });
    });
  }

  decrement(key: string): void {
    const timestamps = this.store.get(key);
    if (timestamps && timestamps.length > 0) {
      timestamps.pop();
      if (timestamps.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, timestamps);
      }
    }
  }

  resetKey(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const [key, timestamps] of this.store.entries()) {
      const filteredTimestamps = timestamps.filter(timestamp => now - timestamp < maxAge);
      if (filteredTimestamps.length === 0) {
        this.store.delete(key);
      } else if (filteredTimestamps.length !== timestamps.length) {
        this.store.set(key, filteredTimestamps);
      }
    }
  }
}

const slidingWindowStore = new SlidingWindowStore();

// Enhanced rate limiter factory
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  skipIf?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
    store: slidingWindowStore as any,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Default key: IP + User ID (if authenticated)
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userId = (req as any).user?.id;
      return userId ? `${ip}:${userId}` : ip;
    }),
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    skip: options.skipIf || (() => false),
    handler: (req: Request, res: Response) => {
      const resetTime = res.getHeader('X-RateLimit-Reset');
      throw APIError.rateLimit(options.message, {
        limit: options.max,
        windowMs: options.windowMs,
        resetTime: resetTime
      });
    },
  });
};

// Authentication rate limiting (stricter)
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  keyGenerator: (req: Request) => {
    // Use IP + email for auth attempts
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body?.email || 'unknown';
    return `auth:${ip}:${email}`;
  },
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Password reset rate limiting (very strict)
export const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many password reset attempts. Please try again after an hour.',
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body?.email || 'unknown';
    return `password-reset:${ip}:${email}`;
  },
});

// File upload rate limiting
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many file uploads. Please try again later.',
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `upload:${ip}:${userId}`;
  },
});

// API rate limiting (general)
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes for authenticated users
  message: 'Too many API requests. Please try again later.',
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.id;
    
    if (userId) {
      return `api:user:${userId}`;
    }
    
    // Anonymous users get stricter limits
    return `api:ip:${ip}`;
  },
});

// Anonymous user rate limiting (stricter for unauthenticated requests)
export const anonymousLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes for anonymous users
  message: 'Too many requests from anonymous user. Please authenticate for higher limits.',
  skipIf: (req: Request) => !!(req as any).user?.id, // Skip if user is authenticated
});

// Admin operations rate limiting
export const adminLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 admin operations per hour
  message: 'Too many admin operations. Please try again later.',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'unknown';
    return `admin:${userId}`;
  },
  skipIf: (req: Request) => (req as any).user?.role !== 'admin',
});

// Coach notes rate limiting (protect sensitive data)
export const coachNotesLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // 500 coach note operations per hour
  message: 'Too many coach note operations. Please try again later.',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'unknown';
    return `coach-notes:${userId}`;
  },
});

// Reflection rate limiting
export const reflectionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 reflection operations per hour
  message: 'Too many reflection operations. Please try again later.',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || 'unknown';
    return `reflection:${userId}`;
  },
});

// Search rate limiting (prevent abuse)
export const searchLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 searches per 5 minutes
  message: 'Too many search requests. Please slow down.',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return userId ? `search:user:${userId}` : `search:ip:${ip}`;
  },
});

// Export enhanced middleware functions
export const createDynamicRateLimit = (
  baseLimit: number,
  windowMs: number,
  userMultiplier: { [role: string]: number } = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;
    const multiplier = userMultiplier[userRole] || 1;
    const adjustedLimit = Math.floor(baseLimit * multiplier);
    
    const dynamicLimiter = createRateLimiter({
      windowMs,
      max: adjustedLimit,
      message: `Too many requests. Rate limit: ${adjustedLimit} requests per ${windowMs / 1000} seconds.`,
    });
    
    dynamicLimiter(req, res, next);
  };
};

// Burst protection - short window with high limit followed by longer window with lower limit
export const burstProtection = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute (burst)
  message: 'Request burst limit exceeded. Please slow down.',
});

// Long-term protection
export const sustainedLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour (sustained)
  message: 'Hourly request limit exceeded. Please try again later.',
});

// Cleanup function for graceful shutdown
export const cleanupRateLimiters = () => {
  if ((slidingWindowStore as any).cleanupInterval) {
    clearInterval((slidingWindowStore as any).cleanupInterval);
  }
};
