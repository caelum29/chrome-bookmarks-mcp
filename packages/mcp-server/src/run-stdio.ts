#!/usr/bin/env node
// Entry point: start the extension bridge, run the MCP server over stdio. Only server.ts and this
// file import the SDK (ADR-0001). Diagnostics → stderr; stdout is the protocol stream.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startWsBridge } from "./bridge/ws-bridge.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logging.js";
import { createServer } from "./server.js";

const config = loadConfig();
const log = createLogger(config.logLevel);

process.on("unhandledRejection", (r) => log.error("unhandledRejection", { reason: String(r) }));
process.on("uncaughtException", (e) => {
  log.error("uncaughtException — exiting", { message: e.message });
  process.exit(1);
});

// bridge failure to bind is not fatal: read tools still work from the Bookmarks file
const bridge = await startWsBridge({
  port: config.wsPort,
  timeoutMs: config.bridgeTimeoutMs,
  log,
}).catch((e: Error) => {
  log.warn(e.message);
  return undefined;
});

const server = createServer({ config, log, ...(bridge ? { bridge } : {}) });
const transport = new StdioServerTransport();

// Claude Desktop rejects tools whose outputSchema carries `$schema` (client-side, before dispatch).
// Strip it from outgoing tools/list results. Harmless for other clients.
const send = transport.send.bind(transport);
transport.send = (msg) => {
  const m = msg as { result?: { tools?: Array<{ outputSchema?: Record<string, unknown> }> } };
  for (const t of m.result?.tools ?? [])
    if (t.outputSchema && "$schema" in t.outputSchema) delete t.outputSchema.$schema;
  return send(msg);
};

let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  await bridge?.close().catch(() => undefined);
  await server.close().catch(() => undefined);
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
// client closed stdin → exit; otherwise the WS server keeps the event loop alive forever.
// The SDK's stdio transport does not watch for EOF itself.
process.stdin.on("end", () => void shutdown());
process.stdin.on("close", () => void shutdown());
server.server.onclose = () => void shutdown();

await server.connect(transport);
