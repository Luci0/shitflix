import { normalizeInput } from './utils.js';
import { state } from './state.js';
import { loadWishlist, deleteWishlistItem, addWishlistItem } from './wishlist.js';
import { loadBanlist, deleteBanlistItem, addBanlistItem } from './banlist.js';
import { showSyncModal, runSync } from './sync.js';
import { handleDownloadClick, handleConfirmDownload, handleCancelDownload, handlePreloaderTimeout } from './download.js';

export function initEventListeners() {
    // --- Event Delegation for Inputs ---
    document.body.addEventListener('input', function (e) {
        const id = e.target.id;
        if (id === 'movie' || id === 'extra' || id === 'codec') {
            normalizeInput(e.target);
        }
    });

    // --- HTMX Request Interception ---
    document.body.addEventListener('htmx:configRequest', function (evt) {
        if (evt.detail.elt.classList.contains('search-btn')) {
            const movie = document.getElementById('movie')?.value.trim();
            const extra = document.getElementById('extra')?.value.trim();
            const codec = document.getElementById('codec')?.value.trim();

            if (!movie) {
                evt.preventDefault();
                const movieInput = document.getElementById('movie');
                movieInput.classList.add('input-error');
                movieInput.focus();
                movieInput.addEventListener('input', function () {
                    movieInput.classList.remove('input-error');
                }, {once: true});
                return;
            }

            evt.detail.parameters.movie = movie;
            evt.detail.parameters.extra = extra;
            evt.detail.parameters.codec = codec;
        }
    });

    // --- Event Delegation for Clicks ---
    document.body.addEventListener('click', function (evt) {
        // Download button
        handleDownloadClick(evt);

        // Confirm download
        handleConfirmDownload(evt);

        // Cancel download
        handleCancelDownload(evt);

        // Wishlist/Banlist/Sync Buttons
        if (evt.target.id === 'wishlist-btn') {
            loadWishlist();
        }
        if (evt.target.id === 'banlist-btn') {
            loadBanlist();
        }
        if (evt.target.id === 'sync-btn') {
            showSyncModal();
        }

        // Modal Close Buttons
        if (evt.target.classList.contains('close-wishlist-btn')) {
            document.getElementById('wishlist-modal').classList.remove('show');
        }
        if (evt.target.classList.contains('close-banlist-btn')) {
            document.getElementById('banlist-modal').classList.remove('show');
        }
        if (evt.target.classList.contains('close-sync-btn')) {
            document.getElementById('sync-modal').classList.remove('show');
        }

        // Delete Wishlist Item
        if (evt.target.classList.contains('delete-wishlist-btn')) {
            const index = evt.target.dataset.index;
            const name = evt.target.dataset.name;
            if (confirm(`Delete "${name.replace(/\./g, ' ')}" from wishlist?`)) {
                deleteWishlistItem(index);
            }
        }

        // Add Wishlist Item
        if (evt.target.id === 'add-wishlist-btn') {
            addWishlistItem();
        }

        // Delete Banlist Item
        if (evt.target.classList.contains('delete-banlist-btn')) {
            const index = evt.target.dataset.index;
            const name = evt.target.dataset.name;
            if (confirm(`Remove "${name.replace(/\./g, ' ')}" from banlist?`)) {
                deleteBanlistItem(index);
            }
        }

        // Add Banlist Item
        if (evt.target.id === 'add-banlist-btn') {
            addBanlistItem();
        }

        // Run Sync
        if (evt.target.id === 'run-sync-btn') {
            runSync();
        }

        // Modal closing by clicking outside
        if (evt.target === document.getElementById('wishlist-modal') || 
            evt.target === document.getElementById('banlist-modal') ||
            evt.target === document.getElementById('sync-modal') ||
            evt.target === document.getElementById('download-modal')) {
            evt.target.classList.remove('show');
            if (evt.target.id === 'download-modal') state.pendingDownload = null;
        }
    });

    // --- Global Listeners ---

    // Keyboard Escape
    document.body.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            ['wishlist-modal', 'banlist-modal', 'sync-modal', 'download-modal'].forEach(id => {
                const modal = document.getElementById(id);
                if (modal && modal.classList.contains('show')) modal.classList.remove('show');
            });
            state.pendingDownload = null;
        }
    });

    // HTMX after-swap events
    document.body.addEventListener('htmx:afterSwap', function (evt) {
        if (evt.detail.target.id === 'search-results-container') {
            const container = document.getElementById('search-results-container');
            if (container && container.innerHTML.trim() !== '') {
                container.scrollIntoView({behavior: 'smooth', block: 'nearest'});
            }
        }
        if (evt.detail.target.id === 'download-result-container' && state.modalShowTime > 0) {
            handlePreloaderTimeout();
        }
    });

    // Touchstart for tooltip
    document.body.addEventListener('touchstart', function (e) {
        if (e.target.classList.contains('movie-name')) {
            const rect = e.target.getBoundingClientRect();
            const tooltip = document.createElement('div');
            tooltip.textContent = e.target.textContent;
            tooltip.className = 'movie-name-tooltip';
            Object.assign(tooltip.style, {
                position: 'absolute', background: '#a855f7', color: '#fff', padding: '8px 16px',
                borderRadius: '6px', zIndex: 9999, maxWidth: '90vw', wordBreak: 'break-word',
                textAlign: 'center', transform: 'translate(-50%, -100%)'
            });
            let left = rect.left + window.scrollX + rect.width / 2;
            let top = rect.top + window.scrollY - 10;
            document.body.appendChild(tooltip);
            const tooltipRect = tooltip.getBoundingClientRect();
            if (tooltipRect.width > window.innerWidth) tooltip.style.width = '90vw';
            if (left - tooltipRect.width / 2 < 0) left = tooltipRect.width / 2 + 8;
            else if (left + tooltipRect.width / 2 > window.innerWidth) left = window.innerWidth - tooltipRect.width / 2 - 8;
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            setTimeout(() => tooltip.remove(), 2500);
        }
    });
}
