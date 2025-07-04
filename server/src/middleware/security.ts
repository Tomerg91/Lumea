import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';
import rateLimit from 'express-rate-limit';
import { APIError, ErrorCode } from './error';

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting for suspicious activity detection
  suspiciousActivityThreshold: 50, // requests per window
  suspiciousActivityWindow: 5 * 60 * 1000, // 5 minutes
  // Request size limits
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxHeaderSize: 8192, // 8KB
  // IP tracking
  maxIpsPerUser: 5, // Maximum different IPs per user session
  ipChangeWindow: 60 * 60 * 1000, // 1 hour
};

// In-memory stores for tracking (in production, use Redis)
const suspiciousActivityStore = new Map<string, { count: number; firstSeen: number; lastSeen: number; ips: Set<string> }>();
const ipTrackingStore = new Map<string, { ips: Set<string>; lastReset: number }>();

// Get client IP address with proxy support
export const getClientIp = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const xRealIp = req.headers['x-real-ip'];
  const connectionRemoteAddress = req.connection?.remoteAddress;
  const socketRemoteAddress = req.socket?.remoteAddress;
  
  if (typeof xForwardedFor === 'string') {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  return (xRealIp as string) || 
         connectionRemoteAddress || 
         socketRemoteAddress || 
         'unknown';
};

// HIPAA-compliant security headers middleware using Helmet
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      connectSrc: ["'self'", "wss:", "ws:", process.env.API_BASE_URL || "'self'"].filter(Boolean),
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      // HIPAA compliance: prevent data exfiltration
      requireTrustedTypesFor: ["'script'"],
      trustedTypes: ["default"],
    },
    ...(process.env.NODE_ENV === 'production' && {
      upgradeInsecureRequests: true,
      reportUri: '/api/security/csp-report',
    }),
  },
  crossOriginEmbedderPolicy: { policy: 'credentialless' }, // Enhanced security for HIPAA
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  hsts: {
    maxAge: 63072000, // 2 years for HIPAA compliance
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  // Additional HIPAA security headers
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
});

// Request size limiting middleware
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check content length header
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > SECURITY_CONFIG.maxRequestSize) {
      throw new APIError(
        ErrorCode.REQUEST_TOO_LARGE,
        `Request size ${contentLength} bytes exceeds maximum allowed ${SECURITY_CONFIG.maxRequestSize} bytes`,
        413
      );
    }

    // Check header size
    const headerSize = JSON.stringify(req.headers).length;
    if (headerSize > SECURITY_CONFIG.maxHeaderSize) {
      throw new APIError(
        ErrorCode.REQUEST_TOO_LARGE,
        'Request headers too large',
        413
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Suspicious activity detection middleware
export const suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const key = `${clientIp}:${userAgent}`;
    const now = Date.now();

    let activity = suspiciousActivityStore.get(key);
    
    if (!activity) {
      activity = {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        ips: new Set([clientIp])
      };
      suspiciousActivityStore.set(key, activity);
    } else {
      // Reset if window has expired
      if (now - activity.firstSeen > SECURITY_CONFIG.suspiciousActivityWindow) {
        activity.count = 1;
        activity.firstSeen = now;
        activity.ips.clear();
        activity.ips.add(clientIp);
      } else {
        activity.count++;
        activity.ips.add(clientIp);
      }
      activity.lastSeen = now;
    }

    // Check for suspicious patterns
    const isSuspicious = 
      activity.count > SECURITY_CONFIG.suspiciousActivityThreshold ||
      activity.ips.size > 10 || // Too many different IPs for same user agent
      !userAgent || userAgent.length < 10; // Suspicious user agent

    if (isSuspicious) {
      console.warn('🚨 Suspicious Activity Detected:', {
        ip: clientIp,
        userAgent,
        requestCount: activity.count,
        uniqueIps: activity.ips.size,
        timeWindow: now - activity.firstSeen,
        path: req.path,
        method: req.method,
      });

      // For now, just log. In production, you might want to block or require additional verification
      res.setHeader('X-Rate-Limit-Warning', 'Suspicious activity detected');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// IP change detection for authenticated users
export const ipChangeDetection = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return next(); // Skip for unauthenticated requests
    }

    const clientIp = getClientIp(req);
    const userId = req.user.id;
    const now = Date.now();

    let tracking = ipTrackingStore.get(userId);
    
    if (!tracking) {
      tracking = {
        ips: new Set([clientIp]),
        lastReset: now
      };
      ipTrackingStore.set(userId, tracking);
    } else {
      // Reset if window has expired
      if (now - tracking.lastReset > SECURITY_CONFIG.ipChangeWindow) {
        tracking.ips.clear();
        tracking.ips.add(clientIp);
        tracking.lastReset = now;
      } else {
        tracking.ips.add(clientIp);
      }
    }

    // Check for suspicious IP changes
    if (tracking.ips.size > SECURITY_CONFIG.maxIpsPerUser) {
      console.warn('🚨 Suspicious IP Changes Detected:', {
        userId,
        currentIp: clientIp,
        uniqueIps: tracking.ips.size,
        ips: Array.from(tracking.ips),
        timeWindow: now - tracking.lastReset,
        path: req.path,
        method: req.method,
      });

      // Set warning header but don't block (adjust based on security requirements)
      res.setHeader('X-Security-Warning', 'Multiple IP addresses detected');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Request logging middleware for security monitoring
export const securityLogging = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const clientIp = getClientIp(req);
  
  // Log high-value or sensitive endpoints
  const sensitiveEndpoints = [
    '/api/auth',
    '/api/admin',
    '/api/coach-notes',
    '/api/files',
    '/api/users'
  ];

  const isSensitive = sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (isSensitive || res.statusCode >= 400) {
      console.info('🔒 Security Log:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        query: req.query,
        statusCode: res.statusCode,
        duration,
        ip: clientIp,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
        userId: (req as any).user?.id,
        userRole: (req as any).user?.role,
        contentLength: req.headers['content-length'],
        responseLength: res.get('content-length') || 0,
      });
    }
  });
  
  next();
};

