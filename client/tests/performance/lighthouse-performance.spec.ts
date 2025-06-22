import { test, expect } from '@playwright/test';
import { devices } from '@playwright/test';

/**
 * Performance Testing Suite
 * Week 2 - Technical Excellence: Performance Optimization
 * 
 * Tests performance metrics:
 * 1. Page load times
 * 2. Bundle size verification
 * 3. Mobile performance
 * 4. Image optimization
 * 5. PWA capabilities
 */

test.describe('Performance Testing', () => {
  test('Page Load Performance', async ({ page }) => {
    const pages = [
      { name: 'Homepage', url: '/' },
      { name: 'Coach Dashboard', url: '/coach/dashboard' },
      { name: 'Sessions Page', url: '/coach/sessions' },
      { name: 'Analytics Page', url: '/coach/analytics' },
    ];

    for (const pageConfig of pages) {
      const startTime = Date.now();
      await page.goto(pageConfig.url);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      console.log(`${pageConfig.name} Load Time: ${loadTime}ms`);
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);

      // Check that critical content is visible
      await expect(page.locator('main, [role="main"], h1')).toBeVisible();
    }
  });

  test('Bundle Size Analysis', async ({ page }) => {
    await page.goto('/coach/dashboard');
    
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      let totalJS = 0;
      let totalCSS = 0;
      let totalImages = 0;
      
      resources.forEach((resource: any) => {
        const size = resource.transferSize || resource.encodedBodySize || 0;
        if (resource.name.includes('.js')) {
          totalJS += size;
        } else if (resource.name.includes('.css')) {
          totalCSS += size;
        } else if (resource.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
          totalImages += size;
        }
      });
      
      return { totalJS, totalCSS, totalImages, total: totalJS + totalCSS + totalImages };
    });

    console.log('Bundle Sizes:', resourceSizes);

    // Performance budgets (based on package.json config)
    expect(resourceSizes.totalJS).toBeLessThan(450 * 1024); // 450KB JS
    expect(resourceSizes.totalCSS).toBeLessThan(50 * 1024);  // 50KB CSS
    expect(resourceSizes.totalImages).toBeLessThan(200 * 1024); // 200KB images
    expect(resourceSizes.total).toBeLessThan(800 * 1024); // 800KB total
  });

  test('Mobile Performance', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    
    const page = await context.newPage();
    
    const startTime = Date.now();
    await page.goto('/coach/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Mobile load time should be reasonable
    expect(loadTime).toBeLessThan(5000);
    
    // Verify mobile-friendly layout
    const viewport = page.viewportSize();
    expect(viewport!.width).toBeLessThan(400);
    
    // Check critical content loads
    await expect(page.locator('h1')).toBeVisible();
    
    await context.close();
  });

  test('Image Optimization', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      
      // All images should have alt text
      if (src && !src.startsWith('data:')) {
        expect(alt).toBeTruthy();
      }
      
      // Check if loading attribute is set for performance
      const loading = await img.getAttribute('loading');
      if (loading) {
        expect(['lazy', 'eager']).toContain(loading);
      }
    }
  });

  test('PWA Capabilities', async ({ page }) => {
    await page.goto('/');
    
    // Check for PWA manifest
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestLink).toBeTruthy();
    
    // Check for theme color
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBeTruthy();
    
    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    
    // Check service worker support
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(hasServiceWorker).toBeTruthy();
  });

  test('Core Web Vitals Simulation', async ({ page }) => {
    await page.goto('/coach/dashboard');
    
    // Measure Time to First Byte (TTFB)
    const navigationTiming = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      return {
        ttfb: navigation.responseStart - navigation.requestStart,
        domReady: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });

    console.log('Navigation Timing:', navigationTiming);

    // TTFB should be under 600ms
    expect(navigationTiming.ttfb).toBeLessThan(600);
    
    // DOM ready should be under 1 second
    expect(navigationTiming.domReady).toBeLessThan(1000);
    
    // Full load should be under 2 seconds
    expect(navigationTiming.loadComplete).toBeLessThan(2000);
  });

  test('Resource Count and Caching', async ({ page }) => {
    await page.goto('/coach/dashboard');
    await page.waitForLoadState('networkidle');
    
    const resourceStats = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      
      return {
        totalRequests: resources.length,
        cacheableResources: resources.filter((r: any) => 
          r.name.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2)$/)
        ).length,
        thirdPartyRequests: resources.filter((r: any) => 
          !r.name.includes(window.location.hostname)
        ).length
      };
    });

    console.log('Resource Statistics:', resourceStats);

    // Should not have too many requests
    expect(resourceStats.totalRequests).toBeLessThan(100);
    
    // Should have cacheable resources
    expect(resourceStats.cacheableResources).toBeGreaterThan(0);
    
    // Third-party requests should be minimal
    expect(resourceStats.thirdPartyRequests).toBeLessThan(10);
  });
}); 