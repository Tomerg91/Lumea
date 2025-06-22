import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page or login if needed
    await page.goto('/');
  });

  test('Homepage should not have accessibility violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Authentication pages should not have accessibility violations', async ({ page }) => {
    await page.goto('/auth');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Dashboard should not have accessibility violations', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.goto('/dashboard');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Forms should have proper labels and keyboard navigation', async ({ page }) => {
    await page.goto('/auth');
    
    // Check form accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Color contrast should meet WCAG standards', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Keyboard navigation should work for interactive elements', async ({ page }) => {
    await page.goto('/');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['keyboard'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['images'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Hebrew RTL support should be accessible', async ({ page }) => {
    // Switch to Hebrew if language selector exists
    await page.goto('/');
    const languageSelector = page.locator('[data-testid="language-selector"]');
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      await page.locator('text="עברית"').click();
    }
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Mobile responsive design should be accessible', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['mobile'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('High contrast mode should be accessible', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Screen reader landmarks should be present', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper landmarks
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['landmarks'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Focus management should work correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test focus trapping in modals if any exist
    const modalTrigger = page.locator('[data-testid="modal-trigger"]').first();
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['keyboard'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });
});

test.describe('Screen Reader Tests', () => {
  test('Page should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check heading structure
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);
    expect(h1Count).toBeLessThanOrEqual(1); // Should have exactly one h1
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['structure'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Interactive elements should have accessible names', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag412'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Form elements should have proper labels', async ({ page }) => {
    await page.goto('/auth');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['forms'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('WCAG 2.1 AA Compliance', () => {
  const criticalPages = [
    '/',
    '/auth',
    '/dashboard',
    '/clients',
    '/sessions',
    '/analytics',
    '/settings'
  ];

  for (const pagePath of criticalPages) {
    test(`${pagePath} should meet WCAG 2.1 AA standards`, async ({ page }) => {
      await page.goto(pagePath);
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
}); 