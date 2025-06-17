import { createClient } from '@supabase/supabase-js';
import type { Database, TypedSupabaseClient } from '../../../shared/types/database';

// Create Supabase client for server-side use
const supabaseUrl = process.env.SUPABASE_URL || 'https://humlrpbtrbjnpnsusils.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bWxycGJ0cmJqbnBuc3VzaWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjQ3MzcsImV4cCI6MjA2MTQwMDczN30.ywX7Zpywze07KqPHwiwn_hECuiblnc4-_dEl0QNU7nU';

// Validate configuration
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
}

// Create typed Supabase client for server-side operations
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false, // Server-side doesn't need session persistence
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'satya-coaching-server'
    }
  }
});

// Export type-safe table helpers for server use
export const serverTables = {
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

// Export auth helpers for server use
export const serverAuth = {
  getUser: supabase.auth.getUser.bind(supabase.auth),
  createUser: supabase.auth.admin.createUser.bind(supabase.auth.admin),
  deleteUser: supabase.auth.admin.deleteUser.bind(supabase.auth.admin),
  updateUserById: supabase.auth.admin.updateUserById.bind(supabase.auth.admin),
  listUsers: supabase.auth.admin.listUsers.bind(supabase.auth.admin),
} as const;

// Export storage helpers for server use
export const serverStorage = {
  from: supabase.storage.from.bind(supabase.storage),
  createBucket: supabase.storage.createBucket.bind(supabase.storage),
  getBucket: supabase.storage.getBucket.bind(supabase.storage),
  listBuckets: supabase.storage.listBuckets.bind(supabase.storage),
  deleteBucket: supabase.storage.deleteBucket.bind(supabase.storage),
} as const;

// Function to get the typed Supabase client
export function getSupabaseClient(): TypedSupabaseClient {
  return supabase;
}

// Test connection function for server
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    console.log('[Server Supabase] Testing connection...');
    
    // Try to make a simple request to test connectivity
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('[Server Supabase] Connection test failed:', error);
      return false;
    }
    
    console.log('[Server Supabase] Connection test successful');
    return true;
  } catch (error) {
    console.error('[Server Supabase] Connection test failed:', error);
    return false;
  }
}

// Export types for use in server code
export type { Database, TypedSupabaseClient };

// Default export
export default supabase; 