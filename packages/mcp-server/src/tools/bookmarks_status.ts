// bookmarks_status — health/identity: which browser+profile, is the Bookmarks file there, is the
// extension bridge connected, are writes enabled. The first tool an agent should call.
import { z } from "zod";
import { BridgeError, type PingResult } from "../bridge/protocol.js";
import { defineTool } from "./define.js";
import { toolOk } from "./result.js";

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
    bridge: z.enum(["connected", "disconnected", "unresponsive"]),
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

    let bridgeState: "connected" | "disconnected" | "unresponsive" = "disconnected";
    let extensionVersion: string | undefined;
    if (bridge.connected) {
      try {
        const ping = await bridge.request<PingResult>("ping");
        bridgeState = "connected";
        extensionVersion = ping.extensionVersion;
      } catch (e) {
        bridgeState =
          e instanceof BridgeError && e.code === "disconnected" ? "disconnected" : "unresponsive";
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
      `extension bridge: ${bridgeState}${extensionVersion ? ` (v${extensionVersion})` : ""} on 127.0.0.1:${config.wsPort}`,
      `writes: ${config.writeEnabled ? "enabled (BOOKMARKS_ENABLE_WRITE set)" : "disabled — set BOOKMARKS_ENABLE_WRITE=1 to expose write tools"}`,
    ];
    if (bridgeState !== "connected") {
      lines.push(
        "Live access needs the extension: chrome://extensions → Developer mode → Load unpacked → packages/extension/dist.",
      );
    }
    return toolOk(lines.join("\n"), structured);
  },
});
