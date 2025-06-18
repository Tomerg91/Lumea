// Staging Environment Configuration
// Used for staging deployments (pre-production testing)

module.exports = {
  // Environment settings
  NODE_ENV: 'staging',
  ENVIRONMENT: 'staging',
  
  // Database settings (staging database)
  database: {
    maxConnections: 10,
    connectionTimeout: 5000,
    queryTimeout: 10000,
    ssl: true,
    logging: true
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    cors: {
      origin: [
        'http://localhost:5173',
        'https://staging-coaching.vercel.app',
        'https://staging-api.vercel.app'
      ],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200 // More lenient for testing
    }
  },
  
  // Logging configuration
  logging: {
    level: 'debug', // More verbose for staging
    enableFileLogging: true,
    enableConsoleLogging: true,
    format: 'json'
  },
  
  // Monitoring
  monitoring: {
    enablePerformanceMonitoring: true,
    enableErrorTracking: true,
    sampleRate: 1.0, // Track all events in staging
    environment: 'staging'
  },
  
  // Feature flags for staging
  features: {
    enableAuditLogs: true,
    enableBackgroundJobs: true,
    enableWebhooks: true,
    enableDebugEndpoints: true, // Debug endpoints enabled in staging
    mockExternalServices: false
  },
  
  // Security settings (less strict for testing)
  security: {
    enableCSRF: true,
    enableHelmet: true,
    cookieSecure: true,
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  // File storage (staging bucket)
  storage: {
    provider: 'supabase',
    bucket: 'coaching-staging-files',
    maxFileSize: '50MB',
    allowedFileTypes: ['image/*', 'audio/*', 'video/*', 'application/pdf']
  },

  // Email settings (staging - can use real emails for testing)
  email: {
    provider: 'sendgrid', // or 'nodemailer'
    from: 'staging@satyacoaching.com',
    enableEmailTracking: true,
    testMode: false
  },

  // Backup settings
  backup: {
    enabled: true,
    schedule: '0 3 * * *', // Daily at 3 AM
    retention: 7, // Keep 7 days in staging
    encrypt: true
  }
}; 