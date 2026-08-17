// Bridge wire contract (server ⇄ extension). Minimal envelope over WebSocket; the server owns
// validation (zod at this boundary), the extension only dispatches.
// New messages: docs/blessed-paths/add-bridge-message.md.
import { z } from "zod";

/** Methods the extension implements. Extend the union when adding a bridge message. */
export type BridgeMethod = "ping";

/** Default localhost port; the extension falls back to it when nothing is configured. */
export const DEFAULT_WS_PORT = 48765;

export interface BridgeRequest<M extends BridgeMethod = BridgeMethod> {
  id: string;
  method: M;
  params?: Record<string, unknown>;
}

/** Frame the extension sends back — validated before use. */
export const BridgeResponseSchema = z.object({
  id: z.string().min(1),
  result: z.unknown().optional(),
  error: z.object({ message: z.string() }).optional(),
});
export type BridgeResponse = z.infer<typeof BridgeResponseSchema>;

/** Result of `ping`: extension identity + which browser it runs in. */
export const PingResultSchema = z.object({
  ok: z.literal(true),
  extensionVersion: z.string(),
  userAgent: z.string().optional(),
});
export type PingResult = z.infer<typeof PingResultSchema>;

/** What tools see: connection state + typed request. Fakes in tests implement this. */
export interface BridgeClient {
  /** False when the server could not bind its port — the extension can never connect. */
  readonly listening: boolean;
  readonly connected: boolean;
  /** Send a request; rejects with `BridgeError` when disconnected or timed out. */
  request<T = unknown>(method: BridgeMethod, params?: Record<string, unknown>): Promise<T>;
}

export class BridgeError extends Error {
  constructor(
    message: string,
    readonly code: "disconnected" | "timeout" | "remote" | "malformed",
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

/** Remediation text reused by every tool that needs the bridge. */
export const BRIDGE_DISCONNECTED_MESSAGE =
  "extension bridge is not connected — open Chrome with the Chrome Bookmarks MCP Bridge extension loaded (chrome://extensions → Load unpacked → packages/extension/dist). Read tools fall back to the Bookmarks file; write tools require the bridge.";
