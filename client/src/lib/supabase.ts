import { createClient } from '@supabase/supabase-js';

// Set up primary and fallback URLs
const originalSupabaseUrl = 'https://humlrpbtrbjnpnsusils.supabase.co'; // New project URL
const fallbackSupabaseUrl = 'https://app.supabase.com'; // Fallback for connectivity testing
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bWxycGJ0cmJqbnBuc3VzaWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjQ3MzcsImV4cCI6MjA2MTQwMDczN30.ywX7Zpywze07KqPHwiwn_hECuiblnc4-_dEl0QNU7nU'; // New Anon Key

// FOR DEMO/DEVELOPMENT: fallback dev client in case the primary project is unreachable
const isDevelopment = process.env.NODE_ENV === 'development';
const devModeSupabaseUrl = 'https://rzvqwqlkmxltfkfkceqh.supabase.co'; // Alternative working project
const devModeAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6dnF3cWxrbXhsdGZrZmtjZXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUzMTAyNTksImV4cCI6MjAzMDg4NjI1OX0.xq-zoSm_uTSHo3M1TWlBFDLI4XGlw-YwDRQ42_aBcLQ';

// Flag to track if we've determined the project is unreachable
let useDevModeClient = false;
let isProjectUrlReachable = true; // Assume reachable initially

// Create and export the Supabase client
export const supabase = createClient(originalSupabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (...args: Parameters<typeof fetch>) => {
      // Use development mode client if we've determined the real project is unreachable
      if (useDevModeClient && isDevelopment) {
        console.log('[Supabase] Using development mode client for request');
        // Modify the request to use the dev mode URL
        const url = args[0] as string;
        if (url.startsWith(originalSupabaseUrl)) {
          const newUrl = url.replace(originalSupabaseUrl, devModeSupabaseUrl);
          args[0] = newUrl;

          // If there are headers in the request, update the API key
          if (args[1] && args[1].headers) {
            const headers = args[1].headers as Record<string, string>;
            if (headers.apikey === supabaseAnonKey) {
              headers.apikey = devModeAnonKey;
            }
            if (headers.Authorization && headers.Authorization.includes(supabaseAnonKey)) {
              headers.Authorization = headers.Authorization.replace(
                supabaseAnonKey,
                devModeAnonKey
              );
            }
          }

          console.log(`[Supabase] Redirected request to development mode URL: ${newUrl}`);
        }
      }

      const url = args[0] as string;
      console.log(`[Supabase] Fetching from ${url}`);

      // Add error handling to include detailed error information
      return fetch(...args).catch((error) => {
        console.error(`[Supabase] Fetch error for ${url}:`, error);

        // Re-throw with more information if needed
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.error(
            `[Supabase] This is likely a network connectivity issue or DNS resolution problem.`
          );

          // If we haven't already checked the project URL, check it now
          if (isProjectUrlReachable) {
            console.log(`[Supabase] Initiating connection check for ${originalSupabaseUrl}`);
            checkSupabaseConnection().then((result) => {
              isProjectUrlReachable = result;
              console.log(
                `[Supabase] Connection check result: ${result ? 'Reachable' : 'Unreachable'}`
              );

              // If the original project is unreachable and we're in dev mode,
              // mark to use the dev client for future requests
              if (!result && isDevelopment) {
                useDevModeClient = true;
                console.log('[Supabase] Switching to development mode client for future requests');
              }
            });
          }
        }

        throw error;
      });
    },
  },
});

