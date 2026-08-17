import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("uses defaults and derives the Bookmarks path from browser + profile", () => {
    const c = loadConfig({}, "/home/u");
    expect(c.browser).toBe("chrome");
    expect(c.profile).toBe("Default");
    expect(c.wsPort).toBe(48765);
    expect(c.writeEnabled).toBe(false);
    expect(c.bookmarksFile).toBe(
      "/home/u/Library/Application Support/Google/Chrome/Default/Bookmarks",
    );
  });

  it("rejects unknown browser and bad port with actionable messages", () => {
    expect(() => loadConfig({ BOOKMARKS_BROWSER: "arc" })).toThrow(/chrome, brave, edge/);
    expect(() => loadConfig({ BOOKMARKS_WS_PORT: "80" })).toThrow(/1024\.\.65535/);
  });

  it("write gate: 'false'/'0'/empty/placeholder are off, '1'/'true' are on", () => {
    expect(loadConfig({ BOOKMARKS_ENABLE_WRITE: "false" }).writeEnabled).toBe(false);
    expect(loadConfig({ BOOKMARKS_ENABLE_WRITE: "0" }).writeEnabled).toBe(false);
    expect(loadConfig({ BOOKMARKS_ENABLE_WRITE: "" }).writeEnabled).toBe(false);
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal MCPB placeholder is the point
    expect(loadConfig({ BOOKMARKS_ENABLE_WRITE: "${user_config.enable_write}" }).writeEnabled).toBe(
      false,
    );
    expect(loadConfig({ BOOKMARKS_ENABLE_WRITE: "1" }).writeEnabled).toBe(true);
    expect(loadConfig({ BOOKMARKS_ENABLE_WRITE: "true" }).writeEnabled).toBe(true);
  });

  it("treats un-interpolated MCPB placeholders as unset", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal MCPB placeholder is the point
    expect(loadConfig({ BOOKMARKS_PROFILE: "${user_config.profile}" }).profile).toBe("Default");
  });
});
