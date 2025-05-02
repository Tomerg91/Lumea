// Define AuthenticatedUser interface directly here
// Ideally, share this type with the backend (e.g., via a shared package)
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

// Define the base URL for the backend API
// Ensure this matches the port your backend server is running on (e.g., 3001)
// Use import.meta.env for Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

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
 * Performs a fetch request to the API.
 * Handles common headers, base URL, and basic error handling.
 * Credentials ('include') are crucial for sending/receiving session cookies.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Essential for session cookies!
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
