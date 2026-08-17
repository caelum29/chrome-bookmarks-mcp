// bookmarks_status — health/identity: which browser+profile, is the Bookmarks file there, is the
// extension bridge connected, are writes enabled. The first tool an agent should call.
import { z } from "zod";
import { BridgeError, DEFAULT_WS_PORT, PingResultSchema } from "../bridge/protocol.js";
import { defineTool } from "./define.js";
import { toolOk } from "./result.js";

/** Bridge states as the agent sees them (CONTEXT.md §4). */
const BRIDGE_STATES = ["connected", "disconnected", "unresponsive", "unavailable"] as const;
type BridgeState = (typeof BRIDGE_STATES)[number];

export const bookmarksStatus = defineTool({
  name: "bookmarks_status",
  title: "Bookmarks: status",
  description:
    "Report the server's state: browser, profile, whether the Bookmarks file was found, whether the extension bridge is connected (live read/write), and whether writes are enabled. Call first; use it to decide if write tools can work.",
  inputSchema: {},
  outputSchema: {
    browser: z.string(),
    profile: z.string(),
    bookmarksFileFound: z.boolean(),
    bridge: z.enum(BRIDGE_STATES),
    extensionVersion: z.string().optional(),
    writeEnabled: z.boolean(),
    wsPort: z.number(),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  async handler(_args, deps) {
    const { config, file, bridge } = deps;
    const bookmarksFileFound = await file.exists();

    let bridgeState: BridgeState = bridge.listening ? "disconnected" : "unavailable";
    let extensionVersion: string | undefined;
    let bridgeNote = "";
    if (bridge.connected) {
      try {
        const ping = PingResultSchema.parse(await bridge.request("ping"));
        bridgeState = "connected";
        extensionVersion = ping.extensionVersion;
      } catch (e) {
        if (e instanceof BridgeError && e.code === "disconnected") bridgeState = "disconnected";
        else if (e instanceof BridgeError && e.code === "remote") {
          // the extension answered — it is connected, just failing this call
          bridgeState = "connected";
          bridgeNote = ` (ping error: ${e.message})`;
        } else bridgeState = "unresponsive";
      }
    }

    const structured = {
      browser: config.browser,
      profile: config.profile,
      bookmarksFileFound,
      bridge: bridgeState,
      ...(extensionVersion ? { extensionVersion } : {}),
      writeEnabled: config.writeEnabled,
      wsPort: config.wsPort,
    };

    const lines = [
      `browser: ${config.browser} · profile: ${config.profile}`,
      `Bookmarks file: ${bookmarksFileFound ? "found (read-only fallback available)" : "not found — check BOOKMARKS_BROWSER / BOOKMARKS_PROFILE"}`,
      `extension bridge: ${bridgeState}${extensionVersion ? ` (v${extensionVersion})` : ""}${bridgeNote} on 127.0.0.1:${config.wsPort}`,
      `writes: ${config.writeEnabled ? "enabled (BOOKMARKS_ENABLE_WRITE set)" : "disabled — set BOOKMARKS_ENABLE_WRITE=1 to expose write tools"}`,
    ];
    if (bridgeState === "unavailable") {
      lines.push(
        `The server could not bind port ${config.wsPort}, so the extension cannot connect. Free the port or set BOOKMARKS_WS_PORT — and configure the same port in the extension (its default is ${DEFAULT_WS_PORT}).`,
      );
    } else if (bridgeState !== "connected") {
      lines.push(
        "Live access needs the extension: chrome://extensions → Developer mode → Load unpacked → packages/extension/dist.",
      );
      if (config.wsPort !== DEFAULT_WS_PORT) {
        lines.push(
          `Note: this server listens on ${config.wsPort}, but the extension connects to ${DEFAULT_WS_PORT} unless its wsPort is configured (chrome.storage.local).`,
        );
      }
    }
    return toolOk(lines.join("\n"), structured);
  },
});
