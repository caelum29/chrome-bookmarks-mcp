// Literal fake ToolDeps for SDK-free handler tests. Fill only what a test needs.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BridgeClient, BridgeMethod } from "../../src/bridge/protocol.js";
import { type BookmarksSource, parseBookmarksJson } from "../../src/chrome/bookmarks-file.js";
import type { Config } from "../../src/config.js";
import { silentLogger } from "../../src/logging.js";
import type { ToolDeps } from "../../src/tools/types.js";

const here = dirname(fileURLToPath(import.meta.url));

/** Parsed synthetic fixture. */
export function fixtureTree() {
  return parseBookmarksJson(readFileSync(join(here, "../fixtures/Bookmarks.sample.json"), "utf8"));
}

export function fakeConfig(over: Partial<Config> = {}): Config {
  return {
    browser: "chrome",
    profile: "Default",
    wsPort: 48765,
    writeEnabled: false,
    bookmarksFile: "/fake/Bookmarks",
    snapshotDir: "/fake/snapshots",
    bridgeTimeoutMs: 100,
    logLevel: "info",
    ...over,
  };
}

/** File source backed by the fixture (or throwing, to simulate a missing file). */
export function fakeFile(opts: { exists?: boolean; error?: Error } = {}): BookmarksSource {
  return {
    exists: async () => opts.exists ?? true,
    read: async () => {
      if (opts.error) throw opts.error;
      return fixtureTree();
    },
  };
}

/** Bridge fake: `connected` flag + canned responses per method. */
export function fakeBridge(
  connected: boolean,
  responses: Partial<Record<BridgeMethod, unknown | Error>> = {},
  listening = true,
): BridgeClient & { calls: BridgeMethod[] } {
  const calls: BridgeMethod[] = [];
  return {
    listening,
    connected,
    calls,
    async request<T>(method: BridgeMethod): Promise<T> {
      calls.push(method);
      const r = responses[method];
      if (r instanceof Error) throw r;
      return r as T;
    },
  };
}

export function deps(over: Partial<ToolDeps> = {}): ToolDeps {
  return {
    config: fakeConfig(),
    file: fakeFile(),
    bridge: fakeBridge(false),
    log: silentLogger,
    ...over,
  };
}
