import { createClient } from '@supabase/supabase-js';
import type { Database, TypedSupabaseClient } from '../../../shared/types/database';

// Get Supabase configuration from environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cjxbfpsbrufxpqqlyueh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqeGJmcHNicnVmeHBxcWx5dWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODQ3MDQsImV4cCI6MjA2NjE2MDcwNH0.1jFZVD-o-_TxMWPmRF_81AbeCtphD8NyHO1hon2c-I4';

// Detect if we're using local development
const isLocalDev = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');

// Log configuration for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('[Supabase] Configuration:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    isLocalDev: isLocalDev,
    envUrl: import.meta.env.VITE_SUPABASE_URL,
    envKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '[PRESENT]' : '[MISSING]'
  });
}

// Validate configuration
if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT_REF')) {
  throw new Error('Missing or invalid Supabase URL. Please check VITE_SUPABASE_URL environment variable.');
}

if (!supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
  throw new Error('Missing or invalid Supabase anon key. Please check VITE_SUPABASE_ANON_KEY environment variable.');
}

// Create and export the typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
export function getSupabaseClient(): TypedSupabaseClient {
  return supabase;
}

// Test connection function with enhanced error handling
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    console.log('[Supabase] Testing connection to:', supabaseUrl);
    
    // For local development, check if the service is available
    if (isLocalDev) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });
        
        if (response.status === 404 || response.status === 503) {
          console.warn('[Supabase] Local Supabase not running. Please start it with: supabase start');
          return false;
        }
        
        console.log('[Supabase] Local Supabase connection successful');
        return true;
      } catch (fetchError) {
        console.error('[Supabase] Local Supabase not reachable:', fetchError);
        return false;
      }
    }
    
    // Try to make a simple request to test connectivity
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message.includes('network')) {
      console.error('[Supabase] Network connectivity issue:', error);
      return false;
    }
    
    if (error && error.message.includes('Invalid API key')) {
      console.error('[Supabase] Invalid API key:', error);
      return false;
    }
    
    if (error) {
      console.error('[Supabase] Connection error:', error);
      return false;
    }
    
    console.log('[Supabase] Connection test successful');
    return true;
  } catch (error) {
    console.error('[Supabase] Connection test failed:', error);
    return false;
  }
}

// Export development status
export const isDevelopmentMode = isLocalDev && import.meta.env.DEV;

// Utility function to check if the client is properly typed
export function validateSupabaseTypes(): boolean {
  try {
    // This will cause a TypeScript error if types are not properly configured
    const _typeCheck: TypedSupabaseClient = supabase;
    return true;
  } catch {
    return false;
  }
}

// Export type-safe table helpers
export const tables = {
  users: () => supabase.from('users'),
  sessions: () => supabase.from('sessions'),
  payments: () => supabase.from('payments'),
  reflections: () => supabase.from('reflections'),
  resources: () => supabase.from('resources'),
  resource_users: () => supabase.from('resource_users'),
  coach_notes: () => supabase.from('coach_notes'),
  files: () => supabase.from('files'),
  notifications: () => supabase.from('notifications'),
  calendar_integrations: () => supabase.from('calendar_integrations'),
  calendar_events: () => supabase.from('calendar_events'),
  audit_logs: () => supabase.from('audit_logs'),
  consents: () => supabase.from('consents'),
  password_reset_tokens: () => supabase.from('password_reset_tokens'),
  performance_metrics: () => supabase.from('performance_metrics'),
  session_feedback: () => supabase.from('session_feedback'),
} as const;

// Export auth helpers with type safety
export const auth = {
  signUp: supabase.auth.signUp.bind(supabase.auth),
  signInWithPassword: supabase.auth.signInWithPassword.bind(supabase.auth),
  signOut: supabase.auth.signOut.bind(supabase.auth),
  getSession: supabase.auth.getSession.bind(supabase.auth),
  getUser: supabase.auth.getUser.bind(supabase.auth),
  onAuthStateChange: supabase.auth.onAuthStateChange.bind(supabase.auth),
  resetPasswordForEmail: supabase.auth.resetPasswordForEmail.bind(supabase.auth),
  updateUser: supabase.auth.updateUser.bind(supabase.auth),
} as const;

// Export storage helpers with type safety
export const storage = {
  from: supabase.storage.from.bind(supabase.storage),
  createBucket: supabase.storage.createBucket.bind(supabase.storage),
  getBucket: supabase.storage.getBucket.bind(supabase.storage),
  listBuckets: supabase.storage.listBuckets.bind(supabase.storage),
} as const;

// Export the client type for use throughout the application
export type { TypedSupabaseClient, Database };

// Default export for convenience
export default supabase;

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error && error.code !== '42P01') { // Ignore "relation does not exist" error for empty DB
      throw error;
    }
    return { connected: true, error: null };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
};
