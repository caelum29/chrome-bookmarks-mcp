// Explicit tool registry (no autodiscovery) + boot-time invariants (ADR-0002/0003).
// Adding a tool = one import + one array entry — see docs/blessed-paths/add-mcp-tool.md.
import { bookmarksStatus } from "./bookmarks_status.js";
import { bookmarksTree } from "./bookmarks_tree.js";
import type { AnyToolDescriptor } from "./types.js";

export const allTools: readonly AnyToolDescriptor[] = [bookmarksStatus, bookmarksTree];

/** Ceiling from ADR-0003 — a small outcome-oriented surface, not a chrome.bookmarks mirror. */
export const MAX_TOOLS = 12;

/**
 * Refuse to boot if any tool is non-read-only but neither `write` nor `localWrite`.
 * An unclassified mutation would silently bypass the write gate.
 */
export function assertWriteClassification(tools: readonly AnyToolDescriptor[] = allTools): void {
  const rogue = tools.filter((t) => !t.annotations.readOnlyHint && !t.write && !t.localWrite);
  if (rogue.length) {
    throw new Error(
      `tools with readOnlyHint=false must set write or localWrite: ${rogue.map((t) => t.name).join(", ")} — see ADR-0002`,
    );
  }
  const readOnlyButWrite = tools.filter(
    (t) => t.annotations.readOnlyHint && (t.write || t.localWrite),
  );
  if (readOnlyButWrite.length) {
    throw new Error(
      `tools marked write/localWrite cannot be readOnlyHint=true: ${readOnlyButWrite.map((t) => t.name).join(", ")}`,
    );
  }
}

/** Names must be unique and namespaced; surface must stay small. */
export function assertRegistryShape(tools: readonly AnyToolDescriptor[] = allTools): void {
  const names = new Set<string>();
  for (const t of tools) {
    if (!t.name.startsWith("bookmarks_"))
      throw new Error(`tool "${t.name}" is outside the bookmarks_ namespace`);
    if (names.has(t.name)) throw new Error(`duplicate tool name "${t.name}"`);
    names.add(t.name);
  }
  if (tools.length > MAX_TOOLS)
    throw new Error(`${tools.length} tools exceed the ADR-0003 ceiling of ${MAX_TOOLS}`);
}
