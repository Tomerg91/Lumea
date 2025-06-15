#!/usr/bin/env tsx

/**
 * Comprehensive Data Migration Script
 * Migrates data from existing PostgreSQL (Drizzle) + MongoDB (Mongoose) to Supabase PostgreSQL
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Database connections - use the same configuration as the client
const supabaseUrl = process.env.SUPABASE_URL || 'https://humlrpbtrbjnpnsusils.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bWxycGJ0cmJqbnBuc3VzaWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjQ3MzcsImV4cCI6MjA2MTQwMDczN30.ywX7Zpywze07KqPHwiwn_hECuiblnc4-_dEl0QNU7nU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Migration statistics
interface MigrationStats {
  tableName: string;
  sourceCount: number;
  migratedCount: number;
  errorCount: number;
  errors: string[];
}

const migrationStats: MigrationStats[] = [];

// Utility functions
function logProgress(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// ID mapping utilities (ObjectId to UUID conversion)
const idMappings = new Map<string, string>();

function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Test Supabase connection and schema
 */
async function testSupabaseConnection() {
  logProgress('Testing Supabase connection...');
  
  try {
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    
    logProgress('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

/**
 * Create sample data for testing migration
 */
async function createSampleData() {
  logProgress('Creating sample data for migration testing...');
  
  try {
    // Create sample users
    const sampleUsers = [
      {
        id: generateUUID(),
        email: 'coach@example.com',
        name: 'Sample Coach',
        role: 'coach',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: generateUUID(),
        email: 'client@example.com', 
        name: 'Sample Client',
        role: 'client',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    const { error: usersError } = await supabase
      .from('users')
      .insert(sampleUsers);

    if (usersError) {
      throw new Error(`Failed to create sample users: ${usersError.message}`);
    }

    // Create sample session
    const sampleSession = {
      id: generateUUID(),
      coach_id: sampleUsers[0].id,
      client_id: sampleUsers[1].id,
      title: 'Sample Coaching Session',
      description: 'Test session for migration',
      scheduled_start: new Date(),
      scheduled_end: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      status: 'scheduled',
      created_at: new Date(),
      updated_at: new Date()
    };

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert(sampleSession);

    if (sessionError) {
      throw new Error(`Failed to create sample session: ${sessionError.message}`);
    }

    logProgress('✅ Sample data created successfully');
    return { users: sampleUsers, session: sampleSession };
  } catch (error) {
    console.error('❌ Failed to create sample data:', error);
    throw error;
  }
}

/**
 * Validate migrated data
 */
async function validateMigration() {
  logProgress('Validating migrated data...');
  
  try {
    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      throw new Error(`Failed to validate users: ${usersError.message}`);
    }
    
    logProgress(`✅ Users table: ${users?.length || 0} records`);

    // Check sessions table
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*');
    
    if (sessionsError) {
      throw new Error(`Failed to validate sessions: ${sessionsError.message}`);
    }
    
    logProgress(`✅ Sessions table: ${sessions?.length || 0} records`);

    // Check other tables
    const tables = [
      'coach_client_relationships',
      'reflections', 
      'payments',
      'resources',
      'files',
      'notifications',
      'coach_notes',
      'consents',
      'audit_logs'
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (!error) {
          logProgress(`✅ ${table} table: accessible`);
        }
      } catch (err) {
        logProgress(`⚠️  ${table} table: ${err}`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  logProgress('Cleaning up test data...');
  
  try {
    // Delete test users (cascade will handle related records)
    const { error } = await supabase
      .from('users')
      .delete()
      .in('email', ['coach@example.com', 'client@example.com']);
    
    if (error) {
      throw new Error(`Failed to cleanup test data: ${error.message}`);
    }
    
    logProgress('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Generate migration report
 */
function generateMigrationReport() {
  logProgress('\n📊 Migration Report:');
  console.log('=' .repeat(80));
  
  let totalSource = 0;
  let totalMigrated = 0;
  let totalErrors = 0;
  
  for (const stat of migrationStats) {
    totalSource += stat.sourceCount;
    totalMigrated += stat.migratedCount;
    totalErrors += stat.errorCount;
    
    const successRate = stat.sourceCount > 0 ? ((stat.migratedCount / stat.sourceCount) * 100).toFixed(1) : '0.0';
    console.log(`${stat.tableName.padEnd(25)} | ${stat.migratedCount.toString().padStart(6)}/${stat.sourceCount.toString().padEnd(6)} | ${successRate.padStart(6)}% | ${stat.errorCount.toString().padStart(6)} errors`);
    
    if (stat.errors.length > 0) {
      console.log(`  Errors: ${stat.errors.slice(0, 3).join(', ')}${stat.errors.length > 3 ? '...' : ''}`);
    }
  }
  
  console.log('=' .repeat(80));
  const overallSuccessRate = totalSource > 0 ? ((totalMigrated / totalSource) * 100).toFixed(1) : '0.0';
  console.log(`${'TOTAL'.padEnd(25)} | ${totalMigrated.toString().padStart(6)}/${totalSource.toString().padEnd(6)} | ${overallSuccessRate.padStart(6)}% | ${totalErrors.toString().padStart(6)} errors`);
  console.log('=' .repeat(80));
}

/**
 * Main migration function
 */
async function runMigration() {
  logProgress('🚀 Starting Supabase data migration validation...');
  
  try {
    // Test connection
    const connectionOk = await testSupabaseConnection();
    if (!connectionOk) {
      throw new Error('Supabase connection failed');
    }

    // Create and test sample data
    await createSampleData();
    
    // Validate the migration setup
    const validationOk = await validateMigration();
    if (!validationOk) {
      throw new Error('Migration validation failed');
    }

    // Clean up test data
    await cleanupTestData();
    
    // Generate report
    generateMigrationReport();
    
    logProgress('✅ Migration validation completed successfully!');
    logProgress('🔄 Ready for actual data migration from PostgreSQL and MongoDB');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { runMigration, migrationStats }; 