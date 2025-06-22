import { test, expect } from '@playwright/test';

/**
 * Payment Processing E2E Tests
 * Week 2 - Technical Excellence: Critical User Journey
 * 
 * Tests payment flows:
 * 1. Coach payment setup (Stripe Connect)
 * 2. Client payment method setup
 * 3. Session payment processing
 * 4. Invoice generation
 * 5. Refund processing
 */

test.describe('Payment Processing Flow', () => {
  test.describe('Coach Payment Setup', () => {
    test.beforeEach(async ({ page }) => {
      // Login as new coach
      await page.goto('/login');
      await page.fill('input[type="email"]', 'newcoach@testcoach.com');
      await page.fill('input[type="password"]', 'NewCoachPassword123!');
      await page.click('button[type="submit"]');
    });

    test('Complete Stripe Connect onboarding', async ({ page }) => {
      // Navigate to payment setup
      await page.goto('/coach/payment-setup');
      
      // Start Stripe Connect flow
      await page.click('button:has-text("Setup Payment Processing")');
      
      // Mock Stripe Connect OAuth flow
      await page.waitForURL('**/connect.stripe.com/**');
      
      // Fill Stripe Connect form (mocked)
      await page.fill('input[name="business_name"]', 'Sarah Johnson Coaching');
      await page.selectOption('select[name="business_type"]', 'individual');
      await page.fill('input[name="first_name"]', 'Sarah');
      await page.fill('input[name="last_name"]', 'Johnson');
      
      // Business details
      await page.fill('input[name="address_line1"]', '123 Coaching St');
      await page.fill('input[name="address_city"]', 'San Francisco');
      await page.selectOption('select[name="address_state"]', 'CA');
      await page.fill('input[name="address_postal_code"]', '94102');
      
      // Tax information
      await page.fill('input[name="ssn_last_4"]', '1234');
      await page.fill('input[name="dob_month"]', '05');
      await page.fill('input[name="dob_day"]', '15');
      await page.fill('input[name="dob_year"]', '1985');
      
      // Bank account
      await page.fill('input[name="routing_number"]', '110000000');
      await page.fill('input[name="account_number"]', '000123456789');
      
      await page.click('button:has-text("Complete Setup")');
      
      // Return to application
      await page.waitForURL('**/coach/payment-setup**');
      await expect(page.locator('text=Payment processing activated')).toBeVisible();
      
      // Set coaching rates
      await page.fill('input[name="hourlyRate"]', '85');
      await page.fill('input[name="packageRate4"]', '320');
      await page.fill('input[name="packageRate8"]', '600');
      
      // Payment policies
      await page.selectOption('select[name="cancellationPolicy"]', '24-hours');
      await page.check('input[name="requirePaymentUpfront"]');
      
      await page.click('button:has-text("Save Rates")');
      
      // Verify setup complete
      await expect(page.locator('text=Payment setup complete')).toBeVisible();
      await expect(page.locator('text=$85/hour')).toBeVisible();
    });
  });

  test.describe('Client Payment Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login as client
      await page.goto('/login');
      await page.fill('input[type="email"]', 'client@testclient.com');
      await page.fill('input[type="password"]', 'ClientPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/client/dashboard');
    });

    test('Add payment method and book paid session', async ({ page }) => {
      // Navigate to payment methods
      await page.goto('/client/payment-methods');
      
      // Add credit card
      await page.click('button:has-text("Add Payment Method")');
      
      // Fill Stripe payment form (in iframe)
      const stripeFrame = page.frameLocator('iframe[name="__privateStripeFrame"]');
      await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('input[name="exp-date"]').fill('1225');
      await stripeFrame.locator('input[name="cvc"]').fill('123');
      
      // Billing information
      await page.fill('input[name="billingName"]', 'Alex Chen');
      await page.fill('input[name="billingAddress"]', '456 Client Ave');
      await page.fill('input[name="billingCity"]', 'New York');
      await page.selectOption('select[name="billingState"]', 'NY');
      await page.fill('input[name="billingZip"]', '10001');
      
      await page.click('button:has-text("Save Payment Method")');
      
      // Verify payment method added
      await expect(page.locator('text=•••• •••• •••• 4242')).toBeVisible();
      await expect(page.locator('text=Payment method added successfully')).toBeVisible();
      
      // Book a paid session
      await page.goto('/client/book-session');
      
      // Select coach and time
      await page.click('.coach-card:has-text("Sarah Johnson")');
      await page.click('.calendar-slot[data-date="2024-02-20"][data-time="10:00"]');
      
      // Choose session package
      await page.click('.package-option[data-package="single"]');
      
      // Verify pricing
      await expect(page.locator('text=$85.00')).toBeVisible();
      await expect(page.locator('text=Platform fee: $5.00')).toBeVisible();
      await expect(page.locator('text=Total: $90.00')).toBeVisible();
      
      // Select payment method
      await page.selectOption('select[name="paymentMethod"]', '•••• 4242');
      
      // Apply discount code (if available)
      await page.fill('input[name="discountCode"]', 'FIRST10');
      await page.click('button:has-text("Apply")');
      await expect(page.locator('text=Discount applied: -$9.00')).toBeVisible();
      await expect(page.locator('text=Total: $81.00')).toBeVisible();
      
      await page.click('button:has-text("Book & Pay")');
      
      // Verify payment processing
      await expect(page.locator('text=Processing payment...')).toBeVisible();
      await expect(page.locator('text=Session booked successfully')).toBeVisible();
      await expect(page.locator('text=Payment confirmed')).toBeVisible();
      
      // Verify receipt
      await expect(page.locator('text=Receipt #')).toBeVisible();
      await expect(page.locator('text=Session with Sarah Johnson')).toBeVisible();
      await expect(page.locator('text=$81.00')).toBeVisible();
    });

    test('Session package purchase', async ({ page }) => {
      await page.goto('/client/packages');
      
      // Select 4-session package
      await page.click('.package-card[data-package="4-sessions"]');
      
      // Verify package details
      await expect(page.locator('text=4 Sessions with Sarah Johnson')).toBeVisible();
      await expect(page.locator('text=$320.00')).toBeVisible();
      await expect(page.locator('text=Save $20 vs individual sessions')).toBeVisible();
      
      // Purchase package
      await page.selectOption('select[name="paymentMethod"]', '•••• 4242');
      await page.click('button:has-text("Purchase Package")');
      
      // Confirm purchase
      await page.click('button:has-text("Confirm Purchase")');
      
      // Verify package purchased
      await expect(page.locator('text=Package purchased successfully')).toBeVisible();
      await expect(page.locator('text=4 sessions remaining')).toBeVisible();
      
      // Book session using package credit
      await page.goto('/client/book-session');
      await page.click('.coach-card:has-text("Sarah Johnson")');
      await page.click('.calendar-slot[data-date="2024-02-22"][data-time="14:00"]');
      
      // Verify package credit option
      await expect(page.locator('text=Use package credit')).toBeVisible();
      await page.click('input[name="usePackageCredit"]');
      
      await expect(page.locator('text=No additional charge')).toBeVisible();
      await page.click('button:has-text("Book Session")');
      
      // Verify package credit used
      await expect(page.locator('text=3 sessions remaining')).toBeVisible();
    });
  });

  test.describe('Invoice and Billing', () => {
    test.beforeEach(async ({ page }) => {
      // Login as coach
      await page.goto('/login');
      await page.fill('input[type="email"]', 'coach@testcoach.com');
      await page.fill('input[type="password"]', 'CoachPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/coach/dashboard');
    });

    test('Generate and manage invoices', async ({ page }) => {
      await page.goto('/coach/billing');
      
      // Create manual invoice
      await page.click('button:has-text("Create Invoice")');
      
      // Fill invoice details
      await page.selectOption('select[name="clientId"]', 'Alex Chen');
      await page.fill('input[name="description"]', 'Coaching consultation - February 2024');
      await page.fill('input[name="amount"]', '150');
      await page.fill('input[name="dueDate"]', '2024-03-01');
      
      // Add line items
      await page.click('button:has-text("Add Line Item")');
      await page.fill('input[name="lineItems[0].description"]', 'Initial assessment session');
      await page.fill('input[name="lineItems[0].amount"]', '100');
      
      await page.click('button:has-text("Add Line Item")');
      await page.fill('input[name="lineItems[1].description"]', 'Follow-up consultation');
      await page.fill('input[name="lineItems[1].amount"]', '50');
      
      await page.click('button:has-text("Create Invoice")');
      
      // Verify invoice created
      await expect(page.locator('text=Invoice created successfully')).toBeVisible();
      await expect(page.locator('text=Invoice #INV-001')).toBeVisible();
      
      // Send invoice to client
      await page.click('button:has-text("Send Invoice")');
      await expect(page.locator('text=Invoice sent to client')).toBeVisible();
      
      // Track invoice status
      await expect(page.locator('.invoice-status:has-text("Sent")')).toBeVisible();
    });

    test('Payment dashboard and analytics', async ({ page }) => {
      await page.goto('/coach/payments');
      
      // View payment analytics
      await expect(page.locator('text=Total Earnings: $1,250.00')).toBeVisible();
      await expect(page.locator('text=This Month: $340.00')).toBeVisible();
      await expect(page.locator('text=Pending: $85.00')).toBeVisible();
      
      // Filter payments
      await page.selectOption('select[name="timeRange"]', 'last-30-days');
      await page.selectOption('select[name="status"]', 'completed');
      await page.click('button:has-text("Apply Filters")');
      
             // Verify filtered results
       const paymentItems = page.locator('.payment-item');
       await expect(paymentItems).toHaveCount(await paymentItems.count());
      
      // Export payment data
      await page.click('button:has-text("Export")');
      await page.selectOption('select[name="format"]', 'CSV');
      await page.fill('input[name="startDate"]', '2024-01-01');
      await page.fill('input[name="endDate"]', '2024-02-29');
      
      await page.click('button:has-text("Download Export")');
      await expect(page.locator('text=Export started')).toBeVisible();
    });
  });

  test.describe('Refund Processing', () => {
    test('Process session refund', async ({ page }) => {
      // Login as coach
      await page.goto('/login');
      await page.fill('input[type="email"]', 'coach@testcoach.com');
      await page.fill('input[type="password"]', 'CoachPassword123!');
      await page.click('button[type="submit"]');
      
      await page.goto('/coach/sessions');
      
      // Find paid session to refund
      await page.click('.session-card[data-payment-status="paid"]');
      await page.click('button:has-text("Issue Refund")');
      
      // Select refund type
      await page.selectOption('select[name="refundType"]', 'full');
      await page.fill('textarea[name="refundReason"]', 'Session cancelled due to emergency. Offering full refund as per policy.');
      
      // Confirm refund
      await page.click('button:has-text("Process Refund")');
      await page.click('button:has-text("Confirm Refund")');
      
      // Verify refund processed
      await expect(page.locator('text=Refund processed successfully')).toBeVisible();
      await expect(page.locator('text=Client will receive refund in 5-10 business days')).toBeVisible();
      
      // Verify session status updated
      await expect(page.locator('.session-status:has-text("Refunded")')).toBeVisible();
    });
  });

  test('Payment error handling', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.fill('input[type="email"]', 'client@testclient.com');
    await page.fill('input[type="password"]', 'ClientPassword123!');
    await page.click('button[type="submit"]');
    
    // Try to book session with declining card
    await page.goto('/client/book-session');
    await page.click('.coach-card:has-text("Sarah Johnson")');
    await page.click('.calendar-slot[data-date="2024-02-25"][data-time="10:00"]');
    
    // Add payment method that will be declined
    await page.click('button:has-text("Add Payment Method")');
    
    const stripeFrame = page.frameLocator('iframe[name="__privateStripeFrame"]');
    await stripeFrame.locator('input[name="cardnumber"]').fill('4000000000000002'); // Declining test card
    await stripeFrame.locator('input[name="exp-date"]').fill('1225');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    
    await page.fill('input[name="billingName"]', 'Test Decline');
    await page.click('button:has-text("Save Payment Method")');
    
    // Attempt payment
    await page.selectOption('select[name="paymentMethod"]', '•••• 0002');
    await page.click('button:has-text("Book & Pay")');
    
    // Verify error handling
    await expect(page.locator('text=Payment declined')).toBeVisible();
    await expect(page.locator('text=Please try a different payment method')).toBeVisible();
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    
    // Test retry with different card
    await page.click('button:has-text("Try Again")');
    await page.selectOption('select[name="paymentMethod"]', '•••• 4242'); // Working test card
    await page.click('button:has-text("Book & Pay")');
    
    // Verify successful retry
    await expect(page.locator('text=Session booked successfully')).toBeVisible();
  });
}); 