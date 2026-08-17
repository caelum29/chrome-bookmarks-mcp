// MV3 service worker: keeps a WebSocket to the local MCP server and dispatches bridge requests to
// chrome.bookmarks. Contract: packages/mcp-server/src/bridge/protocol.ts. The worker is ephemeral —
// no state that must survive; reconnect on wake; keepalive via chrome.alarms.
// Port must match the server's BOOKMARKS_WS_PORT; override via chrome.storage.local { wsPort }.
const DEFAULT_WS_PORT = 48765;
// Reconnect with backoff: the MCP server is often not running (Chrome logs every refused attempt).
const RECONNECT_MIN_MS = 3000;
const RECONNECT_MAX_MS = 60_000;
const KEEPALIVE_ALARM = "bookmarks-bridge-keepalive";

interface BridgeRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}
interface BridgeResponse {
  id: string;
  result?: unknown;
  error?: { message: string };
}

let socket: WebSocket | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectDelay = RECONNECT_MIN_MS;

/** One case per bridge method — add via docs/blessed-paths/add-bridge-message.md. */
async function dispatch(req: BridgeRequest): Promise<unknown> {
  switch (req.method) {
    case "ping":
      return {
        ok: true,
        extensionVersion: chrome.runtime.getManifest().version,
        userAgent: navigator.userAgent,
      };
    default:
      throw new Error(`unknown bridge method "${req.method}" — update the extension`);
  }
}

async function wsUrl(): Promise<string> {
  const { wsPort } = (await chrome.storage.local.get("wsPort")) as { wsPort?: unknown };
  const port =
    typeof wsPort === "number" && Number.isInteger(wsPort) && wsPort > 1023
      ? wsPort
      : DEFAULT_WS_PORT;
  return `ws://127.0.0.1:${port}`;
}

async function connect(): Promise<void> {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  )
    return;
  const url = await wsUrl();
  const ws = new WebSocket(url);
  socket = ws;
  ws.onopen = () => {
    reconnectDelay = RECONNECT_MIN_MS;
    console.log(`[bookmarks-bridge] connected to ${url}`);
  };
  ws.onmessage = async (ev) => {
    let req: BridgeRequest;
    try {
      req = JSON.parse(String(ev.data)) as BridgeRequest;
    } catch {
      return;
    }
    let res: BridgeResponse;
    try {
      res = { id: req.id, result: await dispatch(req) };
    } catch (e) {
      // never throw across the socket — the server shapes this into a tool error
      res = { id: req.id, error: { message: e instanceof Error ? e.message : String(e) } };
    }
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(res));
  };
  ws.onclose = () => {
    if (socket === ws) socket = undefined;
    scheduleReconnect();
  };
  ws.onerror = () => {
    // onclose follows; nothing to do
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    void connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
}

// keepalive: an alarm wakes the worker so the socket is re-established after Chrome suspends it
chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === KEEPALIVE_ALARM) void connect();
});
chrome.runtime.onStartup.addListener(() => void connect());
chrome.runtime.onInstalled.addListener(() => void connect());
void connect();
