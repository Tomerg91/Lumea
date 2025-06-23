import { test, expect } from '@playwright/test';

test.describe('Subscription Flow', () => {
  test('A new coach can sign up, select a plan, and see their active subscription', async ({ page }) => {
    // Mock the API calls for the subscription flow
    await page.route('**/api/subscriptions/current', async route => {
      // Initially, the user has no subscription
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hasSubscription: false }),
      });
    });

    await page.route('**/api/subscriptions/create', async route => {
      // When the user subscribes, return a success response
      const newSubscription = { id: 'sub-e2e-123', planCode: 'seeker', status: 'active' };
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, subscription: newSubscription }),
      });
    });

    // --- Start of Test Flow ---

    // 1. Navigate to the onboarding page (assuming a route like /onboarding)
    await page.goto('/onboarding');
    await expect(page).toHaveTitle(/Onboarding/);

    // 2. Complete the profile step
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Coach');
    await page.click('button:has-text("Next")'); // or whatever the continue button is

    // 3. Arrive at the subscription step and select a plan
    await expect(page.locator('h2:has-text("Choose Your Plan")')).toBeVisible();
    await page.click('button:has-text("Select Seeker")');

    // 4. Arrive at the checkout form and fill it out
    await expect(page.locator('h2:has-text("Complete Your Seeker Coach Subscription")')).toBeVisible();
    await page.fill('input[name="cardNumber"]', '1234123412341234');
    await page.fill('input[name="holderName"]', 'Test Coach');
    await page.fill('input[name="holderId"]', '123456789');
    // ... fill other payment fields

    // Mock the refetch after creation to show the new subscription
    await page.route('**/api/subscriptions/current', async route => {
        const newSubscription = { id: 'sub-e2e-123', planCode: 'seeker', status: 'active' };
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ hasSubscription: true, subscription: newSubscription }),
        });
    }, { times: 1 }); // Intercept only the next call

    // 5. Submit the payment form
    await page.click('button:has-text("Pay")');

    // 6. Complete the final onboarding steps
    // (Add clicks for any remaining "Next" buttons)
    await page.click('button:has-text("Finish Onboarding")');

    // 7. Navigate to the billing page and verify the subscription
    await page.goto('/settings/billing');
    await expect(page.locator('h2:has-text("Seeker Coach Plan")')).toBeVisible();
    await expect(page.locator('text="Active"')).toBeVisible();
  });
}); 