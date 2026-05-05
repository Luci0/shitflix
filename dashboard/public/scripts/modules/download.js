import { state } from './state.js';

const ARTICLES = ['the', 'a', 'an'];

function renderSuggestions(name) {
    const container = document.getElementById('location-suggestions');
    const input = document.getElementById('download-location');
    if (!container || !input) return;

    container.innerHTML = '';

    const words = name.trim().split(/[.\s]+/).filter(w => /[a-zA-Z0-9]/.test(w));
    if (words.length === 0) return;

    const prefixWords = ARTICLES.includes(words[0].toLowerCase()) 
        ? words.slice(0, 2) 
        : [words[0]];
    const searchPattern = prefixWords.join('.').toLowerCase();

    const mappings = JSON.parse(localStorage.getItem('download_locations') || '{}');
    
    const matches = Object.keys(mappings)
        .filter(key => key.toLowerCase().replace(/[^a-z0-9]/g, '.').startsWith(searchPattern))
        .map(key => mappings[key]);

    // Remove duplicates
    const uniqueMatches = [...new Set(matches)];

    uniqueMatches.forEach(location => {
        const chip = document.createElement('div');
        chip.className = 'suggestion-chip';
        chip.textContent = location;
        chip.onclick = () => {
            input.value = location;
        };
        container.appendChild(chip);
    });
}

function saveLocationMapping(name, location) {
    const mappings = JSON.parse(localStorage.getItem('download_locations') || '{}');
    mappings[name] = location;
    localStorage.setItem('download_locations', JSON.stringify(mappings));
}

export function handleDownloadClick(evt) {
    if (evt.target.classList.contains('download-btn')) {
        evt.preventDefault();
        evt.stopPropagation();
        state.pendingDownload = {
            name: decodeURIComponent(evt.target.dataset.name),
            link: decodeURIComponent(evt.target.dataset.link)
        };
        document.getElementById('download-modal').classList.add('show');
        renderSuggestions(state.pendingDownload.name);
    }
}

export function handleConfirmDownload(evt) {
    if (evt.target.id === 'confirm-download') {
        if (state.pendingDownload) {
            const downloadLocation = document.getElementById('download-location').value;
            saveLocationMapping(state.pendingDownload.name, downloadLocation);
            const downloadUrl = `/download-torrent?name=${encodeURIComponent(state.pendingDownload.name)}&link=${encodeURIComponent(state.pendingDownload.link)}&saveDir=${encodeURIComponent(downloadLocation)}`;
            document.getElementById('download-modal').classList.remove('show');
            document.getElementById('preloader-modal').classList.add('show');
            state.modalShowTime = Date.now();
            htmx.ajax('GET', downloadUrl, {
                target: '#download-result-container',
                swap: 'innerHTML'
            });
        }
    }
}

export function handleCancelDownload(evt) {
    if (evt.target.id === 'cancel-download') {
        document.getElementById('download-modal').classList.remove('show');
        state.pendingDownload = null;
    }
}

export function handlePreloaderTimeout() {
    if (state.modalShowTime > 0) {
        const elapsedTime = Date.now() - state.modalShowTime;
        const remainingTime = Math.max(0, 1500 - elapsedTime);
        setTimeout(() => {
            document.getElementById('preloader-modal').classList.remove('show');
            state.pendingDownload = null;
            state.modalShowTime = 0;
            document.querySelector('.service-buttons').scrollIntoView({behavior: 'smooth', block: 'start'});
        }, remainingTime);
    }
}
