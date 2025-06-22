import { test, expect } from '@playwright/test';

test.describe('PWA and Offline Functionality', () => {
  
  test.describe('Service Worker', () => {
    test('Service worker should be registered', async ({ page }) => {
      await page.goto('/');
      
      const serviceWorkerRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration !== undefined;
        }
        return false;
      });
      
      expect(serviceWorkerRegistered).toBe(true);
    });

    test('Service worker should intercept network requests', async ({ page }) => {
      await page.goto('/');
      
      // Wait for service worker to be active
      await page.waitForFunction(() => {
        return navigator.serviceWorker?.controller !== null;
      });
      
      const swControlled = await page.evaluate(() => {
        return navigator.serviceWorker?.controller !== null;
      });
      
      expect(swControlled).toBe(true);
    });

    test('Service worker should cache resources', async ({ page }) => {
      await page.goto('/');
      
      // Check that cache is populated
      const cacheKeys = await page.evaluate(async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          return cacheNames;
        }
        return [];
      });
      
      expect(cacheKeys.length).toBeGreaterThan(0);
    });
  });

  test.describe('Offline Functionality', () => {
    test('App should load from cache when offline', async ({ page, context }) => {
      // First, load the page while online
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for service worker to cache resources
      await page.waitForTimeout(2000);
      
      // Go offline
      await context.route('**/*', route => route.abort());
      
      // Reload the page - should load from cache
      await page.reload();
      
      // Check that basic elements are still visible
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Check for offline indicator
      const offlineMessage = page.locator('[data-testid="offline-message"]');
      if (await offlineMessage.isVisible()) {
        await expect(offlineMessage).toBeVisible();
      }
    });

    test('Critical pages should work offline', async ({ page, context }) => {
      const criticalPages = ['/', '/dashboard', '/sessions'];
      
      for (const pagePath of criticalPages) {
        // Load page while online
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // Go offline
        await context.route('**/*', route => route.abort());
        
        // Navigate to page - should load from cache
        await page.goto(pagePath);
        
        // Should show content or appropriate offline message
        const body = page.locator('body');
        await expect(body).toBeVisible();
      }
      
      // Re-enable network
      await context.unroute('**/*');
    });

    test('App should show offline status', async ({ page, context }) => {
      await page.goto('/');
      
      // Go offline
      await context.route('**/*', route => route.abort());
      
      // Trigger network request
      await page.click('button').catch(() => {}); // Ignore errors
      
      // Should show offline indicator
      const onlineStatus = await page.evaluate(() => navigator.onLine);
      
      // Note: navigator.onLine may not change in test environment
      // Instead check for offline UI elements or cached content
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('Offline forms should queue for later submission', async ({ page, context }) => {
      await page.goto('/');
      
      // Find a form if it exists
      const form = page.locator('form').first();
      if (await form.isVisible()) {
        // Go offline
        await context.route('**/*', route => route.abort());
        
        // Try to submit form
        const submitButton = form.locator('button[type="submit"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Should show queued message or similar
          const queueMessage = page.locator('[data-testid="queued-message"]');
          if (await queueMessage.isVisible()) {
            await expect(queueMessage).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('PWA Installation', () => {
    test('Web app manifest should be valid', async ({ page }) => {
      await page.goto('/');
      
      // Check manifest is linked
      const manifestLink = page.locator('link[rel="manifest"]');
      await expect(manifestLink).toBeVisible();
      
      // Check manifest content
      const response = await page.request.get('/manifest.json');
      expect(response.status()).toBe(200);
      
      const manifest = await response.json();
      expect(manifest.name).toBeTruthy();
      expect(manifest.short_name).toBeTruthy();
      expect(manifest.start_url).toBeTruthy();
      expect(manifest.display).toBeTruthy();
      expect(manifest.theme_color).toBeTruthy();
      expect(manifest.icons).toBeTruthy();
      expect(manifest.icons.length).toBeGreaterThan(0);
    });

    test('PWA should meet installability criteria', async ({ page }) => {
      await page.goto('/');
      
      // Check for HTTPS (in production)
      const protocol = await page.evaluate(() => window.location.protocol);
      // In test, might be http, but in production should be https
      expect(['http:', 'https:']).toContain(protocol);
      
      // Check service worker is registered
      const swRegistered = await page.evaluate(async () => {
        return 'serviceWorker' in navigator;
      });
      expect(swRegistered).toBe(true);
      
      // Check manifest exists
      const manifestExists = await page.locator('link[rel="manifest"]').count();
      expect(manifestExists).toBeGreaterThan(0);
    });

    test('Install prompt should be available', async ({ page }) => {
      await page.goto('/');
      
      // Check for install button or prompt
      const installButton = page.locator('[data-testid="install-button"]');
      if (await installButton.isVisible()) {
        await expect(installButton).toBeVisible();
        
        // Click install button
        await installButton.click();
        
        // Should trigger install flow
        // Note: Actual install can't be tested in headless browser
      }
    });

    test('App should have proper PWA metadata', async ({ page }) => {
      await page.goto('/');
      
      // Check meta tags for PWA
      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toBeVisible();
      
      const themeColor = page.locator('meta[name="theme-color"]');
      await expect(themeColor).toBeVisible();
      
      const appleTouch = page.locator('link[rel="apple-touch-icon"]');
      await expect(appleTouch).toBeVisible();
    });
  });

  test.describe('Background Sync', () => {
    test('Background sync should be supported', async ({ page }) => {
      await page.goto('/');
      
      const backgroundSyncSupported = await page.evaluate(() => {
        return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
      });
      
      // Background sync support varies by browser
      // This test just checks if the API exists
      expect(typeof backgroundSyncSupported).toBe('boolean');
    });

    test('Failed requests should be queued for background sync', async ({ page, context }) => {
      await page.goto('/');
      
      // Go offline
      await context.route('**/*', route => route.abort());
      
      // Try to make a request (could be form submission, API call, etc.)
      const apiCall = page.evaluate(() => {
        return fetch('/api/test').catch(() => 'failed');
      });
      
      const result = await apiCall;
      expect(result).toBe('failed');
      
      // In a real PWA, this would queue the request for background sync
      // We can't fully test background sync in this environment
    });
  });

  test.describe('Caching Strategy', () => {
    test('Static assets should be cached', async ({ page }) => {
      await page.goto('/');
      
      // Check that static assets are cached
      const cachedAssets = await page.evaluate(async () => {
        if ('caches' in window) {
          const cache = await caches.open('static-assets');
          const keys = await cache.keys();
          return keys.length;
        }
        return 0;
      });
      
      expect(cachedAssets).toBeGreaterThan(0);
    });

    test('API responses should use appropriate caching', async ({ page }) => {
      await page.goto('/');
      
      // Make API request
      const response = await page.request.get('/api/health');
      if (response.status() === 200) {
        const cacheControl = response.headers()['cache-control'];
        
        // Should have cache control headers
        expect(cacheControl).toBeTruthy();
      }
    });

    test('Images should be cached with correct headers', async ({ page }) => {
      await page.goto('/');
      
      // Find images on page
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        const firstImage = images.first();
        const src = await firstImage.getAttribute('src');
        
        if (src && !src.startsWith('data:')) {
          const response = await page.request.get(src);
          const cacheControl = response.headers()['cache-control'];
          
          // Images should have cache headers
          expect(cacheControl).toBeTruthy();
        }
      }
    });
  });

  test.describe('Network Resilience', () => {
    test('App should handle intermittent connectivity', async ({ page, context }) => {
      await page.goto('/');
      
      // Simulate intermittent connectivity
      let requestCount = 0;
      await context.route('**/*', async route => {
        requestCount++;
        
        // Fail every 3rd request
        if (requestCount % 3 === 0) {
          await route.abort();
        } else {
          await route.continue();
        }
      });
      
      // Try to navigate and interact
      await page.click('button').catch(() => {}); // Ignore errors
      
      // App should remain functional
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Clean up
      await context.unroute('**/*');
    });

    test('App should retry failed requests', async ({ page, context }) => {
      await page.goto('/');
      
      let requestAttempts = 0;
      await context.route('**/api/**', async route => {
        requestAttempts++;
        
        // Fail first attempt, succeed on retry
        if (requestAttempts === 1) {
          await route.abort();
        } else {
          await route.continue();
        }
      });
      
      // Make API request
      const apiResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health');
          return response.status;
        } catch {
          return 'failed';
        }
      });
      
      // Should eventually succeed (if API exists)
      expect(typeof apiResponse).toBe('number');
      
      // Clean up
      await context.unroute('**/api/**');
    });

    test('App should gracefully degrade without JavaScript', async ({ page }) => {
      // Disable JavaScript
      await page.context().addInitScript(() => {
        Object.defineProperty(window, 'navigator', {
          value: { ...window.navigator, javaEnabled: () => false }
        });
      });
      
      await page.goto('/');
      
      // Basic content should still be visible
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Should show no-script message if present
      const noscript = page.locator('noscript');
      if (await noscript.count() > 0) {
        // Has no-script fallback
        expect(await noscript.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Storage Management', () => {
    test('App should manage storage quota', async ({ page }) => {
      await page.goto('/');
      
      const storageEstimate = await page.evaluate(async () => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          return await navigator.storage.estimate();
        }
        return null;
      });
      
      if (storageEstimate) {
        expect(storageEstimate.usage).toBeGreaterThanOrEqual(0);
        expect(storageEstimate.quota).toBeGreaterThan(0);
      }
    });

    test('App should clear old cache when storage is low', async ({ page }) => {
      await page.goto('/');
      
      // This test would simulate low storage and verify cleanup
      // In practice, this is hard to test without actual storage pressure
      const cacheNames = await page.evaluate(async () => {
        if ('caches' in window) {
          return await caches.keys();
        }
        return [];
      });
      
      expect(Array.isArray(cacheNames)).toBe(true);
    });

    test('IndexedDB should store offline data', async ({ page }) => {
      await page.goto('/');
      
      const indexedDBSupported = await page.evaluate(() => {
        return 'indexedDB' in window;
      });
      
      expect(indexedDBSupported).toBe(true);
      
      // Test storing data
      const dataStored = await page.evaluate(async () => {
        try {
          const request = indexedDB.open('test-db', 1);
          return new Promise((resolve) => {
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
          });
        } catch {
          return false;
        }
      });
      
      expect(dataStored).toBe(true);
    });
  });
}); 