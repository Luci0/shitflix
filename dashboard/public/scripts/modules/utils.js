export function openService(port) {
    const host = window.location.hostname;
    window.open(`http://${host}:${port}`, '_blank');
}

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
