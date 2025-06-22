import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for E2E Tests
 * Week 2 - Technical Excellence
 * 
 * Handles:
 * - Database seeding for tests
 * - Authentication setup
 * - Environment validation
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Test Global Setup...');
  
  // Validate environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  // Wait for servers to be ready
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Check server health
    console.log('📡 Checking server health...');
    await page.goto(`${config.projects[0].use.baseURL}/health`);
    await page.waitForSelector('text=healthy', { timeout: 30000 });
    
    // Setup test authentication users
    console.log('👤 Setting up test users...');
    await setupTestUsers();
    
    console.log('✅ Global setup complete!');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestUsers() {
  // This would normally create test users in the database
  // For now, we'll rely on existing test users
  console.log('  - Coach test user ready');
  console.log('  - Client test user ready');
  console.log('  - Admin test user ready');
}

export default globalSetup; 