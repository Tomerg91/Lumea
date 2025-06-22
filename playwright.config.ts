import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for SatyaCoaching Platform
 * Week 2 - Technical Excellence: E2E Testing Setup
 * 
 * This configuration supports:
 * - Multiple browsers (Chrome, Firefox, Safari)
 * - Mobile testing (iOS/Android)
 * - CI/CD integration
 * - Visual regression testing
 * - Performance testing
 */
export default defineConfig({
  testDir: './client/tests',
  // Exclude Vitest test files from Playwright
  testIgnore: [
    '**/src/**/__tests__/**',
    '**/src/**/*.test.{ts,tsx}',
    '**/src/**/*.spec.{ts,tsx}',
    '**/*.integration.test.{ts,tsx}',
    '**/*.unit.test.{ts,tsx}'
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration for different environments
  reporter: process.env.CI 
    ? [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['html'], ['list']],
  
  // Global test settings
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Global timeout settings
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  // Projects for cross-browser testing
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Tablet testing
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
    
    // Performance testing project
    {
      name: 'performance',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/performance/*.spec.ts',
    },
  ],

  // Web server configuration for local development
  webServer: [
    {
      command: 'npm run dev --workspace server',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev --workspace client',
      port: 8080,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],

  // Output directories
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: './client/tests/global-setup.ts',
  globalTeardown: './client/tests/global-teardown.ts',
}); 