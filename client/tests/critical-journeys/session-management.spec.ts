import { test, expect } from '@playwright/test';

/**
 * Session Scheduling and Management E2E Tests
 * Week 2 - Technical Excellence: Critical User Journey
 * 
 * Tests session lifecycle:
 * 1. Session scheduling
 * 2. Session rescheduling
 * 3. Session cancellation
 * 4. Session notes management
 * 5. Session history
 */

test.describe('Session Scheduling and Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coach
    await page.goto('/login');
    await page.fill('input[type="email"]', 'coach@testcoach.com');
    await page.fill('input[type="password"]', 'CoachPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/coach/dashboard');
  });

  test('Complete session scheduling workflow', async ({ page }) => {
    // Navigate to sessions page
    await page.click('text=Sessions');
    await page.waitForURL('**/coach/sessions');
    
    // Create new session
    await page.click('button:has-text("Create Session")');
    
    // Fill session form
    await page.selectOption('select[name="clientId"]', { label: 'Alex Chen' });
    await page.fill('input[name="sessionDate"]', '2024-02-15');
    await page.fill('input[name="sessionTime"]', '10:00');
    await page.selectOption('select[name="sessionType"]', 'Video Call');
    await page.selectOption('select[name="duration"]', '60');
    
    // Add session notes
    await page.fill('textarea[name="prepNotes"]', 'Review previous session goals and check progress on time management techniques.');
    
    // Set session agenda
    await page.fill('textarea[name="agenda"]', '1. Review week progress\n2. Discuss new challenges\n3. Set next week goals');
    
    await page.click('button:has-text("Create Session")');
    
    // Verify session created
    await expect(page.locator('text=Session created successfully')).toBeVisible();
    await expect(page.locator('text=Alex Chen')).toBeVisible();
    await expect(page.locator('text=Feb 15, 2024')).toBeVisible();
    
    // Test session editing
    await page.click('button[data-testid="edit-session"]');
    
    // Update session time
    await page.fill('input[name="sessionTime"]', '11:00');
    await page.fill('textarea[name="prepNotes"]', 'Updated: Focus on work-life balance strategies from previous discussion.');
    
    await page.click('button:has-text("Save Changes")');
    
    // Verify update
    await expect(page.locator('text=Session updated successfully')).toBeVisible();
    await expect(page.locator('text=11:00 AM')).toBeVisible();
  });

  test('Session rescheduling workflow', async ({ page }) => {
    await page.goto('/coach/sessions');
    
    // Find upcoming session
    await page.click('button[data-testid="reschedule-session"]');
    
    // Select new date
    await page.click('.calendar-day[data-date="2024-02-16"]');
    await page.click('.time-slot[data-time="14:00"]');
    
    // Add reschedule reason
    await page.fill('textarea[name="rescheduleReason"]', 'Conflict with another appointment. Rescheduling with client approval.');
    
    // Send notification to client
    await page.check('input[name="notifyClient"]');
    
    await page.click('button:has-text("Reschedule Session")');
    
    // Verify rescheduling
    await expect(page.locator('text=Session rescheduled successfully')).toBeVisible();
    await expect(page.locator('text=Client has been notified')).toBeVisible();
    
    // Verify new time appears
    await expect(page.locator('text=Feb 16, 2024')).toBeVisible();
    await expect(page.locator('text=2:00 PM')).toBeVisible();
  });

  test('Session cancellation workflow', async ({ page }) => {
    await page.goto('/coach/sessions');
    
    // Cancel session
    await page.click('button[data-testid="cancel-session"]');
    
    // Select cancellation reason
    await page.selectOption('select[name="cancellationReason"]', 'Coach Illness');
    await page.fill('textarea[name="cancellationNotes"]', 'Unfortunately feeling unwell. Will reschedule as soon as possible.');
    
    // Choose refund policy
    await page.check('input[name="offerRefund"]');
    
    // Notify client
    await page.check('input[name="notifyClient"]');
    
    await page.click('button:has-text("Cancel Session")');
    
    // Confirm cancellation
    await page.click('button:has-text("Confirm Cancellation")');
    
    // Verify cancellation
    await expect(page.locator('text=Session cancelled successfully')).toBeVisible();
    await expect(page.locator('text=Client has been notified')).toBeVisible();
    await expect(page.locator('text=Refund will be processed')).toBeVisible();
    
    // Verify session status updated
    await expect(page.locator('.session-status:has-text("Cancelled")')).toBeVisible();
  });

  test('Session notes and documentation', async ({ page }) => {
    // Navigate to a completed session
    await page.goto('/coach/sessions');
    await page.click('.session-card[data-status="completed"]');
    
    // Add session notes
    await page.click('button:has-text("Add Session Notes")');
    
    // Fill comprehensive notes
    await page.fill('textarea[name="sessionSummary"]', 'Productive session focused on time management strategies. Client showed great progress.');
    
    await page.fill('textarea[name="keyPoints"]', 
      '• Implemented time-blocking successfully\n' +
      '• Reduced work interruptions by 40%\n' +
      '• Improved work-life boundaries'
    );
    
    await page.fill('textarea[name="actionItems"]', 
      '• Continue time-blocking for next 2 weeks\n' +
      '• Practice saying no to non-essential requests\n' +
      '• Schedule daily 15-min planning sessions'
    );
    
    await page.fill('textarea[name="nextSessionFocus"]', 'Review progress on action items and address any new challenges with boundaries.');
    
    // Set client progress rating
    await page.click('.progress-rating[data-rating="4"]');
    
    // Mark homework completion
    await page.check('input[name="homeworkCompleted"]');
    
    await page.click('button:has-text("Save Notes")');
    
    // Verify notes saved
    await expect(page.locator('text=Session notes saved successfully')).toBeVisible();
    
    // Test notes visibility
    await page.reload();
    await expect(page.locator('text=Productive session focused')).toBeVisible();
    await expect(page.locator('text=time-blocking successfully')).toBeVisible();
  });

  test('Session history and analytics', async ({ page }) => {
    await page.goto('/coach/sessions');
    
    // Switch to history view
    await page.click('button:has-text("Session History")');
    
    // Filter by client
    await page.selectOption('select[name="clientFilter"]', 'Alex Chen');
    
    // Filter by date range
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-02-28');
    
    await page.click('button:has-text("Apply Filters")');
    
    // Verify filtered results
    await expect(page.locator('.session-history-item')).toHaveCount(3);
    await expect(page.locator('text=Alex Chen')).toBeVisible();
    
    // View session analytics
    await page.click('button:has-text("Session Analytics")');
    
    // Verify analytics data
    await expect(page.locator('text=Total Sessions: 3')).toBeVisible();
    await expect(page.locator('text=Completion Rate: 100%')).toBeVisible();
    await expect(page.locator('text=Average Rating: 4.7')).toBeVisible();
    
    // Export session data
    await page.click('button:has-text("Export Data")');
    await page.selectOption('select[name="exportFormat"]', 'CSV');
    await page.click('button:has-text("Download")');
    
    // Verify download initiated
    await expect(page.locator('text=Export started')).toBeVisible();
  });

  test('Mobile session management', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/coach/sessions');
    
    // Create session on mobile
    await page.click('button[data-testid="mobile-create-session"]');
    
    // Verify mobile-optimized form
    const sessionForm = page.locator('form[data-testid="mobile-session-form"]');
    await expect(sessionForm).toBeVisible();
    
    // Fill mobile form
    await page.selectOption('select[name="clientId"]', 'Alex Chen');
    await page.fill('input[name="sessionDate"]', '2024-02-20');
    await page.fill('input[name="sessionTime"]', '15:00');
    
    // Test mobile time picker
    await page.click('input[name="sessionTime"]');
    await expect(page.locator('.mobile-time-picker')).toBeVisible();
    
    await page.click('.time-option[data-time="15:00"]');
    
    await page.click('button:has-text("Create")');
    
    // Verify mobile success
    await expect(page.locator('text=Session created')).toBeVisible();
    
    // Test mobile session list
    const sessionList = page.locator('.mobile-session-list');
    await expect(sessionList).toBeVisible();
    
    // Test swipe actions on mobile
    await page.hover('.session-card');
    await page.click('button[data-testid="mobile-session-options"]');
    
    // Verify mobile context menu
    await expect(page.locator('.mobile-session-menu')).toBeVisible();
    await expect(page.locator('text=Edit')).toBeVisible();
    await expect(page.locator('text=Reschedule')).toBeVisible();
    await expect(page.locator('text=Cancel')).toBeVisible();
  });

  test('Accessibility in session management', async ({ page }) => {
    await page.goto('/coach/sessions');
    
    // Test keyboard navigation
    await page.press('body', 'Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test creating session with keyboard only
    await page.press('button:has-text("Create Session")', 'Enter');
    
    // Verify form accessibility
    const clientSelect = page.locator('select[name="clientId"]');
    await expect(clientSelect).toHaveAttribute('aria-label', /client/i);
    
    // Test screen reader compatibility
    const sessionCard = page.locator('.session-card').first();
    await expect(sessionCard).toHaveAttribute('role', 'article');
    await expect(sessionCard).toHaveAttribute('aria-label');
    
    // Test focus management in modals
    await page.click('button:has-text("Create Session")');
    
    // Verify focus is trapped in modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Test escape key closes modal
    await page.press('body', 'Escape');
    await expect(modal).not.toBeVisible();
    
    // Test ARIA live regions for notifications
    await page.click('button:has-text("Create Session")');
    await page.click('button:has-text("Create Session")'); // Submit empty form
    
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toContainText(/required/i);
  });
}); 