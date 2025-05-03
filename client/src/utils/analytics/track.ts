/**
 * Analytics utility for tracking events and page views.
 * This wrapper supports Plausible Analytics but can be extended to other providers.
 * 
 * Respects user privacy by:
 * - Not tracking any PII (Personally Identifiable Information)
 * - Only sending anonymized events for product usage insights
 * - Following a data minimization approach
 */

// Event types that can be tracked across the application
export type TrackEventName = 
  // Page views
  | 'page_view'
  // User actions
  | 'session_created'
  | 'reflection_started' 
  | 'reflection_completed'
  | 'audio_recording_started'
  | 'audio_recording_completed'
  | 'client_invited'
  | 'client_invitation_accepted'
  | 'signup_completed'
  | 'login_success'
  | 'login_failed'
  | 'user_profile_updated'
  | 'coach_application_submitted'
  | 'coach_approved'
  // Mobile specific events
  | 'app_install'
  | 'app_open'
  | 'app_update'
  | 'push_notification_enabled'
  | 'push_notification_received'
  | 'push_notification_opened'
  // System events
  | 'offline_mode_entered'
  | 'offline_sync_completed'
  | 'error_occurred';

// Properties that can be included with events
// Note: We intentionally avoid tracking PII
export type EventProperties = {
  path?: string;
  referrer?: string;
  search?: string;
  title?: string;
  url?: string;
  // Non-PII metadata
  role?: 'client' | 'coach' | 'admin';
  hasPreviousSessions?: boolean;
  platform?: 'web' | 'ios' | 'android';
  isOffline?: boolean;
  duration?: number; // in seconds
  fileType?: string; // e.g., "audio/mp3", "audio/wav"
  status?: string;
  count?: number;
  // Mobile-specific properties
  appVersion?: string;
  osVersion?: string;
  deviceType?: string;
  connectionType?: 'wifi' | 'cellular' | 'unknown';
  // Error tracking
  errorCode?: string;
  errorType?: string;
  errorMessage?: string;
  // Feature usage
  featureName?: string;
  featureVersion?: string;
  // Performance metrics
  loadTime?: number;
  apiResponseTime?: number;
};

/**
 * Interface defining the contract for analytics providers
 */
export interface AnalyticsProvider {
  init(options?: Record<string, unknown>): void;
  trackEvent(eventName: TrackEventName, properties?: EventProperties): void;
  trackPageView(properties?: EventProperties): void;
}

/**
 * Plausible Analytics implementation
 */
class PlausibleAnalytics implements AnalyticsProvider {
  isInitialized = false;
  domain: string;

  constructor() {
    this.domain = window.location.hostname;
  }

  init(options?: Record<string, unknown>): void {
    if (this.isInitialized) return;

    // Don't initialize in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_ENABLE_ANALYTICS) {
      console.log('[Analytics] Disabled in development environment');
      return;
    }

    // Only initialize if we have a Plausible domain set
    const plausibleDomain = process.env.REACT_APP_PLAUSIBLE_DOMAIN || this.domain;
    
    try {
      // Load the Plausible script
      const script = document.createElement('script');
      script.defer = true;
      script.setAttribute('data-domain', plausibleDomain);
      script.src = 'https://plausible.io/js/script.js';
      
      // Add script to head
      document.head.appendChild(script);
      this.isInitialized = true;
      console.log('[Analytics] Plausible initialized with domain:', plausibleDomain);
    } catch (error) {
      console.error('[Analytics] Failed to initialize Plausible:', error);
    }
  }

  trackEvent(eventName: TrackEventName, properties?: EventProperties): void {
    if (!this.isInitialized) return;
    
    try {
      // Access the Plausible event function
      const plausible = (window as any).plausible;
      
      if (typeof plausible === 'function') {
        plausible(eventName, { props: properties });
        
        // Only log events in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[Analytics] Event tracked:', eventName, properties);
        }
      }
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }

  trackPageView(properties?: EventProperties): void {
    if (!this.isInitialized) return;
    
    try {
      // For Plausible, page views are tracked automatically
      // This is just for custom properties
      if (properties && Object.keys(properties).length > 0) {
        this.trackEvent('page_view', properties);
      }
    } catch (error) {
      console.error('[Analytics] Failed to track page view:', error);
    }
  }
}

/**
 * Mixpanel Analytics implementation (alternative)
 * Commented out but ready to be implemented if needed
 */
/*
class MixpanelAnalytics implements AnalyticsProvider {
  isInitialized = false;

  init(options?: Record<string, unknown>): void {
    if (this.isInitialized) return;

    // Add Mixpanel implementation here
    // Similar pattern to Plausible implementation
  }

  trackEvent(eventName: TrackEventName, properties?: EventProperties): void {
    if (!this.isInitialized) return;
    
    // Add Mixpanel implementation here
  }

  trackPageView(properties?: EventProperties): void {
    if (!this.isInitialized) return;
    
    // Add Mixpanel implementation here
  }
}
*/

// Export singleton instance of the analytics provider
// We can switch providers here if needed
export const analytics: AnalyticsProvider = new PlausibleAnalytics();

// Initialize analytics during module import
analytics.init();

/**
 * Convenience wrapper for tracking events
 * 
 * @param eventName - The name of the event to track
 * @param properties - Optional properties to include with the event
 */
export function trackEvent(eventName: TrackEventName, properties?: EventProperties): void {
  // Check if we're in a Capacitor mobile app
  const isMobileApp = typeof (window as any).Capacitor !== 'undefined';
  
  // Add platform info automatically
  const platformProperties: EventProperties = {
    ...properties,
    platform: isMobileApp 
      ? (window as any).Capacitor?.getPlatform() === 'ios' ? 'ios' : 'android'
      : 'web'
  };
  
  // Add app version for mobile
  if (isMobileApp && (window as any).Capacitor?.getAppInfo) {
    try {
      const appInfo = (window as any).Capacitor.getAppInfo();
      platformProperties.appVersion = appInfo.version;
      platformProperties.deviceType = (window as any).Capacitor.getDeviceInfo?.()?.model || 'unknown';
    } catch (e) {
      // Silent fail if we can't get app info
    }
  }
  
  analytics.trackEvent(eventName, platformProperties);
}

/**
 * Convenience wrapper for tracking page views
 * 
 * @param properties - Optional properties to include with the page view
 */
export function trackPageView(properties?: EventProperties): void {
  analytics.trackPageView(properties);
}

/**
 * Track errors in the application
 * 
 * @param errorType - The type of error
 * @param errorMessage - The error message
 * @param errorCode - Optional error code
 */
export function trackError(errorType: string, errorMessage: string, errorCode?: string): void {
  trackEvent('error_occurred', {
    errorType,
    errorMessage,
    errorCode
  });
}

export default {
  trackEvent,
  trackPageView,
  trackError,
  analytics
}; 