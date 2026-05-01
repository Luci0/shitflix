import { state } from './state.js';

export function showSyncModal() {
    const modal = document.getElementById('sync-modal');
    modal.classList.add('show');
    const logsDiv = document.getElementById('sync-logs');

    if (state.isSyncRunning && state.activeEventSource) {
        logsDiv.innerHTML = `
            <div class="sync-running">
                ⏳ Sync in progress...
            </div>
            <pre class="sync-log-content">${state.syncLogsHistory}</pre>
        `;
        const logContent = logsDiv.querySelector('.sync-log-content');
        if (logContent) logContent.scrollTop = logContent.scrollHeight;
    } else if (state.syncLogsHistory) {
        const statusClass = state.syncStatus?.success ? 'sync-success' : 'sync-error';
        const statusIcon = state.syncStatus ? (state.syncStatus.success ? '✅' : '❌') : '';
        const statusMessage = state.syncStatus ? `
            <div class="${statusClass}">
                ${statusIcon} Last sync ${state.syncStatus.success ? 'completed successfully' : 'failed'}${state.syncStatus.exitCode !== undefined ? ` (Exit code: ${state.syncStatus.exitCode})` : ''}
            </div>
        ` : '';
        logsDiv.innerHTML = `${statusMessage}<pre class="sync-log-content">${state.syncLogsHistory}</pre>`;
    }
}

export function runSync() {
    const button = document.getElementById('run-sync-btn');
    const logsDiv = document.getElementById('sync-logs');

    if (state.isSyncRunning && state.activeEventSource) return;

    state.syncLogsHistory = '';
    state.syncStatus = null;
    state.isSyncRunning = true;

    if (state.activeEventSource) {
        state.activeEventSource.close();
        state.activeEventSource = null;
    }

    button.disabled = true;
    button.innerHTML = '⏳ Running...';
    logsDiv.innerHTML = '<div class="sync-loading">Starting sync process...</div>';

    let allLogs = [];
    let hasErrors = false;

    state.activeEventSource = new EventSource('/run-sync-stream');

    state.activeEventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.type === 'log' || data.type === 'error') {
            allLogs.push(data.content);
            if (data.type === 'error') hasErrors = true;
            state.syncLogsHistory = allLogs.join('\n');
            if (document.getElementById('sync-modal').classList.contains('show')) {
                logsDiv.innerHTML = `
                    <div class="sync-running">⏳ Sync in progress...</div>
                    <pre class="sync-log-content">${state.syncLogsHistory}</pre>
                `;
                const logContent = logsDiv.querySelector('.sync-log-content');
                if (logContent) logContent.scrollTop = logContent.scrollHeight;
            }
        } else if (data.type === 'complete') {
            state.activeEventSource.close();
            state.activeEventSource = null;
            state.isSyncRunning = false;
            const success = data.exitCode === 0 && !hasErrors;
            state.syncLogsHistory = allLogs.join('\n') || 'No output';
            state.syncStatus = {success: success, exitCode: data.exitCode};
            const statusClass = success ? 'sync-success' : 'sync-error';
            const statusIcon = success ? '✅' : '❌';
            if (document.getElementById('sync-modal').classList.contains('show')) {
                logsDiv.innerHTML = `
                    <div class="${statusClass}">${statusIcon} Sync ${success ? 'completed successfully' : 'failed'} (Exit code: ${data.exitCode})</div>
                    <pre class="sync-log-content">${state.syncLogsHistory}</pre>
                `;
            }
            button.disabled = false;
            button.innerHTML = '▶️ Run Sync';
        }
    };

    state.activeEventSource.onerror = function () {
        console.error('EventSource error');
        if (state.activeEventSource) {
            state.activeEventSource.close();
            state.activeEventSource = null;
        }
        state.isSyncRunning = false;
        state.syncLogsHistory = allLogs.join('\n');
        state.syncStatus = {success: false};
        if (document.getElementById('sync-modal').classList.contains('show')) {
            if (allLogs.length === 0) {
                logsDiv.innerHTML = '<div class="sync-error">❌ Connection error: Unable to stream logs</div>';
            } else {
                logsDiv.innerHTML = `<div class="sync-error">❌ Sync interrupted</div><pre class="sync-log-content">${state.syncLogsHistory}</pre>`;
            }
        }
        button.disabled = false;
        button.innerHTML = '▶️ Run Sync';
    };
}
