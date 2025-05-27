import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration - prioritize working URL over broken environment variable
const supabaseUrl = 'https://humlrpbtrbjnpnsusils.supabase.co'; // Using working URL directly
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bWxycGJ0cmJqbnBuc3VzaWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjQ3MzcsImV4cCI6MjA2MTQwMDczN30.ywX7Zpywze07KqPHwiwn_hECuiblnc4-_dEl0QNU7nU';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'satya-coaching-client'
    }
  }
});

// Function to get the Supabase client (for compatibility with existing code)
export function getSupabaseClient() {
  return supabase;
}

// Test connection function
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    console.log('[Supabase] Testing connection...');
    
    // Try to make a simple request to test connectivity
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message.includes('network')) {
      console.error('[Supabase] Network connectivity issue:', error);
      return false;
    }
    
    console.log('[Supabase] Connection test successful');
    return true;
  } catch (error) {
    console.error('[Supabase] Connection test failed:', error);
    return false;
  }
}

// Export typed version of the client
export type TypedSupabaseClient = typeof supabase;
