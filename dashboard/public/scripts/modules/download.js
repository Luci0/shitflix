import { state } from './state.js';

export function handleDownloadClick(evt) {
    if (evt.target.classList.contains('download-btn')) {
        evt.preventDefault();
        evt.stopPropagation();
        state.pendingDownload = {
            name: decodeURIComponent(evt.target.dataset.name),
            link: decodeURIComponent(evt.target.dataset.link)
        };
        document.getElementById('download-modal').classList.add('show');
    }
}

export function handleConfirmDownload(evt) {
    if (evt.target.id === 'confirm-download') {
        if (state.pendingDownload) {
            const downloadLocation = document.getElementById('download-location').value;
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
