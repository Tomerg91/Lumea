// Production Environment Configuration
// Optimized for production deployment with strict security and performance

module.exports = {
  // Environment settings
  NODE_ENV: 'production',
  ENVIRONMENT: 'production',
  
  // Database settings (production database with optimizations)
  database: {
    maxConnections: 50, // Higher connection pool for production
    connectionTimeout: 3000,
    queryTimeout: 5000,
    ssl: true,
    logging: false // Disable query logging in production
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    cors: {
      origin: [
        'https://satyacoaching.com',
        'https://app.satyacoaching.com',
        'https://coaching.satyacoaching.com'
      ],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // Strict rate limiting for production
    }
  },
  
  // Logging configuration (production optimized)
  logging: {
    level: 'warn', // Only warnings and errors in production
    enableFileLogging: true,
    enableConsoleLogging: false, // Disable console logging in production
    format: 'json',
    maxFiles: 10,
    maxSize: '20MB'
  },
  
  // Monitoring (production settings)
  monitoring: {
    enablePerformanceMonitoring: true,
    enableErrorTracking: true,
    sampleRate: 0.1, // Sample 10% of events to reduce overhead
    environment: 'production',
    enableProfiler: true
  },
  
  // Feature flags for production
  features: {
    enableAuditLogs: true,
    enableBackgroundJobs: true,
    enableWebhooks: true,
    enableDebugEndpoints: false, // No debug endpoints in production
    mockExternalServices: false
  },
  
  // Security settings (strict production security)
  security: {
    enableCSRF: true,
    enableHelmet: true,
    cookieSecure: true,
    sessionTimeout: 2 * 60 * 60 * 1000, // 2 hours session timeout
    enableBruteForceProtection: true,
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000 // 30 minutes lockout
  },
  
  // File storage (production bucket)
  storage: {
    provider: 'supabase',
    bucket: 'coaching-production-files',
    maxFileSize: '100MB',
    allowedFileTypes: ['image/*', 'audio/*', 'video/*', 'application/pdf'],
    enableVirusScan: true
  },

  // Email settings (production)
  email: {
    provider: 'sendgrid',
    from: 'noreply@satyacoaching.com',
    enableEmailTracking: true,
    testMode: false,
    enableUnsubscribe: true
  },

  // CDN and caching
  cdn: {
    enabled: true,
    provider: 'cloudflare', // or 'aws-cloudfront'
    cacheTTL: 31536000, // 1 year for static assets
    enableCompression: true
  },

  // Backup settings (production - critical)
  backup: {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    retention: 30, // Keep 30 days in production
    encrypt: true,
    enablePointInTimeRecovery: true,
    replicationEnabled: true
  },

  // Performance optimizations
  performance: {
    enableCaching: true,
    cacheProvider: 'redis',
    cacheTTL: 300, // 5 minutes default
    enableCompression: true,
    compressionLevel: 6
  },

  // Health checks
  health: {
    enableHealthEndpoint: true,
    enableReadinessCheck: true,
    checkInterval: 30000, // 30 seconds
    enableDependencyChecks: true
  },

  // Compliance and privacy
  compliance: {
    enableGDPRMode: true,
    enableCCPAMode: true,
    dataRetentionDays: 2555, // 7 years
    enableDataExport: true,
    enableDataDeletion: true
  }
}; 