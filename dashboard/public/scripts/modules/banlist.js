import { state } from './state.js';

/**
 * Fetch banlist from server and render the modal table.
 */
export function loadBanlist() {
    fetch('/get-banlist')
        .then(response => response.json())
        .then(data => {
            document.querySelector('.banlist-header h2').innerHTML = `🚫 Media Banlist <span class="list-count">(${data.length})</span>`;
            const banlistContent = document.getElementById('banlist-content');
            if (data.length === 0) {
                banlistContent.innerHTML = '<div class="banlist-empty">No items in banlist</div>';
            } else {
                let tableHtml = `<table class="banlist-table"><thead><tr><th>Type</th><th>Name</th><th>Quality</th><th>Date Added</th><th>Action</th></tr></thead><tbody`;
                data.forEach((item, index) => {
                    tableHtml += `
                        <tr>
                            <td class="banlist-type">${item.type === 'm' ? '🎬 Movie' : '📺 Series'}</td>
                            <td class="banlist-name">${item.name}</td>
                            <td class="banlist-quality">${item.quality}p</td>
                            <td class="banlist-date">${item.dateAdded}</td>
                            <td class="banlist-action"><button class="delete-banlist-btn" data-index="${index}" data-name="${item.name}">🗑️</button></td>
                        </tr>`;
                });
                tableHtml += `</tbody></table>`;
                banlistContent.innerHTML = tableHtml;
            }
            document.getElementById('banlist-modal').classList.add('show');
        });
}

/**
 * Delete a banlist entry by index and reload the list.
 * @param {number|string} index - Line index to delete
 */
export function deleteBanlistItem(index) {
    fetch('/delete-banlist-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({index: parseInt(index)})
    }).then(res => res.json()).then(data => {
        if (data.success) loadBanlist();
        else alert('Error deleting item');
    });
}

/**
 * Add a new item to the banlist from the form inputs.
 */
export function addBanlistItem() {
    const type = document.getElementById('ban-type').value;
    const name = document.getElementById('ban-name').value.replace(/\s+/g, '.');
    const quality = document.getElementById('ban-quality').value;
    if (!name.trim()) return alert('Please enter a movie/series name');

    fetch('/add-banlist-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({type, name, quality})
    }).then(res => res.json()).then(data => {
        if (data.success) {
            document.getElementById('ban-name').value = '';
            document.getElementById('ban-quality').value = '1080';
            loadBanlist();
            setTimeout(() => document.querySelector('#banlist-content').scrollIntoView({behavior: 'smooth', block: 'end'}), 100);
        } else alert(data.message || 'Error adding item');
    });
}
