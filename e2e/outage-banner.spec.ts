import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Force /health to fail so the banner logic engages, and control the deploy probe.
async function stubHealth(page: Page) {
  await page.route('**/health', (route) => route.abort());
}

// The banner shows only after the SECOND failed /health check, and checks are
// 30s apart (useBackendHealth poll interval), so allow well past that window —
// the default 30s per-test timeout would kill the test exactly as it appears.
test.describe.configure({ timeout: 120_000 });

test('shows the calm Updating banner when a deploy is in progress', async ({ page }) => {
  await stubHealth(page);
  await page.route('**/api/backend-status', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'deploying' }) }),
  );
  await page.goto('/auth/login');
  await expect(page.getByText('EchoMe is updating — the app will be back in a moment.')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('service disruption')).toHaveCount(0);
});

test('shows the Service disruption banner during a real outage', async ({ page }) => {
  await stubHealth(page);
  await page.route('**/api/backend-status', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'unknown' }) }),
  );
  await page.goto('/auth/login');
  // Unique to the sticky OutageBanner (the login inline notice also says
  // "service disruption", so match the banner's distinct phrasing).
  await expect(
    page.getByText(/generation, scheduling, and sign-in are temporarily unavailable/i),
  ).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('EchoMe is updating', { exact: false })).toHaveCount(0);
});