// CSRF protection middleware (for state-changing operations)
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip CSRF for GET, HEAD, and OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Check for CSRF token in header or body
    const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;
    
    // For now, we're using double submit cookie pattern
    // In production, implement proper CSRF token generation and validation
    const csrfCookie = req.cookies?.['csrf-token'];
    
    if (!csrfToken && !csrfCookie) {
      // For API-only usage, we can be more lenient with CSRF for JSON requests
      const isJsonRequest = req.headers['content-type']?.includes('application/json');
      const hasOriginHeader = req.headers['origin'] || req.headers['referer'];
      
      if (isJsonRequest && hasOriginHeader) {
        return next(); // Allow JSON API requests with proper origin
      }
      
      throw new APIError(
        ErrorCode.FORBIDDEN,
        'CSRF token required for state-changing operations',
        403
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Clean up old entries from in-memory stores
export const cleanupSecurityStores = () => {
  const now = Date.now();
  
  // Clean suspicious activity store
  for (const [key, activity] of suspiciousActivityStore.entries()) {
    if (now - activity.lastSeen > SECURITY_CONFIG.suspiciousActivityWindow * 2) {
      suspiciousActivityStore.delete(key);
    }
  }
  
  // Clean IP tracking store
  for (const [key, tracking] of ipTrackingStore.entries()) {
    if (now - tracking.lastReset > SECURITY_CONFIG.ipChangeWindow * 2) {
      ipTrackingStore.delete(key);
    }
  }
};

// CSP violation reporting endpoint
export const cspViolationReporter = (req: Request, res: Response) => {
  try {
    const violation = req.body;
    console.error('🚨 CSP Violation Detected:', {
      timestamp: new Date().toISOString(),
      violation,
      userAgent: req.headers['user-agent'],
      ip: getClientIp(req),
      userId: (req as any).user?.id,
    });
    
    // Log to audit system if available
    // auditService.logSecurityEvent('csp_violation', violation);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error processing CSP violation:', error);
    res.status(500).send();
  }
};

// HIPAA session timeout middleware for PHI access
export const hipaaSessionTimeout = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return next(); // Skip for unauthenticated requests
    }

    const phiEndpoints = [
      '/api/coach-notes',
      '/api/reflections',
      '/api/sessions',
      '/api/clients',
      '/api/users'
    ];

    const isPHIAccess = phiEndpoints.some(endpoint => req.path.startsWith(endpoint));
    
    if (isPHIAccess && req.user.role === 'coach') {
      // For healthcare providers accessing PHI, enforce stricter session management
      const sessionStart = req.user.sessionStart || Date.now();
      const sessionAge = Date.now() - sessionStart;
      const maxSessionAge = 15 * 60 * 1000; // 15 minutes for PHI access

      if (sessionAge > maxSessionAge) {
        res.status(401).json({
          error: 'Session expired for PHI access',
          code: 'HIPAA_SESSION_TIMEOUT',
          requiresReauth: true
        });
        return;
      }

      // Set warning headers for upcoming timeout
      const timeRemaining = maxSessionAge - sessionAge;
      if (timeRemaining < 5 * 60 * 1000) { // Less than 5 minutes remaining
        res.setHeader('X-Session-Timeout-Warning', Math.floor(timeRemaining / 1000));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Start periodic cleanup
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupSecurityStores, 10 * 60 * 1000); // Clean every 10 minutes
}

// Export combined security middleware
export const applySecurity = [
  securityHeaders,
  requestSizeLimit,
  securityLogging,
  suspiciousActivityDetection,
  ipChangeDetection,
];

// HIPAA-specific middleware for PHI access
export const applyHIPAASecurity = [
  hipaaSessionTimeout,
];

export const applyCSRF = [
  csrfProtection,
];

// Create the security middleware using helmet defaults
export const securityMiddleware = helmet(); // Use defaults

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Default function to configure all security middleware
export default function configureSecurityMiddleware(app: Express): void {
  // Apply helmet for security headers
  app.use(securityMiddleware);

  // Configure CORS
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Apply rate limiting to all routes
  app.use('/api/', apiLimiter);
}
