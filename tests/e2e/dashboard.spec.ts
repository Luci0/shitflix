import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import * as fs from 'fs';

const MOCK_DATA_PATH = '/home/luci0/IdeaProjects/shitflix/tests/mock_fileslist_response.json';

function convertMockToHtml(jsonData: any) {
  return jsonData.map((item: any) => `
    <div class="search-result-item">
        <div class="movie-name">${item.name}</div>
        <div class="movie-info">
            Size: ${item.sizeInGb.toFixed(2)} GB | Seeders: ${item.seeders}
        </div>
        <div class="result-actions">
            <button class="download-btn" 
                    data-name="${encodeURIComponent(item.name)}" 
                    data-link="${encodeURIComponent(item.download_link)}">
                📥 Download
            </button>
            <button class="wishlist-btn" 
                    data-name="${encodeURIComponent(item.name)}" 
                    data-quality="${item.quality || '1080'}">
                📝 Wishlist
            </button>
            <button class="banlist-btn" 
                    data-name="${encodeURIComponent(item.name)}" 
                    data-quality="${item.quality || '1080'}">
                🚫 Ban
            </button>
        </div>
    </div>
  `).join('');
}

test.describe('Feature: Dashboard E2E', () => {
  let dashboard: DashboardPage;
  let wishlist: any[];
  let banlist: any[];

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    wishlist = [];
    banlist = [];

    // Mock the search results API
    await page.route('**/get-search-results*', async (route) => {
      const mockData = JSON.parse(fs.readFileSync(MOCK_DATA_PATH, 'utf-8'));
      const html = convertMockToHtml(mockData);
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: html,
      });
    });

    // Mock get-wishlist
    await page.route('**/get-wishlist', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wishlist) });
    });

    // Mock add-wishlist-item
    await page.route('**/add-wishlist-item', async (route) => {
        const payload = route.request().postDataJSON();
        const { type, name, quality } = payload;
        wishlist.push({ type, name, quality, dateAdded: new Date().toISOString().split('T')[0] });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    // Mock delete-wishlist-item
    await page.route('**/delete-wishlist-item', async (route) => {
        const payload = route.request().postDataJSON();
        const { index } = payload;
        wishlist.splice(index, 1);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    // Mock get-banlist
    await page.route('**/get-banlist', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(banlist) });
    });

    // Mock add-banlist-item
    await page.route('**/add-banlist-item', async (route) => {
        const payload = route.request().postDataJSON();
        const { type, name, quality } = payload;
        banlist.push({ type, name, quality, dateAdded: new Date().toISOString().split('T')[0] });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    // Mock delete-banlist-item
    await page.route('**/delete-banlist-item', async (route) => {
        const payload = route.request().postDataJSON();
        const { index } = payload;
        banlist.splice(index, 1);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/download-torrent*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<div id="download-result-container">Download started!</div>' });
    });

    await dashboard.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ path: `test-results/${testInfo.title}.png` });
    }
  });

  test('should search and display results', async () => {
    await dashboard.search('Matrix');
    const results = dashboard.searchResults.locator('.search-result-item');
    await expect(results).toHaveCount(36);
  });

  test('should perform download flow', async () => {
    await dashboard.search('Matrix');
    await dashboard.downloadFirstResult();
    await expect(dashboard.downloadModal).toBeVisible();
    await dashboard.confirmDownload('/downloads/test');
    await expect(dashboard.preloaderModal).toBeVisible();
  });

  test('should manage wishlist CRUD', async () => {
    const movieName = 'The.Matrix.1999';
    await dashboard.addWishlistItem(movieName, 'm', '1080');
    
    // Verify it's in the wishlist
    await expect(dashboard.wishlistContent.locator('tr', { hasText: movieName })).toBeVisible();
    
    // Delete it
    await dashboard.deleteWishlistItem(movieName);
    await expect(dashboard.wishlistContent.locator('tr', { hasText: movieName })).not.toBeVisible();
  });

  test('should manage banlist CRUD', async () => {
    const movieName = 'The.Matrix.Ban';
    await dashboard.addBanlistItem(movieName, 'm', '720');
    
    // Verify it's in the banlist
    await expect(dashboard.banlistContent.locator('tr', { hasText: movieName })).toBeVisible();
    
    // Delete it
    await dashboard.deleteBanlistItem(movieName);
    await expect(dashboard.banlistContent.locator('tr', { hasText: movieName })).not.toBeVisible();
  });

  test('should have functional service buttons', async () => {
    await expect(dashboard.jellyfinButton).toBeVisible();
    await expect(dashboard.transmissionButton).toBeVisible();
    
    await dashboard.jellyfinButton.click();
    await dashboard.transmissionButton.click();
  });
});
