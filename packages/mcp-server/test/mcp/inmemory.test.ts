// Client-level test: drives the real McpServer through the SDK's InMemoryTransport. The only test
// file allowed to import the SDK — it proves the wire shape (tools/list, structuredContent, isError,
// write-gate visibility), not handler logic.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { silentLogger } from "../../src/logging.js";
import { createServer } from "../../src/server.js";
import { defineTool } from "../../src/tools/define.js";
import { allTools } from "../../src/tools/registry.js";
import { toolOk } from "../../src/tools/result.js";
import { fakeConfig } from "../helpers/deps.js";

async function connect(opts: Parameters<typeof createServer>[0]) {
  const server = createServer({ log: silentLogger, ...opts });
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.connect(s);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(c);
  return { client, close: () => Promise.all([client.close(), server.close()]) };
}

const fakeWrite = defineTool({
  name: "bookmarks_fake_write",
  title: "fake",
  description: "test-only write tool",
  inputSchema: {},
  outputSchema: {},
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  write: true,
  handler: async () => toolOk("wrote"),
});

describe("MCP wire", () => {
  it("lists the read tools with annotations and answers bookmarks_status with structuredContent", async () => {
    const { client, close } = await connect({
      config: fakeConfig({ bookmarksFile: "/nonexistent/Bookmarks" }),
    });
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["bookmarks_status", "bookmarks_tree"]);
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);

    const res = await client.callTool({ name: "bookmarks_status", arguments: {} });
    expect(res.isError).toBeFalsy();
    // no bridge injected → server never bound a port → "unavailable", not "disconnected"
    expect(res.structuredContent).toMatchObject({
      bookmarksFileFound: false,
      bridge: "unavailable",
    });
    await close();
  });

  it("returns isError (not a protocol error) when the Bookmarks file is missing", async () => {
    const { client, close } = await connect({
      config: fakeConfig({ bookmarksFile: "/nonexistent/Bookmarks" }),
    });
    const res = await client.callTool({ name: "bookmarks_tree", arguments: { depth: "1" } });
    expect(res.isError).toBe(true);
    expect((res.content as Array<{ text: string }>)[0]?.text).toMatch(/BOOKMARKS_PROFILE/);
    await close();
  });

  it("hides write tools from tools/list unless BOOKMARKS_ENABLE_WRITE is set", async () => {
    const tools = [...allTools, fakeWrite];
    const gated = await connect({ config: fakeConfig({ writeEnabled: false }), tools });
    expect((await gated.client.listTools()).tools.map((t) => t.name)).not.toContain(
      "bookmarks_fake_write",
    );
    await gated.close();

    const open = await connect({ config: fakeConfig({ writeEnabled: true }), tools });
    expect((await open.client.listTools()).tools.map((t) => t.name)).toContain(
      "bookmarks_fake_write",
    );
    await open.close();
  });
});
