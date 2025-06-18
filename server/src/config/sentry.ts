import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  SENTRY_DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    
    integrations: [
      // Add profiling integration
      nodeProfilingIntegration(),
      
      // HTTP integration for API monitoring
      Sentry.httpIntegration({
        tracing: {
          ignoreIncomingRequests: (url) => {
            // Don't trace health checks and static assets
            return url.includes('/health') || 
                   url.includes('/favicon') ||
                   url.includes('/_sentry');
          },
        },
      }),

      // Express integration
      Sentry.expressIntegration({
        shouldCreateSpanForRequest: (url) => {
          // Only create spans for API routes
          return url.startsWith('/api/');
        },
      }),
    ],

    // Release tracking
    release: process.env.SENTRY_RELEASE || 'unknown',

    // User context tracking
    beforeSend: (event, hint) => {
      // Filter out sensitive data
      if (event.request?.data) {
        // Remove password fields
        if (typeof event.request.data === 'object') {
          const data = { ...event.request.data };
          ['password', 'token', 'apiKey', 'secret'].forEach(field => {
            if (data[field]) data[field] = '[Filtered]';
          });
          event.request.data = data;
        }
      }

      // Add additional context
      event.tags = {
        ...event.tags,
        component: 'server',
        version: process.env.npm_package_version || 'unknown',
      };

      return event;
    },

    // Error filtering
    ignoreErrors: [
      // Ignore common non-critical errors
      'ECONNRESET',
      'EPIPE',
      'ECONNABORTED',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  });

  console.log('✅ Sentry initialized for server');
}

// Express error handler
export const sentryErrorHandler = Sentry.expressErrorHandler({
  shouldHandleError(error) {
    // Send all errors to Sentry
    return true;
  },
});

// Request handler for tracing
export const sentryRequestHandler = Sentry.expressTracingMiddleware;

export { Sentry }; 