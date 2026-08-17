// MV3 service worker: WebSocket client to the MCP server, dispatches chrome.bookmarks calls.
// Reconnect loop + alarms keepalive are added in a later slice.
const WS_URL = "ws://127.0.0.1:48765";

console.log(`[bookmarks-bridge] loaded, will connect to ${WS_URL}`);
