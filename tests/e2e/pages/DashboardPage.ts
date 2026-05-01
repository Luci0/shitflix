import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchExtra: Locator;
  readonly searchCodec: Locator;
  readonly searchButton: Locator;
  readonly searchResults: Locator;
  readonly jellyfinButton: Locator;
  readonly transmissionButton: Locator;
  readonly wishlistButton: Locator;
  readonly banlistButton: Locator;
  readonly wishlistModal: Locator;
  readonly wishlistAddType: Locator;
  readonly wishlistAddName: Locator;
  readonly wishlistAddQuality: Locator;
  readonly wishlistAddButton: Locator;
  readonly wishlistContent: Locator;
  readonly banlistModal: Locator;
  readonly banlistAddType: Locator;
  readonly banlistAddName: Locator;
  readonly banlistAddQuality: Locator;
  readonly banlistAddButton: Locator;
  readonly banlistContent: Locator;
  readonly downloadModal: Locator;
  readonly downloadConfirmButton: Locator;
  readonly downloadCancelButton: Locator;
  readonly downloadLocation: Locator;
  readonly preloaderModal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('#movie');
    this.searchExtra = page.locator('#extra');
    this.searchCodec = page.locator('#codec');
    this.searchButton = page.locator('.search-btn');
    this.searchResults = page.locator('#search-results-container');
    this.jellyfinButton = page.locator('.jellyfin-btn');
    this.transmissionButton = page.locator('.transmission-btn');
    this.wishlistButton = page.locator('#wishlist-btn');
    this.banlistButton = page.locator('#banlist-btn');
    this.wishlistModal = page.locator('#wishlist-modal');
    this.wishlistAddType = page.locator('#add-type');
    this.wishlistAddName = page.locator('#add-name');
    this.wishlistAddQuality = page.locator('#add-quality');
    this.wishlistAddButton = page.locator('#add-wishlist-btn');
    this.wishlistContent = page.locator('#wishlist-content');
    this.banlistModal = page.locator('#banlist-modal');
    this.banlistAddType = page.locator('#ban-type');
    this.banlistAddName = page.locator('#ban-name');
    this.banlistAddQuality = page.locator('#ban-quality');
    this.banlistAddButton = page.locator('#add-banlist-btn');
    this.banlistContent = page.locator('#banlist-content');
    this.downloadModal = page.locator('#download-modal');
    this.downloadConfirmButton = page.locator('#confirm-download');
    this.downloadCancelButton = page.locator('#cancel-download');
    this.downloadLocation = page.locator('#download-location');
    this.preloaderModal = page.locator('#preloader-modal');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    await this.wishlistButton.waitFor({ state: 'visible' });
  }

  async search(movie: string, extra = '1080', codec = '') {
    await this.searchInput.fill(movie);
    await this.searchExtra.fill(extra);
    await this.searchCodec.fill(codec);
    await this.searchButton.click();
    await this.page.waitForResponse(resp => resp.url().includes('/get-search-results'));
    await this.searchResults.waitFor({ state: 'visible' });
  }

  async addWishlistItem(name: string, type: 'm' | 's' = 'm', quality = '1080') {
    await this.wishlistButton.click();
    await this.wishlistAddType.selectOption(type);
    await this.wishlistAddName.fill(name);
    await this.wishlistAddQuality.fill(quality);
    
    await Promise.all([
      this.page.waitForResponse(resp => resp.url().includes('/get-wishlist')),
      this.wishlistAddButton.click()
    ]);
  }

  async deleteWishlistItem(name: string) {
    const row = this.wishlistContent.locator('tr', { hasText: name });
    this.page.once('dialog', dialog => dialog.accept());
    await row.locator('.delete-wishlist-btn').click();
    await this.page.waitForResponse(resp => resp.url().includes('/get-wishlist'));
  }

  async addBanlistItem(name: string, type: 'm' | 's' = 'm', quality = '1080') {
    await this.banlistButton.click();
    await this.banlistAddType.selectOption(type);
    await this.banlistAddName.fill(name);
    await this.banlistAddQuality.fill(quality);
    
    await Promise.all([
      this.page.waitForResponse(resp => resp.url().includes('/get-banlist')),
      this.banlistAddButton.click()
    ]);
  }

  async deleteBanlistItem(name: string) {
    const row = this.banlistContent.locator('tr', { hasText: name });
    this.page.once('dialog', dialog => dialog.accept());
    await row.locator('.delete-banlist-btn').click();
    await this.page.waitForResponse(resp => resp.url().includes('/get-banlist'));
  }

  async downloadFirstResult() {
    const firstDownloadBtn = this.searchResults.locator('.download-btn').first();
    await firstDownloadBtn.click();
    await this.downloadModal.waitFor({ state: 'visible' });
  }

  async confirmDownload(location: string) {
    await this.downloadLocation.fill(location);
    await this.downloadConfirmButton.click();
  }
}
