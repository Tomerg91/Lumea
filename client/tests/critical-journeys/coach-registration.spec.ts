import { test, expect } from '@playwright/test';

/**
 * Coach Registration and Onboarding E2E Tests
 * Week 2 - Technical Excellence: Critical User Journey
 * 
 * Tests the complete coach registration flow:
 * 1. Registration form
 * 2. Email verification (mock)
 * 3. Profile setup
 * 4. Payment integration setup
 * 5. Calendar integration
 * 6. First client invitation
 */

test.describe('Coach Registration and Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Start from homepage
    await page.goto('/');
  });

  test('Complete coach registration flow', async ({ page }) => {
    // Step 1: Navigate to registration
    await page.click('text=Get Started');
    await page.click('text=Coach Registration');
    
    // Step 2: Fill out registration form
    await page.fill('input[name="firstName"]', 'Sarah');
    await page.fill('input[name="lastName"]', 'Johnson');
    await page.fill('input[name="email"]', 'sarah.johnson@testcoach.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
    
    // Accept terms and conditions
    await page.check('input[name="acceptTerms"]');
    await page.check('input[name="acceptPrivacy"]');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Step 3: Email verification (mock)
    await expect(page.locator('text=Please check your email')).toBeVisible();
    
    // Simulate email verification click (in real tests, would use email service API)
    await page.goto('/verify-email?token=mock-verification-token');
    await expect(page.locator('text=Email verified successfully')).toBeVisible();
    
    // Step 4: Profile setup wizard
    await page.waitForURL('**/coach/onboarding');
    
    // Professional information
    await page.fill('textarea[name="bio"]', 'Certified life coach with 5 years experience helping professionals achieve work-life balance.');
    await page.selectOption('select[name="experience"]', '3-5 years');
    await page.selectOption('select[name="specialization"]', 'Life Coaching');
    
    // Upload profile photo (mock)
    await page.setInputFiles('input[name="profilePhoto"]', 'test-assets/coach-photo.jpg');
    
    // Continue to next step
    await page.click('button:has-text("Continue")');
    
    // Step 5: Payment setup (Stripe Connect)
    await expect(page.locator('text=Payment Setup')).toBeVisible();
    
    // Fill payment information
    await page.fill('input[name="bankAccount"]', '****1234');
    await page.fill('input[name="routingNumber"]', '021000021');
    await page.selectOption('select[name="currency"]', 'USD');
    
    // Set coaching rates
    await page.fill('input[name="hourlyRate"]', '75');
    await page.fill('input[name="sessionPackageRate"]', '350');
    
    await page.click('button:has-text("Setup Payment")');
    
    // Step 6: Calendar integration
    await expect(page.locator('text=Calendar Integration')).toBeVisible();
    
    // Connect Google Calendar (mock)
    await page.click('button:has-text("Connect Google Calendar")');
    
    // Mock OAuth flow
    await page.waitForURL('**/auth/google/calendar**');
    await page.click('button:has-text("Allow Access")');
    
    // Return to onboarding
    await page.waitForURL('**/coach/onboarding');
    await expect(page.locator('text=Calendar connected successfully')).toBeVisible();
    
    // Set availability
    await page.check('input[name="monday"]');
    await page.check('input[name="wednesday"]');
    await page.check('input[name="friday"]');
    
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '17:00');
    
    await page.click('button:has-text("Save Availability")');
    
    // Step 7: Complete onboarding
    await page.click('button:has-text("Complete Setup")');
    
    // Verify redirect to coach dashboard
    await page.waitForURL('**/coach/dashboard');
    await expect(page.locator('text=Welcome to your coaching dashboard')).toBeVisible();
    
    // Step 8: Send first client invitation
    await page.click('text=Invite Your First Client');
    
    await page.fill('input[name="clientEmail"]', 'first.client@example.com');
    await page.fill('textarea[name="personalMessage"]', 'Hi! I\'m excited to start our coaching journey together.');
    
    await page.click('button:has-text("Send Invitation")');
    
    // Verify success message
    await expect(page.locator('text=Invitation sent successfully')).toBeVisible();
    
    // Verify coach profile is complete
    await page.goto('/coach/profile');
    await expect(page.locator('text=Sarah Johnson')).toBeVisible();
    await expect(page.locator('text=Certified life coach')).toBeVisible();
    await expect(page.locator('text=$75/hour')).toBeVisible();
  });

  test('Registration form validation', async ({ page }) => {
    await page.click('text=Get Started');
    await page.click('text=Coach Registration');
    
    // Test empty form submission
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    
    // Test invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.locator('input[name="email"]').blur();
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
    
    // Test password strength
    await page.fill('input[name="password"]', '123');
    await page.locator('input[name="password"]').blur();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    
    // Test password confirmation mismatch
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.locator('input[name="confirmPassword"]').blur();
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('Mobile responsiveness during registration', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.click('text=Get Started');
    await page.click('text=Coach Registration');
    
    // Verify mobile-friendly layout
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Check that form fields are properly sized for mobile
    const emailInput = page.locator('input[name="email"]');
    const boundingBox = await emailInput.boundingBox();
    
    // Verify input width is appropriate for mobile (not too wide)
    expect(boundingBox?.width).toBeLessThan(350);
    
    // Test form submission on mobile
    await page.fill('input[name="firstName"]', 'Mobile');
    await page.fill('input[name="lastName"]', 'Coach');
    await page.fill('input[name="email"]', 'mobile.coach@test.com');
    await page.fill('input[name="password"]', 'MobileTest123!');
    await page.fill('input[name="confirmPassword"]', 'MobileTest123!');
    
    await page.check('input[name="acceptTerms"]');
    await page.check('input[name="acceptPrivacy"]');
    
    await page.click('button[type="submit"]');
    
    // Verify mobile success flow
    await expect(page.locator('text=Please check your email')).toBeVisible();
  });

  test('Accessibility during registration', async ({ page }) => {
    await page.click('text=Get Started');
    await page.click('text=Coach Registration');
    
    // Test keyboard navigation
    await page.press('input[name="firstName"]', 'Tab');
    await expect(page.locator('input[name="lastName"]')).toBeFocused();
    
    // Test ARIA labels
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('aria-label', /email/i);
    
    // Test form submission with screen reader announcements
    await page.click('button[type="submit"]');
    
    // Check for ARIA live regions with error announcements
    const errorRegion = page.locator('[aria-live="polite"]');
    await expect(errorRegion).toBeVisible();
  });
}); 