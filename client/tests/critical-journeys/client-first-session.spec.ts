import { test, expect } from '@playwright/test';

/**
 * Client Registration and First Session E2E Tests
 * Week 2 - Technical Excellence: Critical User Journey
 * 
 * Tests the complete client experience:
 * 1. Registration via coach invitation
 * 2. Profile setup
 * 3. Session booking
 * 4. Pre-session reflection
 * 5. Session participation
 * 6. Post-session feedback
 */

test.describe('Client Registration and First Session', () => {
  test.beforeEach(async ({ page }) => {
    // Start from invitation link
    await page.goto('/invite?token=mock-invitation-token&coach=sarah-johnson');
  });

  test('Complete client onboarding and first session', async ({ page }) => {
    // Step 1: Accept invitation and register
    await expect(page.locator('text=Sarah Johnson has invited you')).toBeVisible();
    await page.click('button:has-text("Accept Invitation")');
    
    // Registration form
    await page.fill('input[name="firstName"]', 'Alex');
    await page.fill('input[name="lastName"]', 'Chen');
    await page.fill('input[name="email"]', 'alex.chen@testclient.com');
    await page.fill('input[name="password"]', 'ClientPassword123!');
    await page.fill('input[name="confirmPassword"]', 'ClientPassword123!');
    
    await page.check('input[name="acceptTerms"]');
    await page.click('button:has-text("Create Account")');
    
    // Step 2: Client profile setup
    await page.waitForURL('**/client/onboarding');
    
    // Personal information
    await page.fill('textarea[name="goals"]', 'I want to improve my work-life balance and develop better time management skills.');
    await page.selectOption('select[name="coachingArea"]', 'Life Coaching');
    await page.selectOption('select[name="sessionFrequency"]', 'Weekly');
    
    // Health and preferences
    await page.check('input[name="hasHealthConditions"][value="no"]');
    await page.selectOption('select[name="preferredTime"]', 'Morning');
    await page.selectOption('select[name="timezone"]', 'America/New_York');
    
    await page.click('button:has-text("Continue")');
    
    // Step 3: Complete profile
    await page.fill('input[name="phone"]', '+1-555-0123');
    await page.selectOption('select[name="emergencyContact"]', 'Spouse');
    await page.fill('input[name="emergencyName"]', 'Jordan Chen');
    await page.fill('input[name="emergencyPhone"]', '+1-555-0124');
    
    await page.click('button:has-text("Complete Profile")');
    
    // Verify redirect to client dashboard
    await page.waitForURL('**/client/dashboard');
    await expect(page.locator('text=Welcome, Alex!')).toBeVisible();
    
    // Step 4: Book first session
    await page.click('text=Book Your First Session');
    
    // Select available time slot
    await page.click('.calendar-slot[data-date="next-monday"][data-time="10:00"]');
    
    // Confirm booking
    await page.click('button:has-text("Book Session")');
    await expect(page.locator('text=Session booked successfully')).toBeVisible();
    
    // Step 5: Complete pre-session reflection
    await page.click('text=Complete Pre-Session Reflection');
    
    // Fill reflection form
    await page.fill('textarea[name="currentMood"]', 'Feeling optimistic and ready to start this journey.');
    await page.fill('textarea[name="recentChallenges"]', 'Been struggling with time management at work and feeling overwhelmed.');
    await page.fill('textarea[name="sessionGoals"]', 'Want to discuss strategies for better work-life balance.');
    
    // Rate current state
    await page.click('.rating-scale[data-rating="6"]');
    
    await page.click('button:has-text("Submit Reflection")');
    await expect(page.locator('text=Reflection submitted')).toBeVisible();
    
    // Step 6: Session participation (mock video call)
    await page.goto('/client/session/upcoming');
    await page.click('button:has-text("Join Session")');
    
    // Verify video call interface
    await expect(page.locator('text=Video Call with Sarah Johnson')).toBeVisible();
    await expect(page.locator('video[data-testid="local-video"]')).toBeVisible();
    await expect(page.locator('video[data-testid="remote-video"]')).toBeVisible();
    
    // Test session controls
    await page.click('button[data-testid="mute-audio"]');
    await expect(page.locator('button[data-testid="mute-audio"]')).toHaveClass(/muted/);
    
    await page.click('button[data-testid="toggle-video"]');
    await expect(page.locator('button[data-testid="toggle-video"]')).toHaveClass(/video-off/);
    
    // End session
    await page.click('button[data-testid="end-session"]');
    await page.click('button:has-text("Confirm End Session")');
    
    // Step 7: Post-session feedback
    await page.waitForURL('**/client/session/feedback');
    
    // Rate session
    await page.click('.session-rating[data-rating="5"]');
    
    // Provide feedback
    await page.fill('textarea[name="sessionFeedback"]', 'Great first session! Sarah provided excellent insights and practical strategies.');
    await page.fill('textarea[name="keyTakeaways"]', 'Time-blocking technique and the importance of setting boundaries.');
    await page.fill('textarea[name="actionItems"]', 'Implement daily time-blocking and practice saying no to non-essential commitments.');
    
    // Rate coach
    await page.click('.coach-rating[data-rating="5"]');
    
    await page.click('button:has-text("Submit Feedback")');
    
    // Verify completion
    await expect(page.locator('text=Thank you for your feedback')).toBeVisible();
    
    // Step 8: Schedule next session
    await page.click('button:has-text("Schedule Next Session")');
    
    // Select next available slot
    await page.click('.calendar-slot[data-date="next-monday"][data-time="10:00"]');
    await page.click('button:has-text("Book Session")');
    
    await expect(page.locator('text=Next session scheduled')).toBeVisible();
    
    // Verify dashboard shows upcoming session
    await page.goto('/client/dashboard');
    await expect(page.locator('text=Upcoming Session')).toBeVisible();
    await expect(page.locator('text=Sarah Johnson')).toBeVisible();
  });

  test('Client mobile app experience', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Complete registration flow on mobile
    await page.click('button:has-text("Accept Invitation")');
    
    await page.fill('input[name="firstName"]', 'Mobile');
    await page.fill('input[name="lastName"]', 'Client');
    await page.fill('input[name="email"]', 'mobile.client@test.com');
    await page.fill('input[name="password"]', 'MobileTest123!');
    await page.fill('input[name="confirmPassword"]', 'MobileTest123!');
    
    await page.check('input[name="acceptTerms"]');
    await page.click('button:has-text("Create Account")');
    
    // Test mobile navigation
    await page.waitForURL('**/client/dashboard');
    
    // Open mobile menu
    await page.click('button[data-testid="mobile-menu"]');
    await expect(page.locator('.mobile-menu')).toBeVisible();
    
    // Navigate to reflections
    await page.click('text=Reflections');
    await page.waitForURL('**/client/reflections');
    
    // Test mobile reflection form
    await page.click('button:has-text("New Reflection")');
    
    // Verify mobile-optimized form
    const reflectionForm = page.locator('form[data-testid="mobile-reflection-form"]');
    await expect(reflectionForm).toBeVisible();
    
    // Test voice recording on mobile
    await page.click('button[data-testid="voice-recording"]');
    await expect(page.locator('text=Recording...')).toBeVisible();
    
    await page.click('button[data-testid="stop-recording"]');
    await expect(page.locator('text=Recording saved')).toBeVisible();
  });

  test('Accessibility in client journey', async ({ page }) => {
    // Test screen reader compatibility
    await page.click('button:has-text("Accept Invitation")');
    
    // Check form accessibility
    const firstNameInput = page.locator('input[name="firstName"]');
    await expect(firstNameInput).toHaveAttribute('aria-label', /first name/i);
    
    // Test keyboard navigation
    await page.press('input[name="firstName"]', 'Tab');
    await expect(page.locator('input[name="lastName"]')).toBeFocused();
    
    // Complete registration
    await page.fill('input[name="firstName"]', 'Accessible');
    await page.fill('input[name="lastName"]', 'Client');
    await page.fill('input[name="email"]', 'accessible.client@test.com');
    await page.fill('input[name="password"]', 'AccessibleTest123!');
    await page.fill('input[name="confirmPassword"]', 'AccessibleTest123!');
    
    await page.check('input[name="acceptTerms"]');
    await page.click('button:has-text("Create Account")');
    
    // Test dashboard accessibility
    await page.waitForURL('**/client/dashboard');
    
    // Check for proper heading structure
    await expect(page.locator('h1')).toHaveText(/welcome/i);
    await expect(page.locator('h2').first()).toBeVisible();
    
    // Test ARIA landmarks
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    
    // Test focus management
    await page.press('body', 'Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Test expired invitation
    await page.goto('/invite?token=expired-token&coach=sarah-johnson');
    await expect(page.locator('text=This invitation has expired')).toBeVisible();
    
    // Test invalid invitation
    await page.goto('/invite?token=invalid-token&coach=sarah-johnson');
    await expect(page.locator('text=Invalid invitation')).toBeVisible();
    
    // Test network error handling during registration
    // Mock network failure
    await page.route('**/api/auth/register', route => {
      route.abort('failed');
    });
    
    await page.goto('/invite?token=mock-invitation-token&coach=sarah-johnson');
    await page.click('button:has-text("Accept Invitation")');
    
    await page.fill('input[name="firstName"]', 'Error');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'error.test@test.com');
    await page.fill('input[name="password"]', 'ErrorTest123!');
    await page.fill('input[name="confirmPassword"]', 'ErrorTest123!');
    
    await page.check('input[name="acceptTerms"]');
    await page.click('button:has-text("Create Account")');
    
    // Verify error handling
    await expect(page.locator('text=Network error')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
}); 