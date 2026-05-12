/**
 * Open a service UI in a new tab.
 * @param {number|string} port - Service port number
 */
export function openService(port) {
    const host = window.location.hostname;
    window.open(`http://${host}:${port}`, '_blank');
}

/**
 * Replace spaces with dots in an input field, preserving cursor position.
 * @param {HTMLInputElement} target - The input element to normalize
 */
export function normalizeInput(target) {
    const cursorPosition = target.selectionStart;
    const originalValue = target.value;
    const newValue = originalValue.replace(/\s+/g, '.');

    if (originalValue !== newValue) {
        target.value = newValue;
        const newCursorPosition = cursorPosition - (originalValue.length - newValue.length);
        target.setSelectionRange(newCursorPosition, newCursorPosition);
    }
}
