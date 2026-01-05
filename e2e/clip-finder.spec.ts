import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Clip Finder E2E Tests
 *
 * Tests the video upload and clip extraction flow.
 * Note: Requires authenticated user and backend running.
 */

test.describe('Clip Finder', () => {
  test.describe('Page Access', () => {
    test('Clips page loads correctly', async ({ page }) => {
      await page.goto('/app/clips');

      // Should see page title
      await expect(page.locator('body')).toContainText(/clip.*finder/i);
    });

    test('Shows upload interface', async ({ page }) => {
      await page.goto('/app/clips');

      // Should see upload section
      await expect(page.getByText(/upload|new video/i).first()).toBeVisible();
    });

    test('URL import shows "Coming Soon"', async ({ page }) => {
      await page.goto('/app/clips');

      // URL tab should be disabled with "Soon" badge
      const urlButton = page.getByRole('button', { name: /url/i });
      await expect(urlButton).toBeDisabled();
      await expect(page.locator('body')).toContainText(/soon/i);
    });
  });

  test.describe('Dashboard Integration', () => {
    test('Dashboard has Video tab', async ({ page }) => {
      await page.goto('/app');

      // Should see Video tab in the input type selector
      const videoTab = page.getByRole('button', { name: /video/i });
      await expect(videoTab).toBeVisible();
    });

    test('Video tab shows upload interface', async ({ page }) => {
      await page.goto('/app');

      // Click Video tab
      const videoTab = page.getByRole('button', { name: /video/i });
      await videoTab.click();

      // Should see video upload UI
      await expect(page.locator('body')).toContainText(/upload|select.*video|drag/i);
    });

    test('URL tab is disabled on dashboard', async ({ page }) => {
      await page.goto('/app');

      // URL tab should show "Soon" badge
      const urlTab = page.getByRole('button', { name: /url/i });
      await expect(urlTab).toBeDisabled();
    });
  });

  test.describe('Video Upload Flow', () => {
    test.skip('Can upload a video file', async ({ page }) => {
      // This test requires:
      // 1. A test video file in fixtures
      // 2. Backend running
      // 3. Authenticated user

      await page.goto('/app/clips');

      // Find file input
      const fileInput = page.locator('input[type="file"]');

      // Upload test video
      const testVideoPath = path.join(__dirname, 'fixtures', 'sample-video.mp4');
      await fileInput.setInputFiles(testVideoPath);

      // Should show file selected
      await expect(page.locator('body')).toContainText(/selected|ready/i);
    });

    test.skip('Upload shows progress indicator', async ({ page }) => {
      // Test that upload progress is displayed
      await page.goto('/app/clips');

      // After file selection and upload start
      // Should see progress bar or percentage
      await expect(page.locator('[role="progressbar"], .progress')).toBeVisible();
    });

    test.skip('Processing shows status updates', async ({ page }) => {
      // Test processing status display
      // Should cycle through: transcribing -> analyzing -> extracting -> captioning

      await page.goto('/app/clips');

      // During processing, status should update
      await expect(page.locator('body')).toContainText(
        /transcribing|analyzing|extracting|captioning|processing/i
      );
    });
  });

  test.describe('Clips Display', () => {
    test.skip('Shows extracted clips after processing', async ({ page }) => {
      // After successful processing
      await page.goto('/app/clips');

      // Select a completed upload from the list
      const uploadItem = page.locator('[data-status="completed"]').first();
      if (await uploadItem.isVisible()) {
        await uploadItem.click();

        // Should show clips grid
        await expect(page.locator('.clip-card, [data-testid="clip"]')).toBeVisible();
      }
    });

    test.skip('Clips show virality scores', async ({ page }) => {
      await page.goto('/app/clips');

      // Clips should display virality/engagement scores
      await expect(page.locator('body')).toContainText(/%.*viral|potential/i);
    });

    test.skip('Can copy clip to clipboard', async ({ page }) => {
      await page.goto('/app/clips');

      // Find copy button on a clip
      const copyButton = page.getByRole('button', { name: /copy/i }).first();
      if (await copyButton.isVisible()) {
        await copyButton.click();
        await expect(page.locator('body')).toContainText(/copied/i);
      }
    });
  });

  test.describe('Content Kit Display', () => {
    test.skip('Shows content kit after processing', async ({ page }) => {
      await page.goto('/app/clips');

      // Content kit section should be visible for completed uploads
      await expect(page.locator('body')).toContainText(/content.*kit/i);
    });

    test.skip('Content kit has all platforms', async ({ page }) => {
      await page.goto('/app/clips');

      // Should show content for all platforms
      const platforms = ['linkedin', 'twitter', 'instagram', 'tiktok', 'blog', 'email'];

      for (const platform of platforms) {
        await expect(page.locator('body')).toContainText(new RegExp(platform, 'i'));
      }
    });

    test.skip('Can copy platform content', async ({ page }) => {
      await page.goto('/app/clips');

      // Find platform copy button
      const copyButton = page.locator('[data-platform] button, .platform-card button').first();
      if (await copyButton.isVisible()) {
        await copyButton.click();
        await expect(page.locator('body')).toContainText(/copied/i);
      }
    });
  });
});

test.describe('Clip Finder Navigation', () => {
  test('Sidebar has Clip Finder link', async ({ page }) => {
    await page.goto('/app');

    // Find sidebar navigation
    const sidebar = page.locator('nav, aside, [role="navigation"]');

    // Should have Clip Finder link
    await expect(sidebar.getByText(/clip.*finder/i)).toBeVisible();
  });

  test('Can navigate to clips from sidebar', async ({ page }) => {
    await page.goto('/app');

    // Click Clip Finder in sidebar
    const clipsLink = page.getByRole('link', { name: /clip/i });
    await clipsLink.click();

    await expect(page).toHaveURL(/\/app\/clips/);
  });

  test('Empty state shows guidance', async ({ page }) => {
    await page.goto('/app/clips');

    // If no clips exist, should show helpful message
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state');
    if (await emptyState.isVisible()) {
      await expect(page.locator('body')).toContainText(/upload|dashboard|get started/i);
    }
  });
});
