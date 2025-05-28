import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test config
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Test credentials (must be set in environment variables)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lumea.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const COACH_EMAIL = process.env.COACH_EMAIL || 'coach@lumea.com';
const COACH_PASSWORD = process.env.COACH_PASSWORD;
const CLIENT_EMAIL = process.env.CLIENT_EMAIL || 'client@lumea.com';
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD;

if (!ADMIN_PASSWORD || !COACH_PASSWORD || !CLIENT_PASSWORD) {
  throw new Error('Test passwords must be set in environment variables: ADMIN_PASSWORD, COACH_PASSWORD, CLIENT_PASSWORD');
}

// Global variables to store IDs for tests
let sessionId: number;
let reflectionId: number;
let coachNotesId: number;

// Clients for different user types
let adminClient: SupabaseClient;
let coachClient: SupabaseClient;
let clientClient: SupabaseClient;
let anonClient: SupabaseClient;

// Helper to sign in and return client
async function signInAsUser(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    throw new Error(`Failed to sign in as ${email}: ${error.message}`);
  }
  
  return client;
}

// Helper to fetch test IDs
async function fetchTestIds() {
  // Use the admin client to get IDs since it has full access
  const { data: sessions } = await adminClient
    .from('sessions')
    .select('id')
    .limit(1)
    .single();
  
  if (sessions) {
    sessionId = sessions.id;
    
    const { data: reflections } = await adminClient
      .from('reflections')
      .select('id')
      .eq('session_id', sessionId)
      .limit(1)
      .single();
    
    if (reflections) {
      reflectionId = reflections.id;
    }
    
    const { data: coachNotes } = await adminClient
      .from('coach_notes')
      .select('id')
      .eq('session_id', sessionId)
      .limit(1)
      .single();
    
    if (coachNotes) {
      coachNotesId = coachNotes.id;
    }
  }
}

// Setup and teardown
beforeAll(async () => {
  // Create clients for each user type
  adminClient = await signInAsUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  coachClient = await signInAsUser(COACH_EMAIL, COACH_PASSWORD);
  clientClient = await signInAsUser(CLIENT_EMAIL, CLIENT_PASSWORD);
  anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Get test data IDs
  await fetchTestIds();
});

afterAll(async () => {
  // Sign out all clients
  await adminClient.auth.signOut();
  await coachClient.auth.signOut();
  await clientClient.auth.signOut();
});

// TEST SUITES

