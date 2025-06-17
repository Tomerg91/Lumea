import { supabase } from './supabase';

// Define AuthenticatedUser interface directly here
// Ideally, share this type with the backend (e.g., via a shared package)
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

// Ensure VITE_API_URL is defined in your .env files (e.g., .env.development, .env.production)
// Vercel will use environment variables set in the project settings.
const vercelDeploymentUrl = import.meta.env.VITE_VERCEL_URL && `https://${import.meta.env.VITE_VERCEL_URL}`;
const customApiUrl = import.meta.env.VITE_API_URL;

let determinedApiBaseUrl: string;

if (customApiUrl) {
  // If a specific VITE_API_URL is provided (e.g. for local dev against a separate staging API, or if Vercel URL is not the API host)
  determinedApiBaseUrl = customApiUrl.endsWith('/api') ? customApiUrl : `${customApiUrl}/api`;
} else if (vercelDeploymentUrl) {
  // If deployed on Vercel and VITE_VERCEL_URL is available (Vercel injects this)
  // We assume the API is served from the same domain, under /api path
  determinedApiBaseUrl = `${vercelDeploymentUrl}/api`;
} else {
  // Fallback for other local development scenarios or if VITE_API_URL is not set
  determinedApiBaseUrl = 'http://localhost:3000/api';
}

if (import.meta.env.DEV) {
  console.log('Using API_BASE_URL:', determinedApiBaseUrl);
}

if (!determinedApiBaseUrl && import.meta.env.PROD) {
  console.error("FATAL ERROR: API_BASE_URL could not be determined for production. Ensure VITE_API_URL or Vercel system env vars are available.");
  // Consider throwing an error or showing a user-friendly message on the client
}

export const API_BASE_URL = determinedApiBaseUrl;

// Interface for the user object returned by login/me
// Based on server/config/passport.ts AuthenticatedUser
// We might need a more complete User type later based on Prisma schema for other endpoints
export type User = AuthenticatedUser;

// Define type for sessions
interface Session {
  id: string;
  date: string;
  status: string;
  clientId: string;
  coachId: string;
  [key: string]: unknown;
}

// Define type for resources
interface Resource {
  id: string;
  title: string;
  description: string;
  fileId?: string;
  coachId: string;
  [key: string]: unknown;
}

/**
 * Performs a fetch request to the API with Supabase authentication.
 * Automatically includes Authorization header with Supabase JWT token.
 * 
 * NOTE: This should only be used for operations that require backend processing
 * beyond what Supabase can handle directly (e.g., complex business logic,
 * third-party integrations, email sending, etc.)
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Get the current session to extract the access token
  const { data: { session } } = await supabase.auth.getSession();
  
  // Add Authorization header if user is authenticated
  if (session?.access_token) {
    defaultHeaders['Authorization'] = `Bearer ${session.access_token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // Remove session cookies since we're using JWT tokens now
    // credentials: 'include', 
  };

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses for logout etc.
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.indexOf('application/json') !== -1) {
      data = await response.json();
    } else {
      // Handle text or no content responses
      const text = await response.text();
      // For successful logout, we might just get a message
      if (response.ok) {
        // Try to parse if it looks like JSON, otherwise return message or null
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text || 'Success' };
        }
      } else {
        // If error and not JSON, construct an error object
        data = { message: text || `HTTP error ${response.status}` };
      }
    }

    if (!response.ok) {
      // Throw an error that includes the message from the API response if possible
      throw new Error(data?.message || `HTTP error ${response.status}`);
    }

    return data as T;
  } catch (error) {
    console.error(`API fetch error for endpoint ${endpoint}:`, error);
    // Re-throw the error so calling components can handle it
    throw error;
  }
}

// --- Backend-Only API Calls ---
// These endpoints require backend processing beyond what Supabase can handle
// Examples: email sending, complex business logic, third-party integrations

/**
 * Send password reset email
 * This requires backend processing for email delivery
 */
export const requestPasswordReset = (email: string) => {
  return apiFetch('/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

/**
 * Reset password with token
 * This requires backend processing for token validation
 */
export const resetPassword = (token: string, newPassword: string) => {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword })
  });
};

/**
 * Send invitation email to new coach/client
 * This requires backend processing for email delivery
 */
export const sendInvitation = (email: string, role: 'coach' | 'client', inviterName: string) => {
  return apiFetch('/auth/send-invitation', {
    method: 'POST',
    body: JSON.stringify({ email, role, inviterName })
  });
};

/**
 * Process payment for coaching sessions
 * This requires backend processing for payment gateway integration
 */
export const processPayment = (paymentData: {
  sessionId: string;
  amount: number;
  paymentMethodId: string;
}) => {
  return apiFetch('/payments/process', {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
};

/**
 * Send notification (email/SMS) to users
 * This requires backend processing for notification delivery
 */
export const sendNotification = (notificationData: {
  userId: string;
  type: 'email' | 'sms' | 'push';
  subject?: string;
  message: string;
  templateId?: string;
}) => {
  return apiFetch('/notifications/send', {
    method: 'POST',
    body: JSON.stringify(notificationData)
  });
};

/**
 * Generate and send reports (PDF, etc.)
 * This requires backend processing for document generation
 */
export const generateReport = (reportData: {
  type: 'session_summary' | 'progress_report' | 'analytics';
  userId: string;
  dateRange?: { startDate: string; endDate: string };
  format?: 'pdf' | 'excel';
}) => {
  return apiFetch('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(reportData)
  });
};

/**
 * Integrate with external calendar systems
 * This requires backend processing for OAuth and API integration
 */
export const syncCalendar = (calendarData: {
  provider: 'google' | 'outlook' | 'apple';
  authCode?: string;
  action: 'connect' | 'sync' | 'disconnect';
}) => {
  return apiFetch('/calendar/sync', {
    method: 'POST',
    body: JSON.stringify(calendarData)
  });
};

// --- Deprecated API Calls ---
// These functions are deprecated and should be replaced with Supabase hooks
// They are kept temporarily for backward compatibility during migration

/**
 * @deprecated Use useSessions hook instead
 * This will be removed in a future version
 */
export const getClientSessions = (): Promise<any[]> => {
  console.warn('getClientSessions is deprecated. Use useSessions hook instead.');
  return apiFetch<any[]>('/sessions/client', { method: 'GET' });
};

/**
 * @deprecated Use useResources hook instead  
 * This will be removed in a future version
 */
export const getClientResources = (): Promise<any[]> => {
  console.warn('getClientResources is deprecated. Use useResources hook instead.');
  return apiFetch<any[]>('/resources/client', { method: 'GET' });
};

// Export the apiFetch function for services that need custom backend endpoints
export { apiFetch };
