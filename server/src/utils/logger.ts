import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define which transports to use based on environment
const transports = [];

// Always log to console in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// In production, log to console with less verbose format
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
}

// Always log errors to file
transports.push(
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs/error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  })
);

// Log all levels to file in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Morgan stream for HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for common log patterns
export const loggers = {
  // Authentication events
  auth: {
    success: (userId: string, method: string) => 
      logger.info(`Authentication successful`, { userId, method, type: 'auth_success' }),
    failure: (email: string, method: string, reason: string) => 
      logger.warn(`Authentication failed`, { email, method, reason, type: 'auth_failure' }),
    logout: (userId: string) => 
      logger.info(`User logged out`, { userId, type: 'auth_logout' }),
  },

  // Security events
  security: {
    rateLimitHit: (ip: string, endpoint: string) => 
      logger.warn(`Rate limit hit`, { ip, endpoint, type: 'rate_limit' }),
    suspiciousActivity: (userId: string, activity: string, details: any) => 
      logger.warn(`Suspicious activity detected`, { userId, activity, details, type: 'suspicious_activity' }),
    securityHeaders: (missing: string[]) => 
      logger.warn(`Missing security headers`, { missing, type: 'security_headers' }),
  },

  // Database events
  database: {
    connected: (database: string) => 
      logger.info(`Database connected`, { database, type: 'db_connection' }),
    error: (error: Error, query?: string) => 
      logger.error(`Database error`, { error: error.message, query, stack: error.stack, type: 'db_error' }),
    slowQuery: (query: string, duration: number) => 
      logger.warn(`Slow database query`, { query, duration, type: 'slow_query' }),
  },

  // Performance events
  performance: {
    slowRequest: (method: string, url: string, duration: number, userId?: string) => 
      logger.warn(`Slow request`, { method, url, duration, userId, type: 'slow_request' }),
    memoryUsage: (usage: NodeJS.MemoryUsage) => 
      logger.info(`Memory usage`, { usage, type: 'memory_usage' }),
  },

  // Business events
  business: {
    userRegistered: (userId: string, role: string) => 
      logger.info(`New user registered`, { userId, role, type: 'user_registered' }),
    sessionCreated: (sessionId: string, coachId: string, clientId: string) => 
      logger.info(`Session created`, { sessionId, coachId, clientId, type: 'session_created' }),
    paymentProcessed: (userId: string, amount: number, currency: string) => 
      logger.info(`Payment processed`, { userId, amount, currency, type: 'payment_processed' }),
  },

  // Error events
  error: {
    unhandled: (error: Error, context?: any) => 
      logger.error(`Unhandled error`, { error: error.message, stack: error.stack, context, type: 'unhandled_error' }),
    api: (endpoint: string, error: Error, userId?: string) => 
      logger.error(`API error`, { endpoint, error: error.message, stack: error.stack, userId, type: 'api_error' }),
    validation: (field: string, value: any, error: string) => 
      logger.warn(`Validation error`, { field, value, error, type: 'validation_error' }),
  },
};

export default logger; 