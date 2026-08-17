// Round-trip over a real WebSocket on an ephemeral port: a bare `ws` client plays the extension.
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { BridgeError } from "../../src/bridge/protocol.js";
import { startWsBridge, type WsBridge } from "../../src/bridge/ws-bridge.js";
import { silentLogger } from "../../src/logging.js";

let bridge: WsBridge | undefined;
afterEach(async () => {
  await bridge?.close();
  bridge = undefined;
});

/** Connect a fake extension that answers `ping` and echoes anything else as an error. */
function fakeExtension(port: number, opts: { answer?: boolean } = {}): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
    ws.on("message", (d) => {
      if (opts.answer === false) return;
      const req = JSON.parse(d.toString()) as { id: string; method: string };
      const res =
        req.method === "ping"
          ? { id: req.id, result: { ok: true, extensionVersion: "t" } }
          : { id: req.id, error: { message: `unknown ${req.method}` } };
      ws.send(JSON.stringify(res));
    });
  });
}

describe("ws bridge", () => {
  it("rejects requests while no extension is connected", async () => {
    bridge = await startWsBridge({ port: 0, timeoutMs: 200, log: silentLogger });
    expect(bridge.connected).toBe(false);
    await expect(bridge.request("ping")).rejects.toMatchObject({ code: "disconnected" });
  });

  it("correlates a ping round-trip once the extension connects", async () => {
    bridge = await startWsBridge({ port: 0, timeoutMs: 500, log: silentLogger });
    const ext = await fakeExtension(bridge.port);
    await new Promise((r) => setTimeout(r, 20));
    expect(bridge.connected).toBe(true);
    await expect(bridge.request("ping")).resolves.toEqual({ ok: true, extensionVersion: "t" });
    ext.close();
  });

  it("times out with an actionable message when the extension is silent", async () => {
    bridge = await startWsBridge({ port: 0, timeoutMs: 50, log: silentLogger });
    const ext = await fakeExtension(bridge.port, { answer: false });
    await new Promise((r) => setTimeout(r, 20));
    const err = await bridge.request("ping").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BridgeError);
    expect((err as BridgeError).code).toBe("timeout");
    ext.close();
  });

  it("fails pending requests when the extension disconnects", async () => {
    bridge = await startWsBridge({ port: 0, timeoutMs: 1000, log: silentLogger });
    const ext = await fakeExtension(bridge.port, { answer: false });
    await new Promise((r) => setTimeout(r, 20));
    const p = bridge.request("ping");
    ext.close();
    await expect(p).rejects.toMatchObject({ code: "disconnected" });
  });
});
