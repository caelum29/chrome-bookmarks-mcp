// MCP server assembly: registers all bookmark tools on a McpServer instance.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config.js";

/** Build the server with all tools registered. Tools are added in later slices. */
export function createServer(): McpServer {
  const config = loadConfig();
  const server = new McpServer({ name: "chrome-bookmarks-mcp", version: "0.1.0" });
  // stdout is the MCP stream — all diagnostics go to stderr
  console.error(`[chrome-bookmarks-mcp] browser=${config.browser} profile=${config.profile}`);
  return server;
}
