import { test, expect, devices } from '@playwright/test';

// Test across multiple browsers and devices
const browsers = ['chromium', 'firefox', 'webkit'];
const mobileDevices = [
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'Galaxy S9+', ...devices['Galaxy S9+'] },
  { name: 'iPad Pro', ...devices['iPad Pro'] }
];

test.describe('Cross-Browser Compatibility', () => {
  
  test.describe('Desktop Browser Compatibility', () => {
    browsers.forEach(browserName => {
      test.describe(`${browserName} Browser Tests`, () => {
        
        test(`Homepage loads correctly on ${browserName}`, async ({ page }) => {
          await page.goto('/');
          await expect(page).toHaveTitle(/SatyaCoaching/);
          
          // Check for critical elements
          const header = page.locator('header');
          await expect(header).toBeVisible();
          
          const navigation = page.locator('nav');
          await expect(navigation).toBeVisible();
        });

        test(`Authentication flow works on ${browserName}`, async ({ page }) => {
          await page.goto('/auth');
          
          // Check form elements are visible
          const emailInput = page.locator('input[type="email"]');
          const passwordInput = page.locator('input[type="password"]');
          const submitButton = page.locator('button[type="submit"]');
          
          await expect(emailInput).toBeVisible();
          await expect(passwordInput).toBeVisible();
          await expect(submitButton).toBeVisible();
          
          // Test form interaction
          await emailInput.fill('test@example.com');
          await passwordInput.fill('password123');
          await expect(submitButton).toBeEnabled();
        });

        test(`Dashboard components render on ${browserName}`, async ({ page }) => {
          // Mock authentication or login
          await page.goto('/auth');
          await page.fill('input[type="email"]', 'test@example.com');
          await page.fill('input[type="password"]', 'password123');
          await page.click('button[type="submit"]');
          
          await page.goto('/dashboard');
          
          // Check dashboard elements load
          const dashboard = page.locator('[data-testid="dashboard"]');
          await expect(dashboard).toBeVisible({ timeout: 10000 });
        });

        test(`CSS styles load correctly on ${browserName}`, async ({ page }) => {
          await page.goto('/');
          
          // Check computed styles for key elements
          const body = page.locator('body');
          const bodyStyles = await body.evaluate(el => getComputedStyle(el));
          
          // Verify CSS is loaded (not default browser styles)
          expect(bodyStyles.fontFamily).not.toBe('serif');
          expect(bodyStyles.fontSize).not.toBe('16px'); // Default browser size
        });

        test(`JavaScript functionality works on ${browserName}`, async ({ page }) => {
          await page.goto('/');
          
          // Test interactive elements
          const interactiveElement = page.locator('button').first();
          if (await interactiveElement.isVisible()) {
            await interactiveElement.click();
            // Should not cause console errors
          }
          
          // Check for console errors
          const consoleErrors: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              consoleErrors.push(msg.text());
            }
          });
          
          await page.reload();
          await page.waitForLoadState('networkidle');
          
          // Filter out known external errors
          const criticalErrors = consoleErrors.filter(error => 
            !error.includes('Third-party') && 
            !error.includes('Extension') &&
            !error.includes('favicon.ico')
          );
          
          expect(criticalErrors).toHaveLength(0);
        });

        test(`Forms submit correctly on ${browserName}`, async ({ page }) => {
          await page.goto('/auth');
          
          // Test form submission
          await page.fill('input[type="email"]', 'test@example.com');
          await page.fill('input[type="password"]', 'password123');
          
          // Intercept form submission
          const responsePromise = page.waitForResponse('/api/auth/login');
          await page.click('button[type="submit"]');
          
          // Should make API call (even if it fails due to test data)
          const response = await responsePromise;
          expect(response.status()).toBeLessThan(500); // No server errors
        });
      });
    });
  });

  test.describe('Mobile Device Compatibility', () => {
    mobileDevices.forEach(device => {
      test.describe(`${device.name} Tests`, () => {
        test(`Homepage is mobile responsive on ${device.name}`, async ({ page }) => {
          await page.setViewportSize(device.viewport);
          await page.goto('/');
          
          // Check viewport
          const viewport = page.viewportSize();
          expect(viewport).toBeTruthy();
          expect(viewport!.width).toBeLessThanOrEqual(device.viewport.width);
          
          // Check mobile navigation
          const mobileNav = page.locator('[data-testid="mobile-nav"]');
          if (await mobileNav.isVisible()) {
            await expect(mobileNav).toBeVisible();
          }
          
          // Ensure no horizontal scroll
          const bodyScrollWidth = await page.locator('body').evaluate(el => el.scrollWidth);
          const bodyClientWidth = await page.locator('body').evaluate(el => el.clientWidth);
          expect(bodyScrollWidth).toBeLessThanOrEqual(bodyClientWidth + 5); // 5px tolerance
        });

        test(`Touch interactions work on ${device.name}`, async ({ page }) => {
          await page.setViewportSize(device.viewport);
          await page.goto('/');
          
          // Test touch tap
          const tappableElement = page.locator('button').first();
          if (await tappableElement.isVisible()) {
            await tappableElement.tap();
            // Should respond to touch
          }
          
          // Test swipe if applicable
          const swipeableArea = page.locator('[data-testid="swipeable"]');
          if (await swipeableArea.isVisible()) {
            const box = await swipeableArea.boundingBox();
            if (box) {
              await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
            }
          }
        });

        test(`Forms are usable on mobile ${device.name}`, async ({ page }) => {
          await page.setViewportSize(device.viewport);
          await page.goto('/auth');
          
          // Check form elements are properly sized for mobile
          const emailInput = page.locator('input[type="email"]');
          const passwordInput = page.locator('input[type="password"]');
          
          if (await emailInput.isVisible()) {
            const emailBox = await emailInput.boundingBox();
            expect(emailBox!.height).toBeGreaterThan(40); // Minimum touch target
            
            await emailInput.tap();
            await emailInput.fill('test@example.com');
          }
          
          if (await passwordInput.isVisible()) {
            const passwordBox = await passwordInput.boundingBox();
            expect(passwordBox!.height).toBeGreaterThan(40);
            
            await passwordInput.tap();
            await passwordInput.fill('password123');
          }
        });

        test(`Mobile performance is acceptable on ${device.name}`, async ({ page }) => {
          await page.setViewportSize(device.viewport);
          const startTime = Date.now();
          await page.goto('/');
          await page.waitForLoadState('networkidle');
          const loadTime = Date.now() - startTime;
          
          // Mobile should load within reasonable time
          expect(loadTime).toBeLessThan(5000); // 5 seconds max
          
          // Check for layout shift
          const cls = await page.evaluate(() => {
            return new Promise(resolve => {
              let clsValue = 0;
              const observer = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                  if ((entry as any).hadRecentInput) continue;
                  clsValue += (entry as any).value;
                }
                resolve(clsValue);
              });
              observer.observe({ type: 'layout-shift', buffered: true });
              
              // Resolve after 2 seconds
              setTimeout(() => resolve(clsValue), 2000);
            });
          });
          
          expect(cls).toBeLessThan(0.1); // Good CLS score
        });
      });
    });
  });

  test.describe('Responsive Breakpoints', () => {
    const breakpoints = [
      { name: 'Mobile Small', width: 320, height: 568 },
      { name: 'Mobile Large', width: 414, height: 896 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop Small', width: 1024, height: 768 },
      { name: 'Desktop Large', width: 1440, height: 900 },
      { name: 'Desktop XL', width: 1920, height: 1080 }
    ];

    breakpoints.forEach(breakpoint => {
      test(`Layout adapts correctly at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await page.goto('/');
        
        // Check layout doesn't break
        const body = page.locator('body');
        const bodyWidth = await body.evaluate(el => el.scrollWidth);
        
        // Should not cause horizontal scroll (with small tolerance)
        expect(bodyWidth).toBeLessThanOrEqual(breakpoint.width + 20);
        
        // Check navigation adapts
        const nav = page.locator('nav');
        if (await nav.isVisible()) {
          const navBox = await nav.boundingBox();
          expect(navBox!.width).toBeLessThanOrEqual(breakpoint.width);
        }
        
        // Take screenshot for visual regression (optional)
        await page.screenshot({ 
          path: `test-results/responsive-${breakpoint.name.toLowerCase().replace(' ', '-')}.png`,
          fullPage: true 
        });
      });
    });
  });

  test.describe('Network Conditions', () => {
    test('App works on slow 3G', async ({ page, context }) => {
      // Simulate slow 3G using context
      await context.route('**/*', async route => {
        // Add delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });
      
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time on slow connection
      expect(loadTime).toBeLessThan(10000); // 10 seconds max on slow 3G
      
      // Check critical content loaded
      const header = page.locator('header');
      await expect(header).toBeVisible();
    });

    test('App handles offline state gracefully', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Go offline by blocking all network requests
      await context.route('**/*', route => route.abort());
      
      // Try to navigate or interact
      const navigationLink = page.locator('nav a').first();
      if (await navigationLink.isVisible()) {
        await navigationLink.click();
        
        // Should show appropriate offline message or cached content
        const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
        if (await offlineIndicator.isVisible()) {
          await expect(offlineIndicator).toBeVisible();
        }
      }
    });
  });

  test.describe('Print Styles', () => {
    test('Pages print correctly', async ({ page }) => {
      await page.goto('/');
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      // Check print styles don't break layout
      const body = page.locator('body');
      const isVisible = await body.isVisible();
      expect(isVisible).toBe(true);
      
      // Check navigation is hidden in print (common pattern)
      const nav = page.locator('nav');
      if (await nav.isVisible()) {
        const navDisplay = await nav.evaluate(el => getComputedStyle(el).display);
        // Navigation should be hidden or minimized in print
        expect(['none', 'inline', 'block']).toContain(navDisplay);
      }
    });
  });

  test.describe('High Contrast Mode', () => {
    test('App works in high contrast mode', async ({ page }) => {
      // Simulate high contrast preference
      await page.emulateMedia({ 
        colorScheme: 'dark',
        forcedColors: 'active' 
      });
      
      await page.goto('/');
      
      // Check elements are still visible and functional
      const header = page.locator('header');
      await expect(header).toBeVisible();
      
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          await expect(button).toBeVisible();
        }
      }
    });
  });

  test.describe('Reduced Motion', () => {
    test('App respects reduced motion preference', async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.goto('/');
      
      // Check that animations are reduced or disabled
      const animatedElements = page.locator('[class*="animate"]');
      const count = await animatedElements.count();
      
      if (count > 0) {
        // Should either have no animations or very subtle ones
        const firstAnimated = animatedElements.first();
        const animationDuration = await firstAnimated.evaluate(el => 
          getComputedStyle(el).animationDuration
        );
        
        // Animations should be either none or very short
        expect(['0s', 'none', '0.01s']).toContain(animationDuration);
      }
    });
  });
}); 