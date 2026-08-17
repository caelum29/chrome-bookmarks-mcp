import { describe, expect, it } from "vitest";
import { BridgeError } from "../../src/bridge/protocol.js";
import { bookmarksStatus } from "../../src/tools/bookmarks_status.js";
import { deps, fakeBridge, fakeConfig, fakeFile } from "../helpers/deps.js";

describe("bookmarks_status", () => {
  it("reports file found, bridge disconnected, writes disabled by default", async () => {
    const r = await bookmarksStatus.handler({}, deps());
    expect(r.isError).toBeUndefined();
    expect(r.structuredContent).toMatchObject({
      browser: "chrome",
      profile: "Default",
      bookmarksFileFound: true,
      bridge: "disconnected",
      writeEnabled: false,
    });
    expect(r.content[0]?.text).toContain("Load unpacked");
  });

  it("pings the extension when the bridge is connected and reports its version", async () => {
    const bridge = fakeBridge(true, { ping: { ok: true, extensionVersion: "0.1.0" } });
    const r = await bookmarksStatus.handler({}, deps({ bridge }));
    expect(bridge.calls).toEqual(["ping"]);
    expect(r.structuredContent).toMatchObject({ bridge: "connected", extensionVersion: "0.1.0" });
  });

  it("marks the bridge unresponsive when ping times out — still a success result", async () => {
    const bridge = fakeBridge(true, { ping: new BridgeError("timeout", "timeout") });
    const r = await bookmarksStatus.handler({}, deps({ bridge }));
    expect(r.isError).toBeUndefined();
    expect(r.structuredContent).toMatchObject({ bridge: "unresponsive" });
  });

  it("tells the agent how to fix a missing Bookmarks file", async () => {
    const r = await bookmarksStatus.handler({}, deps({ file: fakeFile({ exists: false }) }));
    expect(r.structuredContent).toMatchObject({ bookmarksFileFound: false });
    expect(r.content[0]?.text).toContain("BOOKMARKS_PROFILE");
  });

  it("reflects the write gate", async () => {
    const r = await bookmarksStatus.handler(
      {},
      deps({ config: fakeConfig({ writeEnabled: true }) }),
    );
    expect(r.structuredContent).toMatchObject({ writeEnabled: true });
  });
});
