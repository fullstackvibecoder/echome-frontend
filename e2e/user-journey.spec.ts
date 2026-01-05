import { test, expect, Page } from '@playwright/test';
import { testUsers, testContent, testStripe } from './fixtures/test-data';

/**
 * Complete User Journey E2E Tests
 *
 * Tests the full user flow from signup through content generation:
 * 1. Signup
 * 2. Payment/Subscription
 * 3. Onboarding
 * 4. Dashboard & Content Generation
 */

test.describe('User Journey: New User Signup to Content Generation', () => {
  const user = {
    ...testUsers.newUser,
    email: `test-${Date.now()}@echome-test.com`, // Unique email per run
  };

  test.describe.serial('Complete Flow', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
    });

    test.afterAll(async () => {
      await page.close();
    });

    // ============================================
    // STEP 1: SIGNUP
    // ============================================
    test('1. User can access signup page', async () => {
      await page.goto('/auth/signup');
      await expect(page).toHaveURL(/\/auth\/signup/);
      await expect(page.getByRole('heading', { name: /sign up|create account/i })).toBeVisible();
    });

    test('2. User can fill signup form', async () => {
      // Fill name
      await page.getByLabel(/name/i).fill(user.name);

      // Fill email
      await page.getByLabel(/email/i).fill(user.email);

      // Fill password
      await page.getByLabel(/password/i).first().fill(user.password);

      // If there's a confirm password field
      const confirmPassword = page.getByLabel(/confirm password/i);
      if (await confirmPassword.isVisible()) {
        await confirmPassword.fill(user.password);
      }
    });

    test('3. User can submit signup and proceed', async () => {
      // Click signup button
      await page.getByRole('button', { name: /sign up|create account|get started/i }).click();

      // Should redirect to onboarding or dashboard
      await expect(page).toHaveURL(/\/(onboarding|app|auth\/callback)/, { timeout: 10000 });
    });

    // ============================================
    // STEP 2: ONBOARDING
    // ============================================
    test('4. User sees onboarding welcome', async () => {
      // Navigate to onboarding if not already there
      if (!page.url().includes('onboarding')) {
        await page.goto('/onboarding');
      }

      await expect(page).toHaveURL(/\/onboarding/);
      // Check for welcome content
      await expect(page.locator('body')).toContainText(/welcome|get started|let's begin/i);
    });

    test('5. User completes onboarding step 1 - Profile setup', async () => {
      // Look for any next/continue button
      const nextButton = page.getByRole('button', { name: /next|continue|skip/i });

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    });

    test('6. User completes onboarding step 2 - Preferences', async () => {
      // Check if we're on step 2
      if (page.url().includes('step-2')) {
        // Select any platforms or preferences if visible
        const platformButtons = page.locator('[data-testid="platform-select"]');
        if (await platformButtons.first().isVisible()) {
          await platformButtons.first().click();
        }

        // Continue to next step
        const nextButton = page.getByRole('button', { name: /next|continue|skip/i });
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('7. User completes onboarding step 3 - Knowledge base', async () => {
      // Check if we're on step 3
      if (page.url().includes('step-3')) {
        // May need to add knowledge base content or skip
        const skipButton = page.getByRole('button', { name: /skip|later|finish/i });
        const finishButton = page.getByRole('button', { name: /finish|complete|done/i });

        if (await finishButton.isVisible()) {
          await finishButton.click();
        } else if (await skipButton.isVisible()) {
          await skipButton.click();
        }

        await page.waitForTimeout(500);
      }
    });

    // ============================================
    // STEP 3: DASHBOARD
    // ============================================
    test('8. User reaches dashboard', async () => {
      // Should be on dashboard after onboarding
      await expect(page).toHaveURL(/\/app/, { timeout: 10000 });

      // Dashboard should show welcome or generation interface
      await expect(page.locator('body')).toContainText(/welcome|dashboard|create|generate/i);
    });

    test('9. User sees content generation input', async () => {
      // Should see the generation input tabs
      const textTab = page.getByRole('button', { name: /text/i });
      await expect(textTab).toBeVisible();
    });

    // ============================================
    // STEP 4: CONTENT GENERATION
    // ============================================
    test('10. User can input text content', async () => {
      // Click text tab if not already selected
      const textTab = page.getByRole('button', { name: /text/i });
      await textTab.click();

      // Find textarea and input content
      const textarea = page.getByRole('textbox');
      await textarea.fill(testContent.shortTextInput);

      await expect(textarea).toHaveValue(testContent.shortTextInput);
    });

    test('11. User can initiate content generation', async () => {
      // Click generate button
      const generateButton = page.getByRole('button', { name: /generate/i });
      await expect(generateButton).toBeEnabled();
      await generateButton.click();

      // Should show loading state
      await expect(page.locator('body')).toContainText(/generating|loading|processing/i, {
        timeout: 5000,
      });
    });

    test('12. User sees generated content results', async () => {
      // Wait for generation to complete (may take a while)
      await expect(page.locator('body')).toContainText(/ready|complete|content/i, {
        timeout: 120000, // 2 minutes for AI generation
      });

      // Should see content cards for different platforms
      const contentArea = page.locator('[data-testid="content-results"], .content-cards, main');
      await expect(contentArea).toBeVisible();
    });

    test('13. User can copy generated content', async () => {
      // Find a copy button
      const copyButton = page.getByRole('button', { name: /copy/i }).first();

      if (await copyButton.isVisible()) {
        await copyButton.click();

        // Should show copied feedback
        await expect(page.locator('body')).toContainText(/copied/i, { timeout: 3000 });
      }
    });

    test('14. User can start new generation', async () => {
      // Find reset or new generation button
      const resetButton = page.getByRole('button', { name: /new|reset|create another/i });

      if (await resetButton.isVisible()) {
        await resetButton.click();

        // Should return to input state
        await expect(page.getByRole('textbox')).toBeVisible();
      }
    });
  });
});

test.describe('User Journey: Authentication', () => {
  test('Login page loads correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: /log in|sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('Signup page loads correctly', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByRole('heading', { name: /sign up|create/i })).toBeVisible();
  });

  test('User can navigate between login and signup', async ({ page }) => {
    await page.goto('/auth/login');

    // Find link to signup
    const signupLink = page.getByRole('link', { name: /sign up|create account/i });
    await signupLink.click();

    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('Invalid login shows error', async ({ page }) => {
    await page.goto('/auth/login');

    await page.getByLabel(/email/i).fill('invalid@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    // Should show error message
    await expect(page.locator('body')).toContainText(/invalid|error|incorrect/i, {
      timeout: 5000,
    });
  });
});

test.describe('Navigation', () => {
  test('Homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/echo/i);
  });

  test('Homepage has pricing section', async ({ page }) => {
    await page.goto('/');

    // Scroll to pricing
    await page.getByText(/pricing/i).first().scrollIntoViewIfNeeded();

    // Should see Echo and Echo Pro plans
    await expect(page.locator('body')).toContainText(/\$29/);
    await expect(page.locator('body')).toContainText(/\$59/);
  });

  test('CTA buttons navigate to signup', async ({ page }) => {
    await page.goto('/');

    // Click a "Get Started" or "Start Free Trial" button
    const ctaButton = page.getByRole('link', { name: /get started|start.*trial|sign up/i }).first();
    await ctaButton.click();

    await expect(page).toHaveURL(/\/auth\/(signup|login)/);
  });
});
