import { useEffect } from 'react';
import { 
  useLocation, 
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes 
} from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { 
  captureException as sentryCaptureException,
  captureMessage as sentryCaptureMessage,
  addBreadcrumb as sentryAddBreadcrumb,
  setUser as sentrySetUser,
  setTag as sentrySetTag,
  setContext as sentrySetContext
} from '@sentry/browser';

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('⚠️  VITE_SENTRY_DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // React Router integration
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],

    // Release tracking
    release: import.meta.env.VITE_SENTRY_RELEASE || 'unknown',

    // User context and filtering
    beforeSend: (event, hint) => {
      // Filter out sensitive data from breadcrumbs and extra data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            const data = { ...breadcrumb.data };
            ['password', 'token', 'apiKey', 'secret', 'authorization'].forEach(field => {
              if (data[field]) data[field] = '[Filtered]';
            });
            breadcrumb.data = data;
          }
          return breadcrumb;
        });
      }

      // Add additional context
      event.tags = {
        ...event.tags,
        component: 'client',
        version: import.meta.env.VITE_VERSION || 'unknown',
        userAgent: navigator.userAgent,
      };

      // Add performance context
      if (typeof window !== 'undefined' && window.performance) {
        event.contexts = {
          ...event.contexts,
          performance: {
            memory: (performance as any).memory ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
            } : undefined,
            navigation: performance.getEntriesByType('navigation')[0],
          },
        };
      }

      return event;
    },

    // Error filtering
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      
      // Network errors
      'NetworkError',
      'fetch error',
      'ChunkLoadError',
      'Loading chunk',
      
      // Non-critical errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Script error.',
    ],

    // Don't report errors from certain URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      
      // Third-party scripts
      /google-analytics\.com/i,
      /googletagmanager\.com/i,
    ],
  });

  console.log('✅ Sentry initialized for client');
}

// React Error Boundary
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Performance monitoring helpers
export const captureException = sentryCaptureException;
export const captureMessage = sentryCaptureMessage;
export const addBreadcrumb = sentryAddBreadcrumb;
export const setUser = sentrySetUser;
export const setTag = sentrySetTag;
export const setContext = sentrySetContext;

export { Sentry }; 