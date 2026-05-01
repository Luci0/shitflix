import { openService } from './modules/utils.js';
import { initEventListeners } from './modules/ui.js';

// Attach functions to window to support inline onclick handlers
window.openService = openService;

// Initialize the application
// type="module" is deferred by default, so DOM is ready.
initEventListeners();
