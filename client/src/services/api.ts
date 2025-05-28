// Common fetch configuration with authentication
export const createFetchConfig = (options: RequestInit = {}): RequestInit => ({
  ...options,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  },
  credentials: 'include', // Essential for session cookies!
}); 