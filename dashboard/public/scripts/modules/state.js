/**
 * Global application state.
 * @type {{
 *   modalShowTime: number,
 *   pendingDownload: {name:string,link:string}|null,
 *   syncLogsHistory: string,
 *   syncStatus: {success:boolean,exitCode?:number}|null,
 *   activeEventSource: EventSource|null,
 *   isSyncRunning: boolean
 * }}
 */
export const state = {
    modalShowTime: 0,
    pendingDownload: null,
    syncLogsHistory: '',
    syncStatus: null,
    activeEventSource: null,
    isSyncRunning: false
};
