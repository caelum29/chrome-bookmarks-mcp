// SDK-free tool contract (ADR-0001/0003). Structurally mirrors the MCP SDK's CallToolResult and
// ToolAnnotations so `server.ts` can pass descriptors through with one contained cast.
import type { z } from "zod";
import type { BridgeClient } from "../bridge/protocol.js";
import type { BookmarksSource } from "../chrome/bookmarks-file.js";
import type { Config } from "../config.js";
import type { Logger } from "../logging.js";

/** Text or resource content block returned to the model. */
export interface TextContent {
  type: "text";
  text: string;
}

/** Tool result — the shape the SDK expects; `structuredContent` mirrors `outputSchema`. */
export interface ToolResult {
  content: TextContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** MCP tool annotations. All hints; every tool must set all four (ADR-0003). */
export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

/** Everything a handler may touch — injected, never constructed inside a handler. */
export interface ToolDeps {
  config: Config;
  /** Read-only `Bookmarks` file reader (fallback source). */
  file: BookmarksSource;
  /** Extension bridge; `connected` false when no extension is attached. */
  bridge: BridgeClient;
  log: Logger;
}

/**
 * Tool descriptor. `name` is namespaced by the type; `write`/`localWrite` classify non-read-only
 * tools so the boot-time invariant (`assertWriteClassification`) can refuse unclassified writes.
 */
export interface ToolDescriptor<Shape extends z.ZodRawShape = z.ZodRawShape> {
  name: `bookmarks_${string}`;
  title: string;
  /** Routing policy for the model: what / when vs neighbour / won't do. Keep ≤ ~300 chars. */
  description: string;
  inputSchema: Shape;
  outputSchema?: z.ZodRawShape;
  annotations: ToolAnnotations;
  /** Mutates live bookmarks through the bridge → gated by BOOKMARKS_ENABLE_WRITE. */
  write?: boolean;
  /** Writes only server-owned files (snapshots) → deliberately ungated. */
  localWrite?: boolean;
  handler: (args: z.infer<z.ZodObject<Shape>>, deps: ToolDeps) => Promise<ToolResult>;
}

/** Type-erased descriptor for the registry; the SDK validates input before `handler` runs. */
export interface AnyToolDescriptor extends Omit<ToolDescriptor, "handler" | "inputSchema"> {
  inputSchema: z.ZodRawShape;
  handler: (args: unknown, deps: ToolDeps) => Promise<ToolResult>;
}
