import { test, expect } from '@playwright/test';

// Helper function to wait a bit
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('Coach Dashboard happy path on mobile viewport', async ({ page }) => {
  // Set viewport to mobile size (iPhone X)
  await page.setViewportSize({ width: 375, height: 812 });
  
  // Login as coach
  await page.goto('/login');
  await page.fill('input[type="email"]', 'coach@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await page.waitForURL('**/coach/dashboard');
  
  // Navigate to clients page
  await page.click('text=Clients');
  await page.waitForURL('**/coach/clients');
  
  // Check for empty state
  await expect(page.locator('text=No clients yet')).toBeVisible();
  
  // Open invite modal
  await page.click('button:has-text("Invite Client")');
  
  // Fill out invite form
  await page.fill('input[type="email"]', 'new.client@example.com');
  await page.click('button:has-text("Send Invite")');
  
  // Wait for client to appear in the table
  // In a real test, we'd need to handle the email and registration flow
  // Here we'll assume the backend is mocked to create a client instantly
  await wait(1000); // Wait for API and UI update
  
  // Verify client appears in the list
  await expect(page.locator('text=new.client@example.com')).toBeVisible();
  
  // Navigate to sessions page
  await page.click('text=Sessions');
  await page.waitForURL('**/coach/sessions');
  
  // Check for empty state
  await expect(page.locator('text=No sessions yet')).toBeVisible();
  
  // Open create session modal
  await page.click('button:has-text("Create Session")');
  
  // Fill out the session form
  await page.selectOption('select#client', { label: 'New Client' }); // Assuming the client name is populated
  // Assuming today's date is pre-selected
  await page.fill('textarea#notes', 'Initial coaching session with new client');
  
  // Create the session
  await page.click('button:has-text("Create")');
  
  // Wait for the session to appear in the list
  await wait(1000);
  
  // Verify session appears
  await expect(page.locator('text=Initial coaching session with new client')).toBeVisible();
}); 