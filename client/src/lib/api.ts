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

// --- Auth API Calls ---

export const login = (credentials: { email: string; password: string }): Promise<User> => {
  return apiFetch<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const register = (userData: {
  name?: string;
  email: string;
  password: string;
  role?: string;
}): Promise<{ message: string; user: User }> => {
  return apiFetch<{ message: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const logout = (): Promise<{ message: string }> => {
  return apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
};

export const getCurrentUser = (): Promise<User> => {
  return apiFetch<User>('/auth/me', {
    method: 'GET',
  });
};

// --- Mock Session/Resource API Calls (Example) ---
// We will use these later, pointing to the mock endpoints for now

export const getClientSessions = (): Promise<Session[]> => {
  return apiFetch<Session[]>('/sessions/client', { method: 'GET' });
};

export const getClientResources = (): Promise<Resource[]> => {
  return apiFetch<Resource[]>('/resources/client', { method: 'GET' });
};

// Add other API calls for sessions, resources, profile etc. as needed
