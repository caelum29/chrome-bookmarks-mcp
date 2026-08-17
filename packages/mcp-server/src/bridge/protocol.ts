// Bridge wire contract (server ⇄ extension). Minimal envelope over WebSocket; the server owns
// validation, the extension only dispatches. New messages: docs/blessed-paths/add-bridge-message.md.

/** Methods the extension implements. Extend the union when adding a bridge message. */
export type BridgeMethod = "ping";

export interface BridgeRequest<M extends BridgeMethod = BridgeMethod> {
  id: string;
  method: M;
  params?: Record<string, unknown>;
}

export interface BridgeResponse {
  id: string;
  result?: unknown;
  error?: { message: string };
}

/** Result of `ping`: extension identity + which browser it runs in. */
export interface PingResult {
  ok: true;
  extensionVersion: string;
  userAgent?: string;
}

/** What tools see: connection state + typed request. Fakes in tests implement this. */
export interface BridgeClient {
  readonly connected: boolean;
  /** Send a request; rejects with `BridgeError` when disconnected or timed out. */
  request<T = unknown>(method: BridgeMethod, params?: Record<string, unknown>): Promise<T>;
}

export class BridgeError extends Error {
  constructor(
    message: string,
    readonly code: "disconnected" | "timeout" | "remote",
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

/** Remediation text reused by every tool that needs the bridge. */
export const BRIDGE_DISCONNECTED_MESSAGE =
  "extension bridge is not connected — open Chrome with the Chrome Bookmarks MCP Bridge extension loaded (chrome://extensions → Load unpacked → packages/extension/dist). Read tools fall back to the Bookmarks file; write tools require the bridge.";
