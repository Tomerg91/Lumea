#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env
dotenv.config();

// We'll use the Supabase client for seeding
const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' // Local dev service key
);

// Check if tables are already seeded
async function isSeeded(): Promise<boolean> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error checking if database is seeded:', error);
    return false;
  }
  
  return data && data.length > 0;
}

// Seed roles
async function seedRoles() {
  console.log('Seeding roles...');
  
  const roles = [
    { name: 'admin' },
    { name: 'coach' },
    { name: 'client' }
  ];
  
  for (const role of roles) {
    const { error } = await supabase
      .from('roles')
      .upsert(role, { onConflict: 'name' });
    
    if (error) {
      console.error(`Error seeding role ${role.name}:`, error);
    } else {
      console.log(`Role ${role.name} seeded successfully`);
    }
  }
}

// Create a user with auth and profile
async function createUser(email: string, password: string, roleName: string) {
  console.log(`Creating ${roleName} user...`);
  
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm for local dev
  });
  
  if (authError) {
    console.error(`Error creating ${roleName} auth:`, authError);
    return null;
  }
  
  const authId = authData.user.id;
  console.log(`Created auth user with ID: ${authId}`);
  
  // 2. Get role ID
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single();
  
  if (roleError || !roleData) {
    console.error(`Error getting ${roleName} role ID:`, roleError);
    return null;
  }
  
  // 3. Create user profile
  const { data: userData, error: userError } = await supabase
    .from('users')
    .upsert({
      email,
      role_id: roleData.id,
      status: 'active',
      auth_id: authId
    }, { onConflict: 'email' })
    .select();
  
  if (userError) {
    console.error(`Error creating ${roleName} user:`, userError);
    return null;
  }
  
  console.log(`Created ${roleName} user profile with ID: ${userData[0].id}`);
  return userData[0];
}

// Seed a demo session
async function seedSession(coachUser: any, clientUser: any) {
  console.log('Creating demo session...');
  
  // Create session
  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .upsert({
      coach_id: coachUser.id,
      client_id: clientUser.id,
      date: new Date().toISOString(),
      notes: 'Demo session for testing the Lumea coaching platform'
    })
    .select();
  
  if (sessionError) {
    console.error('Error creating demo session:', sessionError);
    return null;
  }
  
  const sessionId = sessionData[0].id;
  console.log(`Created demo session with ID: ${sessionId}`);
  
  // Create reflection
  const { error: reflectionError } = await supabase
    .from('reflections')
    .upsert({
      session_id: sessionId,
      text: 'I found this session very helpful. I learned a lot about myself and gained insights into my patterns.',
      audio_url: null // No audio for the demo
    });
  
  if (reflectionError) {
    console.error('Error creating demo reflection:', reflectionError);
  } else {
    console.log('Created demo reflection successfully');
  }
  
  // Create coach notes
  const { error: notesError } = await supabase
    .from('coach_notes')
    .upsert({
      session_id: sessionId,
      text: 'Client showed progress in self-awareness. Topics to explore in next session: work-life balance and stress management techniques.'
    });
  
  if (notesError) {
    console.error('Error creating demo coach notes:', notesError);
  } else {
    console.log('Created demo coach notes successfully');
  }
  
  return sessionData[0];
}

// Main bootstrap function
async function bootstrap() {
  try {
    console.log('Checking if database is already seeded...');
    
    const alreadySeeded = await isSeeded();
    if (alreadySeeded) {
      console.log('Database already seeded. Use --force to reseed.');
      
      // Check for --force argument
      if (process.argv.includes('--force')) {
        console.log('Force option detected. Proceeding with seeding...');
      } else {
        return;
      }
    }
    
    // 1. Seed roles
    await seedRoles();
    
    // 2. Create test users
    const adminUser = await createUser(
      process.env.ADMIN_EMAIL || 'admin@lumea.com',
      process.env.ADMIN_PASSWORD || 'adminpassword123',
      'admin'
    );
    
    const coachUser = await createUser(
      process.env.COACH_EMAIL || 'coach@lumea.com',
      process.env.COACH_PASSWORD || 'coachpassword123',
      'coach'
    );
    
    const clientUser = await createUser(
      process.env.CLIENT_EMAIL || 'client@lumea.com',
      process.env.CLIENT_PASSWORD || 'clientpassword123',
      'client'
    );
    
    if (!adminUser || !coachUser || !clientUser) {
      console.error('Failed to create one or more required users');
      return;
    }
    
    // 3. Create demo session, reflection, and notes
    await seedSession(coachUser, clientUser);
    
    console.log('✅ Bootstrap complete! Demo data has been seeded successfully.');
    console.log(`\nLogin credentials (if not provided in .env):`);
    console.log(`Admin: admin@lumea.com / adminpassword123`);
    console.log(`Coach: coach@lumea.com / coachpassword123`);
    console.log(`Client: client@lumea.com / clientpassword123`);
    console.log(`\nNOTE: In production, use secure passwords stored in .env`);
    
  } catch (error) {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  }
}

// Run the bootstrap function
bootstrap(); 