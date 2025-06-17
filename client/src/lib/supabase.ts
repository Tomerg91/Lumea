import { createClient } from '@supabase/supabase-js';
import type { Database, TypedSupabaseClient } from '../types/database.types';

// Get Supabase configuration - prioritize working URL over broken environment variable
const supabaseUrl = 'https://humlrpbtrbjnpnsusils.supabase.co'; // Using working URL directly
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bWxycGJ0cmJqbnBuc3VzaWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjQ3MzcsImV4cCI6MjA2MTQwMDczN30.ywX7Zpywze07KqPHwiwn_hECuiblnc4-_dEl0QNU7nU';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
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
