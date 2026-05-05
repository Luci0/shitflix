import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import * as fs from 'fs';

const MOCK_DATA_PATH = '/home/luci0/IdeaProjects/shitflix/tests/mock_fileslist_response.json';

function convertMockToHtml(jsonData: any) {
  return jsonData.map((item: any) => `
    <div class="search-result-item">
        <div class="movie-name">${item.name}</div >
        <div class="movie-info">
            Size: ${item.sizeInGb.toFixed(2)} GB | Seeders: ${item.seeders}
        </div >
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
        </div >
    </div >
  `).join('');
}

test.describe('Feature: Suggestion Chips from LocalStorage', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);

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

    // Mock other necessary APIs to prevent errors during interaction
    await page.route('**/get-wishlist', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/get-banlist', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/add-wishlist-item', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.route('**/delete-wishlist-item', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.route('**/add-banlist-item', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.route('**/delete-banlist-item', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await page.route('**/download-torrent*', async (route) => {
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<div id="download-result-container">Download started!</div' });
    });

    await dashboard.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      // Ensure directory exists or just let playwright handle it if configured
      // For this task, I'll just try to take the screenshot.
      await page.screenshot({ path: `test-results/${testInfo.title}.png` });
    }
  });

  test('should show suggestion chips from localstorage when downloading', async ({ page }) => {
    // Arrange: Setup localStorage with mappings
    const mappings = {
        'The.Matrix.Generation.2023.1080p.HMAX.WEB-DL.DD2.0.x264-Bart': '/downloads/movies/matrix_gen',
        'The.Matrix.Revolutions.2003.720p.BluRay.DD5.1.x264-CtrlHD': '/downloads/movies/matrix_rev'
    };
    await page.evaluate((data) => {
      localStorage.setItem('download_locations', JSON.stringify(data));
    }, mappings);

    // Act: Search and click download on a specific movie from mock data
    await dashboard.search('The Matrix');

    // Act: Click download button on the first result
    await dashboard.downloadFirstResult();

    // Assert: Check if suggestion chips are visible and have correct text
    const chipLocator = page.locator('.suggestion-chip');
    await expect(chipLocator).toHaveCount(2);
    
    // Verify one of the chips matches
    await expect(chipLocator.first()).toHaveText('/downloads/movies/matrix_gen');
  });

  test('should fill the input field when a suggestion chip is clicked', async ({ page }) => {
    // Arrange: Setup localStorage
    const location = '/downloads/movies/matrix-special';
    const mappings = {
        'The.Matrix.Generation.2023.1080p.HMAX.WEB-DL.DD2.0.x264-Bart': location
    };
    await page.evaluate((data) => {
      localStorage.setItem('download_locations', JSON.stringify(data));
    }, mappings);

    // Act: Open download modal
    await dashboard.search('The Matrix');
    await dashboard.downloadFirstResult();

    // Act: Click the chip
    const chip = page.locator('.suggestion-chip').first();
    await chip.click();

    // Assert: The input field should be filled with the location
    await expect(dashboard.downloadLocation).toHaveValue(location);
  });

  test('should save new mapping to localstorage on confirm download', async ({ page }) => {
    // Arrange: Clear localStorage
    await page.evaluate(() => {
      localStorage.removeItem('download_locations');
    });

    const movieName = 'The.Matrix.Generation.2023.1080p.HMAX.WEB-DL.DD2.0.x264-Bart';
    const newLocation = '/downloads/new-location-test';

    // Act: Open download modal for the movie
    await dashboard.search('The Matrix');
    await dashboard.downloadFirstResult();

    // Act: Enter location and confirm
    await dashboard.downloadLocation.fill(newLocation);
    await dashboard.downloadConfirmButton.click();

    // Assert: Check that localStorage has been updated
    const savedMappings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('download_locations') || '{}');
    });

    expect(savedMappings[movieName]).toBe(newLocation);
  });

  test('should show no suggestion chips if no matches in localstorage', async ({ page }) => {
    // Arrange: Setup localStorage with irrelevant mappings
    const mappings = {
        'Other.Movie': '/downloads/other'
    };
    await page.evaluate((data) => {
      localStorage.setItem('download_locations', JSON.stringify(data));
    }, mappings);

    // Act: Open download modal for Matrix
    await dashboard.search('The Matrix');
    await dashboard.downloadFirstResult();

    // Assert: #location-suggestions should be empty (no chips)
    const chipLocator = page.locator('.suggestion-chip');
    await expect(chipLocator).toHaveCount(0);
  });
});
