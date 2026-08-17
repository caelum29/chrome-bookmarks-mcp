import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("uses defaults", () => {
    const c = loadConfig({});
    expect(c.browser).toBe("chrome");
    expect(c.profile).toBe("Default");
    expect(c.wsPort).toBe(48765);
  });

  it("rejects unknown browser", () => {
    expect(() => loadConfig({ BOOKMARKS_BROWSER: "arc" })).toThrow();
  });
});
