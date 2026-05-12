import { openService } from './modules/utils.js';
import { initEventListeners } from './modules/ui.js';

/** Attach functions to window for inline onclick handlers */
window.openService = openService;

/** Initialize the application (deferred by module type, DOM ready). */
initEventListeners();
