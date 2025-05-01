import { createClient } from '@supabase/supabase-js';

// Set up primary and fallback URLs
const originalSupabaseUrl = "https://xjzjzmixbfvuclshvlho.supabase.co"; // Original project URL
const fallbackSupabaseUrl = "https://app.supabase.com"; // Fallback for connectivity testing
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqenpqbWl4YmZ2dWNsc2h2bGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk5MjcxNDgsImV4cCI6MjAzNTUwMzE0OH0._gYTwfMGkH3NAKrAeDiNl-IxUiZ4sHOXzQVXxA2ZTnA";

// Validate keys
if (!originalSupabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key are required. Please check your .env.local file."
  );
}

// Log the Supabase URLs being used for diagnostic purposes
console.log("[Supabase] Configured with URL:", originalSupabaseUrl);
console.log("[Supabase] Fallback URL for connectivity test:", fallbackSupabaseUrl);

// Flag to check if the project URL is reachable
let isProjectUrlReachable = false;

// Create and export the Supabase client
export const supabase = createClient(originalSupabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (...args) => {
      const url = args[0] as string;
      console.log(`[Supabase] Fetching from ${url}`);
      
      // Add error handling to include detailed error information
      return fetch(...args).catch(error => {
        console.error(`[Supabase] Fetch error for ${url}:`, error);
        
        // Re-throw with more information if needed
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.error(`[Supabase] This is likely a network connectivity issue or DNS resolution problem.`);
          
          // If we haven't already checked the project URL, check it now
          if (!isProjectUrlReachable) {
            console.log(`[Supabase] Initiating connection check for ${originalSupabaseUrl}`);
            checkSupabaseConnection().then(result => {
              isProjectUrlReachable = result;
              console.log(`[Supabase] Connection check result: ${result ? 'Reachable' : 'Unreachable'}`);
            });
          }
        }
        
        throw error;
      });
    }
  }
});

// Add detailed DNS resolution check
export const checkDnsResolution = async (url: string, description: string = '') => {
  try {
    console.log(`[Supabase] Testing DNS resolution for ${url} ${description}`);
    // Try to make a simple HEAD request to test DNS resolution
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      console.log(`[Supabase] DNS resolution successful: ${url} returned ${response.status}`);
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`[Supabase] DNS resolution failed for ${url}:`, error);
      
      // Additional diagnosis
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error(`[Supabase] Network error: This could be due to DNS issues, no internet connection, or CORS restrictions`);
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
    const googleResponse = await fetch('https://www.google.com', { method: 'HEAD' });
    console.log(`[Supabase] Google.com connectivity test: ${googleResponse.status}`);
    return true;
  } catch (googleError) {
    console.error('[Supabase] Cannot reach google.com, likely a general connectivity issue:', googleError);
    return false;
  }
};

// Update the connection check function to include comprehensive tests
export const checkSupabaseConnection = async () => {
  try {
    // First check if internet is working at all
    const internetConnected = await checkInternetConnectivity();
    if (!internetConnected) {
      console.error("[Supabase] No internet connectivity detected. Please check your network connection.");
      return false;
    }
    
    // Then check if we can reach the fallback Supabase URL
    const fallbackReachable = await checkDnsResolution(fallbackSupabaseUrl, "(fallback URL)");
    if (!fallbackReachable) {
      console.error("[Supabase] Cannot reach the Supabase fallback domain despite having internet. This suggests a DNS or firewall issue specifically for Supabase domains.");
      return false;
    }
    
    // Finally check if we can reach the specific project URL
    const projectReachable = await checkDnsResolution(originalSupabaseUrl, "(project URL)");
    isProjectUrlReachable = projectReachable;
    
    if (!projectReachable) {
      console.error("[Supabase] Cannot reach the specific Supabase project URL, but can reach the fallback Supabase domain.");
      console.error("[Supabase] This may indicate that the project URL is incorrect or the project has been deleted.");
      return false;
    }
    
    // Then try to access the API
    console.log(`[Supabase] Testing API access for ${originalSupabaseUrl}`);
    const response = await fetch(`${originalSupabaseUrl}/auth/v1/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey
      }
    });
    console.log("[Supabase] Connection check response:", response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error("[Supabase] Connection check failed:", error);
    return false;
  }
};

// Export a typed version of the supabase client
export type TypedSupabaseClient = typeof supabase; 