/**
 * Load and display the last nightly run report.
 */
export async function loadReport() {
    const modal = document.getElementById('report-modal');
    const loading = document.getElementById('report-loading');
    const content = document.getElementById('report-content');

    modal.classList.add('show');
    loading.style.display = 'block';
    content.style.display = 'none';

    try {
        const response = await fetch('/last-run-report');
        const data = await response.json();

        if (!data.timestamp) {
            content.innerHTML = '<div class="report-empty">No runs recorded yet. The report will appear after the first nightly cron job.</div>';
            loading.style.display = 'none';
            content.style.display = 'block';
            return;
        }

        let html = `<div class="report-timestamp">Run: ${data.timestamp}</div>`;

        // Added section
        html += `<div class="report-section">`;
        html += `<h3 class="report-section-title report-added-title">Added to Wishlist (${data.added.length})</h3>`;
        if (data.added.length > 0) {
            html += '<ul class="report-list">';
            data.added.forEach(item => {
                html += `<li class="report-item report-added-item">+ ${item}</li>`;
            });
            html += '</ul>';
        } else {
            html += '<div class="report-empty-section">No new movies added</div>';
        }
        html += '</div>';

        // Downloaded section
        html += `<div class="report-section">`;
        html += `<h3 class="report-section-title report-downloaded-title">Downloaded (${data.downloaded.length})</h3>`;
        if (data.downloaded.length > 0) {
            html += '<ul class="report-list">';
            data.downloaded.forEach(item => {
                html += `<li class="report-item report-downloaded-item">* ${item}</li>`;
            });
            html += '</ul>';
        } else {
            html += '<div class="report-empty-section">No downloads triggered</div>';
        }
        html += '</div>';

        // Removed section
        html += `<div class="report-section">`;
        html += `<h3 class="report-section-title report-removed-title">Removed - 3 Month Cutoff (${data.removed.length})</h3>`;
        if (data.removed.length > 0) {
            html += '<ul class="report-list">';
            data.removed.forEach(item => {
                html += `<li class="report-item report-removed-item">- ${item}</li>`;
            });
            html += '</ul>';
        } else {
            html += '<div class="report-empty-section">No old entries removed</div>';
        }
        html += '</div>';

        content.innerHTML = html;
        loading.style.display = 'none';
        content.style.display = 'block';
    } catch (error) {
        content.innerHTML = '<div class="report-error">Failed to load report. Is the dashboard running?</div>';
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}
