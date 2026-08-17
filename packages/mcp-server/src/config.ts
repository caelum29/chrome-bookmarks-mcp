// Runtime configuration from `BOOKMARKS_*` env vars: browser, profile, WS port, write gate, paths.
// Pure function of env → testable; no secrets involved.
import { homedir } from "node:os";
import { join } from "node:path";

export type Browser = "chrome" | "brave" | "edge";

const BASE_DIRS: Record<Browser, string> = {
  chrome: "Google/Chrome",
  brave: "BraveSoftware/Brave-Browser",
  edge: "Microsoft Edge",
};

/** Resolved server config. */
export interface Config {
  browser: Browser;
  profile: string;
  /** Localhost port the extension bridge connects to. */
  wsPort: number;
  /** Master key of the two-key write gate (ADR-0002). */
  writeEnabled: boolean;
  /** Absolute path of the profile's `Bookmarks` file (read-only fallback source). */
  bookmarksFile: string;
  /** Snapshots live here — a local write, never touches Chrome. */
  snapshotDir: string;
  /** How long a bridge request may wait for the extension. */
  bridgeTimeoutMs: number;
}

/** Root dir holding `Local State` and profile folders for a browser (macOS). */
export function userDataDir(browser: Browser, home = homedir()): string {
  return join(home, "Library/Application Support", BASE_DIRS[browser]);
}

// Empty / whitespace / un-interpolated `${user_config.x}` placeholders (MCPB substitutes empty
// strings) all count as "not set".
function envStr(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  if (t === "" || /^\$\{user_config\.[^}]+\}$/.test(t)) return undefined;
  return t;
}

// `Boolean("false") === true` — never coerce flags with the Boolean constructor.
function truthy(v: string | undefined): boolean {
  const t = envStr(v)?.toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

/** Read config from `BOOKMARKS_*` env vars with sane defaults. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, home = homedir()): Config {
  const browser = (envStr(env.BOOKMARKS_BROWSER) ?? "chrome") as Browser;
  if (!(browser in BASE_DIRS)) {
    throw new Error(
      `Unsupported BOOKMARKS_BROWSER "${browser}" — use one of: ${Object.keys(BASE_DIRS).join(", ")}`,
    );
  }
  const profile = envStr(env.BOOKMARKS_PROFILE) ?? "Default";
  const wsPort = Number(envStr(env.BOOKMARKS_WS_PORT) ?? 48765);
  if (!Number.isInteger(wsPort) || wsPort < 1024 || wsPort > 65535) {
    throw new Error(
      `BOOKMARKS_WS_PORT must be an integer in 1024..65535, got "${env.BOOKMARKS_WS_PORT}"`,
    );
  }
  return {
    browser,
    profile,
    wsPort,
    writeEnabled: truthy(env.BOOKMARKS_ENABLE_WRITE),
    bookmarksFile:
      envStr(env.BOOKMARKS_FILE) ?? join(userDataDir(browser, home), profile, "Bookmarks"),
    snapshotDir:
      envStr(env.BOOKMARKS_SNAPSHOT_DIR) ?? join(home, ".cache/chrome-bookmarks-mcp/snapshots"),
    bridgeTimeoutMs: Number(envStr(env.BOOKMARKS_BRIDGE_TIMEOUT_MS) ?? 5000),
  };
}
