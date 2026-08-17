// Runtime configuration from env vars — browser base path, profile, WS bridge port.
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
  wsPort: number;
  snapshotDir: string;
}

/** Root dir holding `Local State` and profile folders for a browser (macOS). */
export function userDataDir(browser: Browser): string {
  return join(homedir(), "Library/Application Support", BASE_DIRS[browser]);
}

/** Read config from `BOOKMARKS_*` env vars with sane defaults. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const browser = (env.BOOKMARKS_BROWSER ?? "chrome") as Browser;
  if (!(browser in BASE_DIRS)) throw new Error(`Unsupported BOOKMARKS_BROWSER: ${browser}`);
  return {
    browser,
    profile: env.BOOKMARKS_PROFILE ?? "Default",
    wsPort: Number(env.BOOKMARKS_WS_PORT ?? 48765),
    snapshotDir: join(homedir(), ".cache/chrome-bookmarks-mcp/snapshots"),
  };
}
