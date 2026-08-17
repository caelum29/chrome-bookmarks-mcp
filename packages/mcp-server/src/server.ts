// MCP server assembly — the ONLY module (with run-stdio.ts) that imports the MCP SDK (ADR-0001).
// Builds deps, registers every tool from the registry with a defense-in-depth error net, and
// disables write tools unless the env master key is set (ADR-0002).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { BridgeClient } from "./bridge/protocol.js";
import { createBookmarksFileSource } from "./chrome/bookmarks-file.js";
import { type Config, loadConfig } from "./config.js";
import { createLogger, type Logger } from "./logging.js";
import { allTools, assertRegistryShape, assertWriteClassification } from "./tools/registry.js";
import { toolError } from "./tools/result.js";
import type { AnyToolDescriptor, ToolDeps } from "./tools/types.js";

export const SERVER_NAME = "chrome-bookmarks-mcp";
export const SERVER_VERSION = "0.1.0";

export interface CreateServerOptions {
  config?: Config;
  log?: Logger;
  /** Injected bridge (tests, or a bridge started by run-stdio). Default: a never-connected stub. */
  bridge?: BridgeClient;
  tools?: readonly AnyToolDescriptor[];
}

// Used when the WS port could not be bound: tools see "not listening" and say so.
const noBridge: BridgeClient = {
  listening: false,
  connected: false,
  request: () => Promise.reject(new Error("bridge not started")),
};

/** Build the server with all tools registered. Pure wiring — no I/O until a tool is called. */
export function createServer(opts: CreateServerOptions = {}): McpServer {
  const config = opts.config ?? loadConfig();
  const log = opts.log ?? createLogger();
  const tools = opts.tools ?? allTools;

  // boot-time invariants: fail loudly before the first tools/list
  assertRegistryShape(tools);
  assertWriteClassification(tools);

  const deps: ToolDeps = {
    config,
    file: createBookmarksFileSource(config.bookmarksFile),
    bridge: opts.bridge ?? noBridge,
    log,
  };

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  for (const t of tools) {
    const reg = server.registerTool(
      t.name,
      {
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
        ...(t.outputSchema ? { outputSchema: t.outputSchema } : {}),
        annotations: t.annotations as ToolAnnotations,
      },
      async (args: unknown) => {
        try {
          return (await t.handler(args, deps)) as CallToolResult;
        } catch (e) {
          // handlers return errors by contract; anything thrown is a bug — still answer the model
          const msg = e instanceof Error ? e.message : String(e);
          log.error("unhandled error in tool", { tool: t.name, message: msg });
          return toolError(
            `internal error in ${t.name} — ${msg}. Retry once; if it persists, report it.`,
          ) as CallToolResult;
        }
      },
    );
    // gated write tools vanish from tools/list instead of failing on call
    if (t.write && !config.writeEnabled) reg.disable();
  }

  log.info("server ready", {
    browser: config.browser,
    profile: config.profile,
    tools: tools.length,
    writeEnabled: config.writeEnabled,
  });
  return server;
}
