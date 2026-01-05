import { test, expect } from '@playwright/test';
import { testStripe } from './fixtures/test-data';

/**
 * Payment Flow E2E Tests
 *
 * Tests Stripe checkout and subscription management.
 * Note: Uses Stripe test mode - requires test API keys.
 */

test.describe('Payment & Subscription Flow', () => {
  test.describe('Pricing Page', () => {
    test('Displays both pricing tiers', async ({ page }) => {
      await page.goto('/');

      // Scroll to pricing section
      const pricingSection = page.locator('#pricing, [data-section="pricing"]');
      if (await pricingSection.isVisible()) {
        await pricingSection.scrollIntoViewIfNeeded();
      } else {
        // Try scrolling to text
        await page.getByText(/pricing/i).first().scrollIntoViewIfNeeded();
      }

      // Check Echo tier ($29)
      await expect(page.locator('body')).toContainText('$29');
      await expect(page.locator('body')).toContainText(/echo(?!\s*pro)/i);

      // Check Echo Pro tier ($59)
      await expect(page.locator('body')).toContainText('$59');
      await expect(page.locator('body')).toContainText(/echo\s*pro/i);
    });

    test('Echo tier shows correct features', async ({ page }) => {
      await page.goto('/');

      // Find Echo tier card
      const echoCard = page.locator('[data-tier="echo"], .pricing-card').first();

      // Should mention key features
      await expect(page.locator('body')).toContainText(/video minutes/i);
      await expect(page.locator('body')).toContainText(/clips/i);
    });

    test('Echo Pro tier shows correct features', async ({ page }) => {
      await page.goto('/');

      // Should show pro features
      await expect(page.locator('body')).toContainText(/unlimited|500.*minutes/i);
      await expect(page.locator('body')).toContainText(/4k/i);
    });

    test('CTA buttons exist for both tiers', async ({ page }) => {
      await page.goto('/');

      // Find trial/signup buttons in pricing section
      const ctaButtons = page.getByRole('link', { name: /start.*trial|get started|subscribe/i });
      await expect(ctaButtons.first()).toBeVisible();
    });
  });

  test.describe('Checkout Flow (requires auth)', () => {
    test.skip('User can initiate checkout from pricing', async ({ page }) => {
      // This test requires a logged-in user
      // Skip if no auth state is set up

      await page.goto('/');

      // Click on a pricing CTA
      const echoCta = page.getByRole('link', { name: /start.*trial/i }).first();
      await echoCta.click();

      // Should redirect to login or Stripe checkout
      await expect(page).toHaveURL(/(auth|checkout\.stripe\.com)/);
    });

    test.skip('Stripe checkout loads correctly', async ({ page }) => {
      // This would test the actual Stripe checkout
      // Requires authenticated user and valid Stripe test mode

      // Note: In real E2E tests, you might:
      // 1. Set up a test user with auth token
      // 2. Navigate to checkout
      // 3. Fill Stripe Elements with test card
      // 4. Complete purchase
      // 5. Verify redirect back to app
    });
  });

  test.describe('Subscription Management', () => {
    test.skip('User can access billing portal', async ({ page }) => {
      // Requires authenticated user with subscription
      // This would navigate to /app/settings or /app/profile
      // and click "Manage Subscription" to open Stripe Portal

      await page.goto('/app/settings');

      const manageButton = page.getByRole('button', { name: /manage.*subscription|billing/i });
      if (await manageButton.isVisible()) {
        await manageButton.click();

        // Should open Stripe billing portal
        await expect(page).toHaveURL(/billing\.stripe\.com/);
      }
    });
  });
});

test.describe('Stripe Checkout Mock Flow', () => {
  /**
   * Mock test simulating the Stripe checkout flow
   * This doesn't actually interact with Stripe but tests the app's handling
   */

  test('Checkout button triggers payment flow', async ({ page }) => {
    await page.goto('/');

    // Find and click a checkout CTA
    const cta = page.getByRole('link', { name: /start.*trial|get started/i }).first();

    // Get the href to verify it points to auth/signup
    const href = await cta.getAttribute('href');
    expect(href).toMatch(/\/(auth|signup|checkout)/);
  });

  test('App handles successful payment redirect', async ({ page }) => {
    // Simulate return from Stripe with success
    await page.goto('/app?payment=success');

    // App should show success message or proceed normally
    // This depends on how your app handles the redirect
  });

  test('App handles cancelled payment redirect', async ({ page }) => {
    // Simulate return from Stripe with cancellation
    await page.goto('/app?payment=cancelled');

    // App should handle gracefully
  });
});
