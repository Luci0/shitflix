import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Feature: Last Run Report', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ path: `test-results/${testInfo.title}.png` });
    }
  });

  test('should display report with run data', async ({ page }) => {
    const mockReport = {
      timestamp: '2025-07-24_02:00:00',
      added: ['The.Matrix.1999.1080p', 'Inception.2010.720p'],
      downloaded: ['The.Matrix.1999.1080p'],
      removed: ['Old.Movie.2020.480p'],
    };

    await page.route('**/last-run-report', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReport),
      });
    });

    await dashboard.openReport();

    await expect(dashboard.reportContent).toBeVisible();
    await expect(dashboard.reportContent.locator('.report-timestamp')).toHaveText('Run: 2025-07-24_02:00:00');

    // Added section
    const addedItems = dashboard.reportContent.locator('.report-added-item');
    await expect(addedItems).toHaveCount(2);
    await expect(addedItems.nth(0)).toHaveText('+ The.Matrix.1999.1080p');
    await expect(addedItems.nth(1)).toHaveText('+ Inception.2010.720p');

    // Downloaded section
    const downloadedItems = dashboard.reportContent.locator('.report-downloaded-item');
    await expect(downloadedItems).toHaveCount(1);
    await expect(downloadedItems.nth(0)).toHaveText('* The.Matrix.1999.1080p');

    // Removed section
    const removedItems = dashboard.reportContent.locator('.report-removed-item');
    await expect(removedItems).toHaveCount(1);
    await expect(removedItems.nth(0)).toHaveText('- Old.Movie.2020.480p');
  });

  test('should show empty state when no runs recorded', async ({ page }) => {
    await page.route('**/last-run-report', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ timestamp: null, added: [], downloaded: [], removed: [] }),
      });
    });

    await dashboard.openReport();

    await expect(dashboard.reportContent).toBeVisible();
    await expect(dashboard.reportContent.locator('.report-empty')).toHaveText(
      'No runs recorded yet. The report will appear after the first nightly cron job.'
    );
  });

  test('should close report modal on close button', async ({ page }) => {
    await page.route('**/last-run-report', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ timestamp: null, added: [], downloaded: [], removed: [] }),
      });
    });

    await dashboard.openReport();
    await expect(dashboard.reportModal).toBeVisible();

    await dashboard.reportModal.locator('.close-report-btn').click();
    await expect(dashboard.reportModal).not.toBeVisible();
  });
});