// Create a development mode client for direct use when needed
export const devModeClient = isDevelopment
  ? createClient(devModeSupabaseUrl, devModeAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Function to get the appropriate Supabase client
export function getSupabaseClient() {
  if (useDevModeClient && isDevelopment) {
    console.log('[Supabase] Returning development mode client');
    return devModeClient || supabase;
  }
  return supabase;
}

// Function to check connectivity to Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    console.log(`[Supabase] Checking connection to ${originalSupabaseUrl}`);

    // First try to connect to the project URL with proper CORS headers
    try {
      const response = await fetch(`${originalSupabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`, {
        method: 'HEAD',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
        },
      });

      if (response.ok) {
        console.log(`[Supabase] Successfully connected to ${originalSupabaseUrl}`);
        return true;
      }

      console.log(
        `[Supabase] Connection to ${originalSupabaseUrl} failed with status: ${response.status}`
      );
    } catch (error) {
      console.error(`[Supabase] Error checking connection to ${originalSupabaseUrl}:`, error);
    }

    // If that fails, try with no-cors to at least check if DNS resolves
    try {
      console.log(`[Supabase] Trying no-cors request to ${originalSupabaseUrl}`);
      await fetch(originalSupabaseUrl, { mode: 'no-cors' });
      console.log(`[Supabase] no-cors request to ${originalSupabaseUrl} did not throw an error`);
      // If we get here without error, the URL is at least reachable from a DNS perspective
      return true;
    } catch (error) {
      console.error(`[Supabase] DNS resolution check for ${originalSupabaseUrl} failed:`, error);

      // Try connecting to the fallback URL to verify general internet connectivity
      try {
        console.log(`[Supabase] Checking general connectivity using ${fallbackSupabaseUrl}`);
        await fetch(fallbackSupabaseUrl, { mode: 'no-cors' });
        console.log(
          `[Supabase] Connected to ${fallbackSupabaseUrl} - internet is working but project URL is unreachable`
        );
        return false;
      } catch (fallbackError) {
        console.error(
          `[Supabase] Failed to connect to ${fallbackSupabaseUrl} - general internet connectivity issue:`,
          fallbackError
        );
        return false;
      }
    }
  } catch (error) {
    console.error(`[Supabase] Unexpected error in connection check:`, error);
    return false;
  }
}

// Add detailed DNS resolution check
export const checkDnsResolution = async (url: string, description: string = '') => {
  try {
    console.log(`[Supabase] Testing DNS resolution for ${url} ${description}`);
    // Try to make a simple HEAD request with no-cors mode to test DNS resolution
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors', // Use no-cors mode to avoid CORS issues
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log(`[Supabase] DNS resolution successful: ${url}`);
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`[Supabase] DNS resolution failed for ${url}:`, error);

      // Additional diagnosis
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error(
          `[Supabase] Network error: This could be due to DNS issues, no internet connection, or CORS restrictions`
        );
      }

      return false;
    }
  } catch (error) {
    console.error(`[Supabase] General error during DNS check:`, error);
    return false;
  }
};

// Check general internet connectivity
export const checkInternetConnectivity = async () => {
  try {
    console.log('[Supabase] Testing general internet connectivity...');

    // Use the Supabase URL itself as a connectivity test instead of Google
    // This avoids CORS issues since we're already making API calls to this domain
    const response = await fetch(`${originalSupabaseUrl}/auth/v1/health`, {
      method: 'HEAD',
      headers: {
        apikey: supabaseAnonKey,
      },
    });

    console.log(`[Supabase] Connectivity test: ${response.status}`);
    return true;
  } catch (error) {
    console.error('[Supabase] Cannot reach Supabase, likely a connectivity issue:', error);

    // Try with the fallback URL as a second attempt
    try {
      const fallbackResponse = await fetch(`${fallbackSupabaseUrl}`, {
        method: 'HEAD',
        mode: 'no-cors', // Use no-cors mode as a fallback
      });

      // If we get here, we at least have some connectivity
      console.log('[Supabase] Fallback connectivity check succeeded');
      return true;
    } catch (fallbackError) {
      console.error('[Supabase] Cannot reach fallback URL either:', fallbackError);
      return false;
    }
  }
};

// Export a typed version of the supabase client
export type TypedSupabaseClient = typeof supabase;