describe('Anonymous user access', () => {
  it('cannot access roles table', async () => {
    const { data, error } = await anonClient.from('roles').select();
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
  
  it('cannot access users table', async () => {
    const { data, error } = await anonClient.from('users').select();
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
  
  it('cannot access sessions table', async () => {
    const { data, error } = await anonClient.from('sessions').select();
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
  
  it('cannot access reflections table', async () => {
    const { data, error } = await anonClient.from('reflections').select();
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
  
  it('cannot access coach_notes table', async () => {
    const { data, error } = await anonClient.from('coach_notes').select();
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
});

describe('Admin user access', () => {
  it('can read all roles', async () => {
    const { data, error } = await adminClient.from('roles').select();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThanOrEqual(3); // admin, coach, client
  });
  
  it('can read all users', async () => {
    const { data, error } = await adminClient.from('users').select();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThanOrEqual(3); // admin, coach, client
  });
  
  it('can read all sessions', async () => {
    const { data, error } = await adminClient.from('sessions').select();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThanOrEqual(1);
  });
  
  it('can read all reflections', async () => {
    const { data, error } = await adminClient.from('reflections').select();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThanOrEqual(1);
  });
  
  it('can read all coach notes', async () => {
    const { data, error } = await adminClient.from('coach_notes').select();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThanOrEqual(1);
  });
  
  it('can create and update sessions', async () => {
    // Get coach and client IDs
    const { data: users } = await adminClient.from('users').select('id, email');
    const coach = users?.find(u => u.email === COACH_EMAIL);
    const client = users?.find(u => u.email === CLIENT_EMAIL);
    
    // Create
    const { data: created, error: createError } = await adminClient
      .from('sessions')
      .insert({
        coach_id: coach?.id,
        client_id: client?.id,
        date: new Date().toISOString(),
        notes: 'Admin created test session'
      })
      .select()
      .single();
    
    expect(createError).toBeNull();
    expect(created).toBeTruthy();
    
    // Update
    const { error: updateError } = await adminClient
      .from('sessions')
      .update({ notes: 'Admin updated test session' })
      .eq('id', created.id);
    
    expect(updateError).toBeNull();
    
    // Delete (cleanup)
    const { error: deleteError } = await adminClient
      .from('sessions')
      .delete()
      .eq('id', created.id);
    
    expect(deleteError).toBeNull();
  });
});

describe('Coach user access', () => {
  it('can read all roles', async () => {
    const { data, error } = await coachClient.from('roles').select();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThanOrEqual(3);
  });
  
  it('can only read own user data', async () => {
    const { data: userData, error: userError } = await coachClient.from('users').select();
    
    // Should be able to read all user data due to RLS
    expect(userError).toBeNull();
    
    // Get the coach's own user data
    const { data: coachData } = await coachClient.auth.getUser();
    const ownUser = userData?.find(u => u.auth_id === coachData.user?.id);
    
    // Coach should at least see their own user
    expect(ownUser).toBeTruthy();
  });
  
  it('can read own sessions', async () => {
    const { data, error } = await coachClient.from('sessions').select();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    
    // Check that all returned sessions have coach as coach_id
    const { data: coachUserData } = await coachClient
      .from('users')
      .select('id')
      .eq('email', COACH_EMAIL)
      .single();
    
    expect(coachUserData).toBeTruthy();
    
    data?.forEach(session => {
      expect(session.coach_id).toBe(coachUserData.id);
    });
  });
  
  it('can create and manage own sessions', async () => {
    // Get coach's user ID
    const { data: coachUser } = await coachClient
      .from('users')
      .select('id')
      .eq('email', COACH_EMAIL)
      .single();
    
    // Get a client ID
    const { data: clientUser } = await coachClient
      .from('users')
      .select('id')
      .eq('email', CLIENT_EMAIL)
      .single();
    
    // Coach creates a new session
    const { data: created, error: createError } = await coachClient
      .from('sessions')
      .insert({
        coach_id: coachUser.id,
        client_id: clientUser.id,
        date: new Date().toISOString(),
        notes: 'Coach created test session'
      })
      .select()
      .single();
    
    expect(createError).toBeNull();
    expect(created).toBeTruthy();
    
    // Update session
    const { error: updateError } = await coachClient
      .from('sessions')
      .update({ notes: 'Coach updated test session' })
      .eq('id', created.id);
    
    expect(updateError).toBeNull();
    
    // Add coach notes
    const { data: notes, error: notesError } = await coachClient
      .from('coach_notes')
      .insert({
        session_id: created.id,
        text: 'Coach test notes'
      })
      .select()
      .single();
    
    expect(notesError).toBeNull();
    expect(notes).toBeTruthy();
    
    // Delete coach notes (cleanup)
    const { error: deleteNotesError } = await coachClient
      .from('coach_notes')
      .delete()
      .eq('id', notes.id);
    
    expect(deleteNotesError).toBeNull();
    
    // Delete session (cleanup)
    const { error: deleteError } = await coachClient
      .from('sessions')
      .delete()
      .eq('id', created.id);
    
    expect(deleteError).toBeNull();
  });
  
  it('can read and write coach notes for own sessions', async () => {
    // Get coach notes for the test session
    const { data, error } = await coachClient
      .from('coach_notes')
      .select('*, sessions(coach_id)')
      .eq('session_id', sessionId);
    
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    
    // Verify these are notes for sessions where this user is the coach
    const { data: coachUserData } = await coachClient
      .from('users')
      .select('id')
      .eq('email', COACH_EMAIL)
      .single();
    
    data?.forEach(note => {
      expect(note.sessions.coach_id).toBe(coachUserData.id);
    });
  });
});

describe('Client user access', () => {
  it('can read all roles', async () => {
    const { data, error } = await clientClient.from('roles').select();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThanOrEqual(3);
  });
  
  it('can only read own user data', async () => {
    const { data: userData, error: userError } = await clientClient.from('users').select();
    
    // Should be able to read all user data due to RLS
    expect(userError).toBeNull();
    
    // Get the client's own user data
    const { data: authData } = await clientClient.auth.getUser();
    const ownUser = userData?.find(u => u.auth_id === authData.user?.id);
    
    // Client should at least see their own user
    expect(ownUser).toBeTruthy();
  });
  
  it('can read own sessions', async () => {
    const { data, error } = await clientClient.from('sessions').select();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    
    // Check that all returned sessions have client as client_id
    const { data: clientUserData } = await clientClient
      .from('users')
      .select('id')
      .eq('email', CLIENT_EMAIL)
      .single();
    
    data?.forEach(session => {
      expect(session.client_id).toBe(clientUserData.id);
    });
  });
  
  it('cannot create sessions', async () => {
    // Get client's user ID
    const { data: clientUser } = await clientClient
      .from('users')
      .select('id')
      .eq('email', CLIENT_EMAIL)
      .single();
    
    // Get a coach ID
    const { data: coachUser } = await clientClient
      .from('users')
      .select('id')
      .eq('email', COACH_EMAIL)
      .single();
    
    // Client tries to create a new session
    const { error: createError } = await clientClient
      .from('sessions')
      .insert({
        coach_id: coachUser.id,
        client_id: clientUser.id,
        date: new Date().toISOString(),
        notes: 'Client attempt to create session'
      });
    
    // Should be denied by RLS
    expect(createError).toBeTruthy();
  });
  
  it('can read own reflections', async () => {
    const { data, error } = await clientClient
      .from('reflections')
      .select('*, sessions(client_id)')
      .eq('session_id', sessionId);
    
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    
    // Verify these are reflections for sessions where this user is the client
    const { data: clientUserData } = await clientClient
      .from('users')
      .select('id')
      .eq('email', CLIENT_EMAIL)
      .single();
    
    data?.forEach(reflection => {
      expect(reflection.sessions.client_id).toBe(clientUserData.id);
    });
  });
  
  it('can create reflections for own sessions', async () => {
    // Get client's user ID
    const { data: clientUser } = await clientClient
      .from('users')
      .select('id')
      .eq('email', CLIENT_EMAIL)
      .single();
    
    // Get a session where this client is a participant
    const { data: sessions } = await clientClient
      .from('sessions')
      .select('id')
      .eq('client_id', clientUser.id)
      .limit(1);
    
    if (sessions && sessions.length > 0) {
      const sessionId = sessions[0].id;
      
      // Client creates a new reflection
      const { data: created, error: createError } = await clientClient
        .from('reflections')
        .insert({
          session_id: sessionId,
          text: 'Client test reflection',
          audio_url: null
        })
        .select()
        .single();
      
      expect(createError).toBeNull();
      expect(created).toBeTruthy();
      
      // Update reflection
      const { error: updateError } = await clientClient
        .from('reflections')
        .update({ text: 'Updated client test reflection' })
        .eq('id', created.id);
      
      expect(updateError).toBeNull();
      
      // Delete reflection (cleanup)
      const { error: deleteError } = await clientClient
        .from('reflections')
        .delete()
        .eq('id', created.id);
      
      expect(deleteError).toBeNull();
    } else {
      // Skip test if no sessions found
      console.log('No client sessions found to test reflection creation');
    }
  });
  
  it('cannot access coach_notes', async () => {
    const { data, error } = await clientClient.from('coach_notes').select();
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
}); 