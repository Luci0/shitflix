import { state } from './state.js';

/**
 * Fetch wishlist from server and render the modal table.
 */
export function loadWishlist() {
    fetch('/get-wishlist')
        .then(response => response.json())
        .then(data => {
            document.querySelector('.wishlist-header h2').innerHTML = `📝 Movie Wishlist <span class="list-count">(${data.length})</span>`;
            const wishlistContent = document.getElementById('wishlist-content');
            if (data.length === 0) {
                wishlistContent.innerHTML = '<div class="wishlist-empty">No items in wishlist</div>';
            } else {
                let tableHtml = `<table class="wishlist-table"><thead><tr><th>Type</th><th>Name</th><th>Quality</th><th>Date Added</th><th>Action</th></tr></thead><tbody`;
                data.forEach((item, index) => {
                    tableHtml += `
                        <tr>
                            <td class="wishlist-type">${item.type === 'm' ? '🎬 Movie' : '📺 Series'}</td>
                            <td class="wishlist-name">${item.name}</td>
                            <td class="wishlist-quality">${item.quality}p</td>
                            <td class="wishlist-date">${item.dateAdded}</td>
                            <td class="wishlist-action"><button class="delete-wishlist-btn" data-index="${index}" data-name="${item.name}">🗑️</button></td>
                        </tr>`;
                });
                tableHtml += `</tbody></table>`;
                wishlistContent.innerHTML = tableHtml;
            }
            document.getElementById('wishlist-modal').classList.add('show');
        });
}

/**
 * Delete a wishlist entry by index and reload the list.
 * @param {number|string} index - Line index to delete
 */
export function deleteWishlistItem(index) {
    fetch('/delete-wishlist-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({index: parseInt(index)})
    }).then(res => res.json()).then(data => {
        if (data.success) loadWishlist();
        else alert('Error deleting item');
    });
}

/**
 * Add a new item to the wishlist from the form inputs.
 */
export function addWishlistItem() {
    const type = document.getElementById('add-type').value;
    const name = document.getElementById('add-name').value.replace(/\s+/g, '.');
    const quality = document.getElementById('add-quality').value;
    if (!name.trim()) return alert('Please enter a movie/series name');

    fetch('/add-wishlist-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({type, name, quality})
    }).then(res => res.json()).then(data => {
        if (data.success) {
            document.getElementById('add-name').value = '';
            document.getElementById('add-quality').value = '1080';
            loadWishlist();
            setTimeout(() => document.querySelector('#wishlist-content').scrollIntoView({behavior: 'smooth', block: 'end'}), 100);
        } else alert(data.message || 'Error adding item');
    });
}
